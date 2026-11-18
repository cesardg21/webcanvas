import type { CanvasItem, Screen } from '@/types';
import {
    useCallback,
    useEffect,
    useRef,
    useState,
    type PointerEvent as ReactPointerEvent,
    type RefObject,
} from 'react';
import { clamp, fitViewport } from './canvas';
import type { CanvasSnapshot, HistoryDirection } from './canvas-types';
import { canvasObjects } from './items';
import { linkScreens } from './screens';

type Options = {
    latest: RefObject<CanvasSnapshot>;
    update: (change: (previous: CanvasSnapshot) => CanvasSnapshot, group?: string) => void;
    restore: (direction: HistoryDirection) => CanvasSnapshot | undefined;
    breakHistoryGroup: () => void;
};

export function useCanvasInteractions({ latest, update, restore, breakHistoryGroup }: Options) {
    const [selection, setSelectionState] = useState<string[]>([]);
    const selectionRef = useRef<string[]>([]);
    const selected = selection[0] ?? null;
    const selectScreens = useCallback((ids: string[]) => {
        selectionRef.current = ids;
        setSelectionState(ids);
    }, []);
    const setSelected = useCallback(
        (id: string | null) => {
            selectScreens(id ? [id] : []);
        },
        [selectScreens],
    );
    type Marquee = { startX: number; startY: number; x: number; y: number; initial: string[] };
    const [marquee, setMarquee] = useState<Marquee | null>(null);
    const marqueeRef = useRef<Marquee | null>(null);
    function cancelMarquee() {
        marqueeRef.current = null;
        setMarquee(null);
    }
    function startMarquee(e: ReactPointerEvent) {
        stage.current?.focus({ preventScroll: true });
        e.preventDefault();
        setInteracting(null);
        const box = {
            startX: e.clientX,
            startY: e.clientY,
            x: e.clientX,
            y: e.clientY,
            initial: e.shiftKey ? selectionRef.current : [],
        };
        selectScreens(box.initial);
        marqueeRef.current = box;
        setMarquee(box);
        e.currentTarget.setPointerCapture(e.pointerId);
        setDragging(true);
    }
    function updateMarquee(e: ReactPointerEvent) {
        const box = marqueeRef.current;
        if (!box) return;
        const next = { ...box, x: e.clientX, y: e.clientY };
        marqueeRef.current = next;
        setMarquee(next);
        if (Math.hypot(next.x - next.startX, next.y - next.startY) < 4) return;
        const v = latest.current.viewport;
        const left = (Math.min(next.x, next.startX) - v.x) / v.zoom;
        const right = (Math.max(next.x, next.startX) - v.x) / v.zoom;
        const top = (Math.min(next.y, next.startY) - v.y) / v.zoom;
        const bottom = (Math.max(next.y, next.startY) - v.y) / v.zoom;
        const hits = canvasObjects(latest.current.screens, latest.current.items, v.zoom)
            .filter(
                (screen) =>
                    screen.x <= right &&
                    screen.x + screen.width >= left &&
                    screen.y <= bottom &&
                    screen.y + screen.height >= top,
            )
            .map((screen) => screen.id);
        selectScreens([...new Set([...box.initial, ...hits])]);
    }
    const [tool, setTool] = useState<'select' | 'hand'>('select');
    const [space, setSpace] = useState(false);
    const [dragging, setDragging] = useState(false);
    const [linkingId, setLinkingId] = useState<string | null>(null);
    const [interacting, setInteracting] = useState<string | null>(null);
    type LinkDrag = {
        sourceId: string;
        startX: number;
        startY: number;
        x: number;
        y: number;
        targetId: string | null;
    };
    const [linkDrag, setLinkDrag] = useState<LinkDrag | null>(null);
    const suppressInteractionUntil = useRef(0);
    const linkGesture = useRef<LinkDrag | null>(null);
    const lastScreenPress = useRef({ id: '', time: 0, x: 0, y: 0 });
    function cancelLink() {
        linkGesture.current = null;
        setLinkDrag(null);
    }
    const stage = useRef<HTMLDivElement>(null);
    const gesture = useRef<{
        kind: 'pan' | 'move' | 'resize';
        id?: string;
        ids: string[];
        startX: number;
        startY: number;
        snapshot: CanvasSnapshot;
        historyGroup: string;
    } | null>(null);
    const restoreHistory = useCallback(
        (direction: 'undo' | 'redo') => {
            cancelMarquee();
            cancelLink();
            gesture.current = null;
            setDragging(false);
            setInteracting(null);
            setLinkingId(null);
            const current = latest.current;
            const content = restore(direction);
            if (!content) return;
            const restoredIds = [...content.screens, ...content.items]
                .filter(
                    (item) =>
                        ![...current.screens, ...current.items].some(
                            (existing) => existing.id === item.id,
                        ),
                )
                .map((item) => item.id);
            const validIds = new Set([...content.screens, ...content.items].map((item) => item.id));
            selectScreens(
                restoredIds.length
                    ? restoredIds
                    : selectionRef.current.filter((id) => validIds.has(id)),
            );
        },
        [restore, latest, selectScreens],
    );
    const deleteItems = useCallback(
        (ids: string[]) => {
            if (!ids.length) return;
            cancelMarquee();
            cancelLink();
            gesture.current = null;
            setDragging(false);
            selectScreens(selectionRef.current.filter((id) => !ids.includes(id)));
            setInteracting((current) => (current && ids.includes(current) ? null : current));
            setLinkingId((current) => (current && ids.includes(current) ? null : current));
            update((old) => ({
                ...old,
                screens: old.screens.filter((screen) => !ids.includes(screen.id)),
                items: old.items.filter((item) => !ids.includes(item.id)),
            }));
        },
        [update, selectScreens],
    );
    const zoomTo = useCallback(
        (value: number, point?: { x: number; y: number }) =>
            update((old) => {
                const zoom = clamp(value, 0.1, 2),
                    p = point ?? { x: window.innerWidth / 2, y: window.innerHeight / 2 };
                return {
                    ...old,
                    viewport: {
                        zoom,
                        x: p.x - ((p.x - old.viewport.x) * zoom) / old.viewport.zoom,
                        y: p.y - ((p.y - old.viewport.y) * zoom) / old.viewport.zoom,
                    },
                };
            }),
        [update],
    );
    const fit = useCallback(
        () =>
            update((old) => ({
                ...old,
                viewport: fitViewport(
                    canvasObjects(old.screens, old.items),
                    window.innerWidth,
                    window.innerHeight,
                ),
            })),
        [update],
    );
    useEffect(() => {
        const down = (e: KeyboardEvent) => {
            if (
                (e.target as HTMLElement).closest(
                    'input, textarea, [contenteditable], [role="dialog"], [role="menu"], select',
                )
            )
                return;
            if (e.isComposing) return;
            if (
                (e.metaKey || e.ctrlKey) &&
                (e.key.toLowerCase() === 'z' || e.key.toLowerCase() === 'y')
            ) {
                e.preventDefault();
                restoreHistory(e.key.toLowerCase() === 'y' || e.shiftKey ? 'redo' : 'undo');
                return;
            }
            if (
                (e.key === 'Backspace' || e.key === 'Delete') &&
                !e.metaKey &&
                !e.ctrlKey &&
                !e.altKey
            ) {
                if (selectionRef.current.length) {
                    e.preventDefault();
                    if (!e.repeat) deleteItems(selectionRef.current);
                }
                return;
            }
            if (e.code === 'Space') {
                e.preventDefault();
                setSpace(true);
            }
            if (e.key === 'Escape') {
                cancelMarquee();
                cancelLink();
                gesture.current = null;
                setDragging(false);
                setInteracting(null);
                setSelected(null);
            }
            if (e.key.toLowerCase() === 'v') setTool('select');
            if (e.key.toLowerCase() === 'h') setTool('hand');
            if (e.key === '1') zoomTo(1);
            if (e.key === '0') fit();
            if (e.key === '+' || e.key === '=') zoomTo(latest.current.viewport.zoom * 1.2);
            if (e.key === '-') zoomTo(latest.current.viewport.zoom / 1.2);
        };
        const up = (e: KeyboardEvent) => {
            if (e.code === 'Space') setSpace(false);
        };
        const blur = () => {
            cancelMarquee();
            cancelLink();
            setSpace(false);
            setDragging(false);
            gesture.current = null;
        };
        window.addEventListener('keydown', down);
        window.addEventListener('keyup', up);
        window.addEventListener('blur', blur);
        return () => {
            window.removeEventListener('keydown', down);
            window.removeEventListener('keyup', up);
            window.removeEventListener('blur', blur);
        };
    }, [fit, zoomTo, restoreHistory, deleteItems, latest, setSelected]);
    useEffect(() => {
        const element = stage.current!;
        const wheel = (e: WheelEvent) => {
            if ((e.target as HTMLElement).closest('[data-ui]')) return;
            e.preventDefault();
            if (e.ctrlKey || e.metaKey)
                zoomTo(latest.current.viewport.zoom * Math.exp(-e.deltaY * 0.008), {
                    x: e.clientX,
                    y: e.clientY,
                });
            else
                update((old) => ({
                    ...old,
                    viewport: {
                        ...old.viewport,
                        x: old.viewport.x - e.deltaX,
                        y: old.viewport.y - e.deltaY,
                    },
                }));
        };
        element.addEventListener('wheel', wheel, { passive: false });
        return () => element.removeEventListener('wheel', wheel);
    }, [update, zoomTo, latest]);
    function start(e: ReactPointerEvent, kind: 'pan' | 'move' | 'resize', id?: string) {
        if (e.button !== 0 && e.button !== 1) return;
        stage.current?.focus({ preventScroll: true });
        e.preventDefault();
        e.stopPropagation();
        setInteracting(null);
        const ids = id && selectionRef.current.includes(id) ? selectionRef.current : id ? [id] : [];
        if (id) selectScreens(kind === 'resize' ? [id] : ids);
        gesture.current = {
            kind,
            id,
            ids,
            startX: e.clientX,
            startY: e.clientY,
            snapshot: latest.current,
            historyGroup: crypto.randomUUID(),
        };
        e.currentTarget.setPointerCapture(e.pointerId);
        setDragging(true);
    }
    function startScreenDrag(e: ReactPointerEvent, screen: Screen) {
        if (e.shiftKey && e.button === 0 && !panning) {
            stage.current?.focus({ preventScroll: true });
            e.preventDefault();
            e.stopPropagation();
            setInteracting(null);
            selectScreens(
                selectionRef.current.includes(screen.id)
                    ? selectionRef.current.filter((id) => id !== screen.id)
                    : [...selectionRef.current, screen.id],
            );
            lastScreenPress.current.time = 0;
            return;
        }
        const last = lastScreenPress.current;
        const now = performance.now();
        const doublePress =
            e.button === 0 &&
            !panning &&
            selectionRef.current.length < 2 &&
            last.id === screen.id &&
            now - last.time < 500 &&
            Math.hypot(e.clientX - last.x, e.clientY - last.y) < 8;
        lastScreenPress.current = { id: screen.id, time: now, x: e.clientX, y: e.clientY };
        if (!doublePress) {
            start(e, panning ? 'pan' : 'move', screen.id);
            return;
        }
        e.preventDefault();
        e.stopPropagation();
        gesture.current = null;
        setInteracting(null);
        setSelected(screen.id);
        setDragging(true);
        const connection = {
            sourceId: screen.id,
            startX: e.clientX,
            startY: e.clientY,
            x: e.clientX,
            y: e.clientY,
            targetId: null,
        };
        linkGesture.current = connection;
        setLinkDrag(connection);
        e.currentTarget.setPointerCapture(e.pointerId);
        lastScreenPress.current.time = 0;
    }
    function updateLinkPointer(e: ReactPointerEvent) {
        const current = linkGesture.current;
        if (!current) return;
        const hit = document
            .elementFromPoint(e.clientX, e.clientY)
            ?.closest<HTMLElement>('[data-screen-id]');
        const targetId = hit?.dataset.screenId;
        const next = {
            ...current,
            x: e.clientX,
            y: e.clientY,
            targetId: targetId && targetId !== current.sourceId ? targetId : null,
        };
        linkGesture.current = next;
        setLinkDrag(next);
    }
    function finishDrag(e: ReactPointerEvent) {
        if (marqueeRef.current) {
            updateMarquee(e);
            cancelMarquee();
            setDragging(false);
            return;
        }
        updateLinkPointer(e);
        const connection = linkGesture.current;
        if (
            connection &&
            Math.hypot(connection.x - connection.startX, connection.y - connection.startY) > 6
        )
            suppressInteractionUntil.current = performance.now() + 500;
        if (
            connection?.targetId &&
            Math.hypot(connection.x - connection.startX, connection.y - connection.startY) > 6
        ) {
            update((old) => ({
                ...old,
                screens: linkScreens(
                    old.screens,
                    connection.sourceId,
                    connection.targetId!,
                    crypto.randomUUID(),
                ),
            }));
        }
        cancelMarquee();
        cancelLink();
        gesture.current = null;
        setDragging(false);
        breakHistoryGroup();
    }
    function move(e: ReactPointerEvent) {
        if (marqueeRef.current) {
            updateMarquee(e);
            return;
        }
        if (linkGesture.current) {
            updateLinkPointer(e);
            return;
        }
        const g = gesture.current;
        if (!g) return;
        const dx = e.clientX - g.startX,
            dy = e.clientY - g.startY,
            v = g.snapshot.viewport;
        if (g.kind === 'pan')
            update((old) => ({ ...old, viewport: { ...v, x: v.x + dx, y: v.y + dy } }));
        else if (g.kind === 'move') {
            const translate = <T extends Screen | CanvasItem>(object: T): T => {
                if (!g.ids.includes(object.id)) return object;
                const original = [...g.snapshot.screens, ...g.snapshot.items].find(
                    (item) => item.id === object.id,
                )!;
                return {
                    ...object,
                    x: clamp(original.x + dx / v.zoom, -1000000, 1000000),
                    y: clamp(original.y + dy / v.zoom, -1000000, 1000000),
                };
            };
            update((old) => ({
                ...old,
                screens: old.screens.map(translate),
                items: old.items.map(translate),
            }));
        } else {
            const originalItem = g.snapshot.items.find((item) => item.id === g.id);
            if (originalItem) {
                let width = Math.round(clamp(originalItem.width + dx / v.zoom, 40, 100000));
                let height = Math.round(clamp(originalItem.height + dy / v.zoom, 40, 100000));
                if (originalItem.kind === 'square' || originalItem.kind === 'circle')
                    width = height = Math.max(width, height);
                if (originalItem.kind === 'image')
                    height = Math.round(
                        clamp((width * originalItem.height) / originalItem.width, 40, 100000),
                    );
                update((old) => ({
                    ...old,
                    items: old.items.map((item) =>
                        item.id === g.id ? { ...item, width, height } : item,
                    ),
                }));
            } else {
                const original = g.snapshot.screens.find((screen) => screen.id === g.id);
                if (!original) return;
                update((old) => ({
                    ...old,
                    screens: old.screens.map((screen) =>
                        screen.id !== g.id
                            ? screen
                            : {
                                  ...screen,
                                  width: Math.round(clamp(original.width + dx / v.zoom, 320, 3840)),
                                  height: Math.round(
                                      clamp(original.height + dy / v.zoom, 240, 2160),
                                  ),
                              },
                    ),
                }));
            }
        }
    }

    function startItemDrag(event: ReactPointerEvent, item: CanvasItem, resize = false) {
        if (event.button === 2) {
            event.stopPropagation();
            return;
        }
        if (event.shiftKey && !resize && !panning) {
            stage.current?.focus({ preventScroll: true });
            event.preventDefault();
            event.stopPropagation();
            selectScreens(
                selectionRef.current.includes(item.id)
                    ? selectionRef.current.filter((id) => id !== item.id)
                    : [...selectionRef.current, item.id],
            );
            return;
        }
        start(event, panning || event.button === 1 ? 'pan' : resize ? 'resize' : 'move', item.id);
    }
    const panning = tool === 'hand' || space;
    const changeTool = (tool: 'select' | 'hand') => {
        setTool(tool);
        setInteracting(null);
    };
    const cancelGesture = () => {
        cancelMarquee();
        cancelLink();
        gesture.current = null;
        setDragging(false);
    };
    return {
        stage,
        selection,
        selected,
        selectScreens,
        setSelected,
        marquee,
        linkDrag,
        tool,
        setTool,
        changeTool,
        panning,
        dragging,
        interacting,
        setInteracting,
        linkingId,
        setLinkingId,
        suppressInteractionUntil,
        restoreHistory,
        deleteItems,
        zoomTo,
        fit,
        start,
        startScreenDrag,
        startItemDrag,
        move,
        finishDrag,
        cancelGesture,
        isBusy: () => !!(gesture.current || linkGesture.current || marqueeRef.current),
        historyGroup: () =>
            gesture.current?.kind !== 'pan' ? gesture.current?.historyGroup : undefined,
        onStagePointerDown: (event: ReactPointerEvent) => {
            if (
                event.button !== 2 &&
                (event.target === stage.current || panning || event.button === 1)
            ) {
                if (panning || event.button === 1) start(event, 'pan');
                else if (event.button === 0) startMarquee(event);
            }
        },
        selectScreen: (event: ReactPointerEvent, id: string) => {
            if (panning || event.button === 1) start(event, 'pan');
            else {
                event.stopPropagation();
                if (!selectionRef.current.includes(id)) setSelected(id);
            }
        },
    };
}
