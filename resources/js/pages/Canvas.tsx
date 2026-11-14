import { Head, router } from '@inertiajs/react';
import { useCallback, useEffect, useRef, useState, type CSSProperties, type PointerEvent as ReactPointerEvent } from 'react';
import { ArrowLeft, Plus, MousePointer2, Hand, Minus, Maximize, Monitor, Copy, ExternalLink, RotateCw, Globe, X, Check, PanelsTopLeft, MoveUpRight, HelpCircle, Link2, Unlink, Grid2X2, Tags, Workflow, Undo2, Redo2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { AddScreenMenu } from '@/components/add-screen-menu';
import { changeScreenUrl, linkScreens, defaultScreenPreset, type ScreenPreset } from '@/lib/screens';
import { ScreenConnections } from '@/components/screen-connections';
import { CanvasMinimap } from '@/components/canvas-minimap';
import { CanvasQuickMenu } from '@/components/canvas-quick-menu';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { clamp, fitViewport, normalizeUrl } from '@/lib/canvas';
import { CanvasItemView, ItemInspector } from '@/components/canvas-item';
import { canvasObjects, orderedObjects, reorderObjects, itemLabels, type LayerAction } from '@/lib/items';
import { CanvasHistory } from '@/lib/history';
import type { CanvasItem, Project, Screen } from '@/types';

type CanvasContent = Pick<Project, 'name' | 'screens'> & { items: CanvasItem[] };
const canvasContent = ({ name, screens, items }: Snapshot): CanvasContent => ({ name, screens, items });
type Snapshot = Pick<Project, 'name' | 'screens' | 'viewport'> & { items: CanvasItem[] };
export default function Canvas({ project }: { project: Project }) {
    const [state, setState] = useState<Snapshot>({ name: project.name, screens: project.screens, items: project.items ?? [], viewport: project.viewport });
    const latest = useRef(state);
    const history = useRef(new CanvasHistory<CanvasContent>());
    const [historyStatus, setHistoryStatus] = useState({ canUndo: false, canRedo: false });
    const persisted = useRef(JSON.stringify(state));
    const inFlight = useRef<Promise<boolean> | null>(null);
    const [saveStatus, setSaveStatus] = useState('All changes saved');
    const [selection, setSelectionState] = useState<string[]>([]);
    const selectionRef = useRef<string[]>([]);
    const selected = selection[0] ?? null;
    function selectScreens(ids: string[]) { selectionRef.current = ids; setSelectionState(ids); }
    function setSelected(id: string | null) { selectScreens(id ? [id] : []); }
    type Marquee = { startX: number; startY: number; x: number; y: number; initial: string[] };
    const [marquee, setMarquee] = useState<Marquee | null>(null);
    const marqueeRef = useRef<Marquee | null>(null);
    function cancelMarquee() { marqueeRef.current = null; setMarquee(null); }
    function startMarquee(e: ReactPointerEvent) {
        stage.current?.focus({ preventScroll: true });
        e.preventDefault(); setInteracting(null);
        const box = { startX: e.clientX, startY: e.clientY, x: e.clientX, y: e.clientY, initial: e.shiftKey ? selectionRef.current : [] };
        selectScreens(box.initial); marqueeRef.current = box; setMarquee(box);
        e.currentTarget.setPointerCapture(e.pointerId); setDragging(true);
    }
    function updateMarquee(e: ReactPointerEvent) {
        const box = marqueeRef.current;
        if (!box) return;
        const next = { ...box, x: e.clientX, y: e.clientY };
        marqueeRef.current = next; setMarquee(next);
        if (Math.hypot(next.x - next.startX, next.y - next.startY) < 4) return;
        const v = latest.current.viewport;
        const left = (Math.min(next.x, next.startX) - v.x) / v.zoom;
        const right = (Math.max(next.x, next.startX) - v.x) / v.zoom;
        const top = (Math.min(next.y, next.startY) - v.y) / v.zoom;
        const bottom = (Math.max(next.y, next.startY) - v.y) / v.zoom;
        const hits = canvasObjects(latest.current.screens, latest.current.items, v.zoom).filter(screen => screen.x <= right && screen.x + screen.width >= left && screen.y <= bottom && screen.y + screen.height >= top).map(screen => screen.id);
        selectScreens([...new Set([...box.initial, ...hits])]);
    }
    const imageInput = useRef<HTMLInputElement>(null);
    const [uploading, setUploading] = useState(false);
    const [uploadError, setUploadError] = useState('');
    const [showDots, setShowDots] = useState(true);
    const [showLabels, setShowLabels] = useState(true);
    const [showConnections, setShowConnections] = useState(true);
    const [tool, setTool] = useState<'select' | 'hand'>('select');
    const [space, setSpace] = useState(false);
    const [dragging, setDragging] = useState(false);
    const [linkingId, setLinkingId] = useState<string | null>(null);
    const [existingTarget, setExistingTarget] = useState('');
    const [help, setHelp] = useState(false);
    const [reloads, setReloads] = useState<Record<string, number>>({});
    const [interacting, setInteracting] = useState<string | null>(null);
    type LinkDrag = { sourceId: string; startX: number; startY: number; x: number; y: number; targetId: string | null };
    const [linkDrag, setLinkDrag] = useState<LinkDrag | null>(null);
    const suppressInteractionUntil = useRef(0);
    const linkGesture = useRef<LinkDrag | null>(null);
    const lastScreenPress = useRef({ id: '', time: 0, x: 0, y: 0 });
    function cancelLink() { linkGesture.current = null; setLinkDrag(null); }
    const stage = useRef<HTMLDivElement>(null);
    const gesture = useRef<{ kind: 'pan' | 'move' | 'resize'; id?: string; ids: string[]; startX: number; startY: number; snapshot: Snapshot; historyGroup: string } | null>(null);
    const update = useCallback((fn: (old: Snapshot) => Snapshot, group?: string) => {
        const previous = latest.current;
        const next = fn(previous);
        history.current.record(canvasContent(previous), canvasContent(next), group ?? (gesture.current?.kind !== 'pan' ? gesture.current?.historyGroup : undefined));
        setHistoryStatus({ canUndo: history.current.canUndo, canRedo: history.current.canRedo });
        latest.current = next; setState(next); setSaveStatus('Unsaved changes');
    }, []);
    const restoreHistory = useCallback((direction: 'undo' | 'redo') => {
        cancelMarquee(); cancelLink(); gesture.current = null; setDragging(false); setInteracting(null); setLinkingId(null);
        const content = history.current[direction]();
        if (!content) return;
        const current = latest.current;
        const restoredIds = [...content.screens, ...content.items].filter(item => ![...current.screens, ...current.items].some(existing => existing.id === item.id)).map(item => item.id);
        const validIds = new Set([...content.screens, ...content.items].map(item => item.id));
        selectScreens(restoredIds.length ? restoredIds : selectionRef.current.filter(id => validIds.has(id)));
        const next = { ...current, ...content };
        latest.current = next; setState(next); setSaveStatus('Unsaved changes');
        setHistoryStatus({ canUndo: history.current.canUndo, canRedo: history.current.canRedo });
    }, []);
    const deleteItems = useCallback((ids: string[]) => {
        if (!ids.length) return;
        cancelMarquee(); cancelLink(); gesture.current = null; setDragging(false);
        selectScreens(selectionRef.current.filter(id => !ids.includes(id)));
        setInteracting(current => current && ids.includes(current) ? null : current);
        setLinkingId(current => current && ids.includes(current) ? null : current);
        update(old => ({ ...old, screens: old.screens.filter(screen => !ids.includes(screen.id)), items: old.items.filter(item => !ids.includes(item.id)) }));
    }, [update]);
    const save = useCallback(async (): Promise<boolean> => {
        if (inFlight.current) { if (!await inFlight.current) return false; }
        const body = JSON.stringify(latest.current);
        if (body === persisted.current) return true;
        setSaveStatus('Saving…');
        const request = (async () => {
            try {
                const response = await fetch(`/projects/${project.id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json', Accept: 'application/json', 'X-CSRF-TOKEN': document.querySelector<HTMLMetaElement>('meta[name="csrf-token"]')!.content }, body });
                if (!response.ok) throw new Error('Save failed');
                persisted.current = body;
                setSaveStatus(JSON.stringify(latest.current) === body ? 'All changes saved' : 'Unsaved changes');
                return true;
            } catch { setSaveStatus('Save failed · click to retry'); return false; }
        })();
        inFlight.current = request;
        const result = await request;
        if (inFlight.current === request) inFlight.current = null;
        return result;
    }, [project.id]);
    useEffect(() => { const timer = setTimeout(() => void save(), 500); return () => clearTimeout(timer); }, [state, save]);
    useEffect(() => {
        const beforeUnload = (e: BeforeUnloadEvent) => { if (JSON.stringify(latest.current) !== persisted.current) { e.preventDefault(); } };
        window.addEventListener('beforeunload', beforeUnload);
        return () => window.removeEventListener('beforeunload', beforeUnload);
    }, []);
    const zoomTo = useCallback((value: number, point?: { x: number; y: number }) => update(old => {
        const zoom = clamp(value, .1, 2), p = point ?? { x: window.innerWidth / 2, y: window.innerHeight / 2 };
        return { ...old, viewport: { zoom, x: p.x - (p.x - old.viewport.x) * zoom / old.viewport.zoom, y: p.y - (p.y - old.viewport.y) * zoom / old.viewport.zoom } };
    }), [update]);
    const fit = useCallback(() => update(old => ({ ...old, viewport: fitViewport(canvasObjects(old.screens, old.items), window.innerWidth, window.innerHeight) })), [update]);
    useEffect(() => {
        const down = (e: KeyboardEvent) => {
            if ((e.target as HTMLElement).closest('input, textarea, [contenteditable], [role="dialog"], [role="menu"], select')) return;
            if (e.isComposing) return;
            if ((e.metaKey || e.ctrlKey) && (e.key.toLowerCase() === 'z' || e.key.toLowerCase() === 'y')) {
                e.preventDefault();
                restoreHistory(e.key.toLowerCase() === 'y' || e.shiftKey ? 'redo' : 'undo');
                return;
            }
            if ((e.key === 'Backspace' || e.key === 'Delete') && !e.metaKey && !e.ctrlKey && !e.altKey) {
                if (selectionRef.current.length) { e.preventDefault(); if (!e.repeat) deleteItems(selectionRef.current); }
                return;
            }
            if (e.code === 'Space') { e.preventDefault(); setSpace(true); }
            if (e.key === 'Escape') { cancelMarquee(); cancelLink(); gesture.current = null; setDragging(false); setInteracting(null); setSelected(null); }
            if (e.key.toLowerCase() === 'v') setTool('select');
            if (e.key.toLowerCase() === 'h') setTool('hand');
            if (e.key === '1') zoomTo(1);
            if (e.key === '0') fit();
            if (e.key === '+' || e.key === '=') zoomTo(latest.current.viewport.zoom * 1.2);
            if (e.key === '-') zoomTo(latest.current.viewport.zoom / 1.2);
        };
        const up = (e: KeyboardEvent) => { if (e.code === 'Space') setSpace(false); };
        const blur = () => { cancelMarquee(); cancelLink(); setSpace(false); setDragging(false); gesture.current = null; };
        window.addEventListener('keydown', down); window.addEventListener('keyup', up); window.addEventListener('blur', blur);
        return () => { window.removeEventListener('keydown', down); window.removeEventListener('keyup', up); window.removeEventListener('blur', blur); };
    }, [fit, zoomTo, restoreHistory, deleteItems]);
    useEffect(() => {
        const element = stage.current!;
        const wheel = (e: WheelEvent) => {
            if ((e.target as HTMLElement).closest('[data-ui]')) return;
            e.preventDefault();
            if (e.ctrlKey || e.metaKey) zoomTo(latest.current.viewport.zoom * Math.exp(-e.deltaY * .008), { x: e.clientX, y: e.clientY });
            else update(old => ({ ...old, viewport: { ...old.viewport, x: old.viewport.x - e.deltaX, y: old.viewport.y - e.deltaY } }));
        };
        element.addEventListener('wheel', wheel, { passive: false });
        return () => element.removeEventListener('wheel', wheel);
    }, [update, zoomTo]);
    function start(e: ReactPointerEvent, kind: 'pan' | 'move' | 'resize', id?: string) {
        if (e.button !== 0 && e.button !== 1) return;
        stage.current?.focus({ preventScroll: true });
        e.preventDefault(); e.stopPropagation(); setInteracting(null);
        const ids = id && selectionRef.current.includes(id) ? selectionRef.current : id ? [id] : [];
        if (id) selectScreens(kind === 'resize' ? [id] : ids);
        gesture.current = { kind, id, ids, startX: e.clientX, startY: e.clientY, snapshot: latest.current, historyGroup: crypto.randomUUID() };
        e.currentTarget.setPointerCapture(e.pointerId); setDragging(true);
    }
    function startScreenDrag(e: ReactPointerEvent, screen: Screen) {
        if (e.shiftKey && e.button === 0 && !panning) {
            stage.current?.focus({ preventScroll: true });
        e.preventDefault(); e.stopPropagation(); setInteracting(null);
            selectScreens(selectionRef.current.includes(screen.id) ? selectionRef.current.filter(id => id !== screen.id) : [...selectionRef.current, screen.id]);
            lastScreenPress.current.time = 0;
            return;
        }
        const last = lastScreenPress.current;
        const now = performance.now();
        const doublePress = e.button === 0 && !panning && selectionRef.current.length < 2 && last.id === screen.id && now - last.time < 500 && Math.hypot(e.clientX - last.x, e.clientY - last.y) < 8;
        lastScreenPress.current = { id: screen.id, time: now, x: e.clientX, y: e.clientY };
        if (!doublePress) { start(e, panning ? 'pan' : 'move', screen.id); return; }
        e.preventDefault(); e.stopPropagation();
        gesture.current = null;
        setInteracting(null); setSelected(screen.id); setDragging(true);
        const connection = { sourceId: screen.id, startX: e.clientX, startY: e.clientY, x: e.clientX, y: e.clientY, targetId: null };
        linkGesture.current = connection; setLinkDrag(connection);
        e.currentTarget.setPointerCapture(e.pointerId);
        lastScreenPress.current.time = 0;
    }
    function updateLinkPointer(e: ReactPointerEvent) {
        const current = linkGesture.current;
        if (!current) return;
        const hit = document.elementFromPoint(e.clientX, e.clientY)?.closest<HTMLElement>('[data-screen-id]');
        const targetId = hit?.dataset.screenId;
        const next = { ...current, x: e.clientX, y: e.clientY, targetId: targetId && targetId !== current.sourceId ? targetId : null };
        linkGesture.current = next; setLinkDrag(next);
    }
    function finishDrag(e: ReactPointerEvent) {
        if (marqueeRef.current) { updateMarquee(e); cancelMarquee(); setDragging(false); return; }
        updateLinkPointer(e);
        const connection = linkGesture.current;
        if (connection && Math.hypot(connection.x - connection.startX, connection.y - connection.startY) > 6) suppressInteractionUntil.current = performance.now() + 500;
        if (connection?.targetId && Math.hypot(connection.x - connection.startX, connection.y - connection.startY) > 6) {
            update(old => ({ ...old, screens: linkScreens(old.screens, connection.sourceId, connection.targetId!, crypto.randomUUID()) }));
        }
        cancelMarquee(); cancelLink(); gesture.current = null; setDragging(false); history.current.breakGroup();
    }
    function move(e: ReactPointerEvent) {
        if (marqueeRef.current) { updateMarquee(e); return; }
        if (linkGesture.current) { updateLinkPointer(e); return; }
        const g = gesture.current; if (!g) return;
        const dx = e.clientX - g.startX, dy = e.clientY - g.startY, v = g.snapshot.viewport;
        if (g.kind === 'pan') update(old => ({ ...old, viewport: { ...v, x: v.x + dx, y: v.y + dy } }));
        else if (g.kind === 'move') {
            const translate = <T extends Screen | CanvasItem>(object: T): T => {
                if (!g.ids.includes(object.id)) return object;
                const original = [...g.snapshot.screens, ...g.snapshot.items].find(item => item.id === object.id)!;
                return { ...object, x: clamp(original.x + dx / v.zoom, -1000000, 1000000), y: clamp(original.y + dy / v.zoom, -1000000, 1000000) };
            };
            update(old => ({ ...old, screens: old.screens.map(translate), items: old.items.map(translate) }));
        } else {
            const originalItem = g.snapshot.items.find(item => item.id === g.id);
            if (originalItem) {
                let width = Math.round(clamp(originalItem.width + dx / v.zoom, 40, 100000));
                let height = Math.round(clamp(originalItem.height + dy / v.zoom, 40, 100000));
                if (originalItem.kind === 'square' || originalItem.kind === 'circle') width = height = Math.max(width, height);
                if (originalItem.kind === 'image') height = Math.round(clamp(width * originalItem.height / originalItem.width, 40, 100000));
                update(old => ({ ...old, items: old.items.map(item => item.id === g.id ? { ...item, width, height } : item) }));
            } else {
                const original = g.snapshot.screens.find(screen => screen.id === g.id);
                if (!original) return;
                update(old => ({ ...old, screens: old.screens.map(screen => screen.id !== g.id ? screen : { ...screen, width: Math.round(clamp(original.width + dx / v.zoom, 320, 3840)), height: Math.round(clamp(original.height + dy / v.zoom, 240, 2160)) }) }));
            }
        }
    }

    function setScreenUrl(id: string, url: string) {
        update(old => ({ ...old, screens: changeScreenUrl(old.screens, id, url) }));
    }
    function addScreen(size: ScreenPreset = defaultScreenPreset) {
        if (latest.current.screens.length >= 100) return;
        const viewport = latest.current.viewport;
        const screen: Screen = {
            id: crypto.randomUUID(), title: `Screen ${latest.current.screens.length + 1}`, url: '',
            width: size.width, height: size.height, zIndex: nextLayer(),
            x: (window.innerWidth / 2 - viewport.x) / viewport.zoom - size.width / 2,
            y: (window.innerHeight / 2 - viewport.y) / viewport.zoom - size.height / 2,
        };
        update(old => ({ ...old, screens: [...old.screens, screen] }));
        setSelected(screen.id);
        setInteracting(null);
    }
    function nextLayer() {
        return Math.max(-1, ...orderedObjects(latest.current.screens, latest.current.items).map(object => object.zIndex)) + 1;
    }
    function addItem(kind: CanvasItem['kind'], image?: { src: string; width: number; height: number }) {
        if (latest.current.items.length >= 200) return;
        if (kind === 'image' && !image) { imageInput.current?.click(); return; }
        const viewport = latest.current.viewport;
        const width = image ? Math.max(40, Math.min(600, image.width)) : kind === 'rectangle' || kind === 'text' ? 360 : 240;
        const height = image ? clamp(width * image.height / image.width, 40, 3840) : kind === 'text' ? 100 : kind === 'rectangle' ? 180 : 240;
        const item: CanvasItem = { id: crypto.randomUUID(), kind, width, height, x: (window.innerWidth / 2 - viewport.x) / viewport.zoom - width / 2, y: (window.innerHeight / 2 - viewport.y) / viewport.zoom - height / 2, zIndex: nextLayer(), content: '', color: kind === 'note' ? '#fef08a' : kind === 'text' ? '#334155' : '#3b82f6', filled: true, fillStyle: 'solid', label: '', fontSize: kind === 'text' ? 32 : 24, src: image?.src ?? null };
        update(old => ({ ...old, items: [...old.items, item] }));
        setSelected(item.id); setInteracting(null); setTool('select');
    }
    async function uploadImage(file: File) {
        if (uploading) return;
        setUploadError('');
        if (file.size > 10 * 1024 * 1024) { setUploadError('Choose an image smaller than 10 MB.'); return; }
        setUploading(true);
        try {
            const body = new FormData(); body.append('image', file);
            const response = await fetch(`/projects/${project.id}/images`, { method: 'POST', headers: { Accept: 'application/json', 'X-CSRF-TOKEN': document.querySelector<HTMLMetaElement>('meta[name="csrf-token"]')!.content }, body });
            const result = await response.json();
            if (!response.ok) throw new Error(result.errors?.image?.[0] ?? 'Could not upload this image. Try PNG, JPG, GIF, or WebP.');
            addItem('image', result);
        } catch (error) { setUploadError(error instanceof Error ? error.message : 'Image upload failed. Please try again.'); }
        finally { setUploading(false); }
    }
    function changeItem(id: string, patch: Partial<CanvasItem>) {
        update(old => ({ ...old, items: old.items.map(item => item.id === id ? { ...item, ...patch } : item) }), `item:${id}:${Object.keys(patch).sort().join(',')}`);
    }
    function startItemDrag(event: ReactPointerEvent, item: CanvasItem, resize = false) {
        if (event.button === 2) { event.stopPropagation(); return; }
        if (event.shiftKey && !resize && !panning) {
            stage.current?.focus({ preventScroll: true });
            event.preventDefault(); event.stopPropagation();
            selectScreens(selectionRef.current.includes(item.id) ? selectionRef.current.filter(id => id !== item.id) : [...selectionRef.current, item.id]);
            return;
        }
        start(event, panning || event.button === 1 ? 'pan' : resize ? 'resize' : 'move', item.id);
    }
    function fitItem(id: string) {
        setSelected(id); setInteracting(null);
        update(old => ({ ...old, viewport: fitViewport(canvasObjects(old.screens, old.items).filter(item => item.id === id), window.innerWidth, window.innerHeight) }));
    }
    function arrangeItem(id: string, action: LayerAction) {
        update(old => ({ ...old, ...reorderObjects(old.screens, old.items, id, action) }));
    }
    const { viewport: v, screens, items } = state;
    const objects = canvasObjects(screens, items, v.zoom);
    const selectedItem = selection.length === 1 ? items.find(item => item.id === selected) : undefined;
    const panning = tool === 'hand' || space;
    const linkingScreen = screens.find(screen => screen.id === linkingId);
    const linkedCount = (screen: Screen) => screen.linkGroup ? screens.filter(other => other.linkGroup === screen.linkGroup).length : 0;
    const changeTool = (tool: 'select' | 'hand') => { setTool(tool); setInteracting(null); };
    function duplicateScreen(id: string) {
        const item = latest.current.items.find(item => item.id === id);
        if (item) {
            if (latest.current.items.length >= 200) return;
            const copy = { ...item, id: crypto.randomUUID(), x: item.x + 40, y: item.y + 40, zIndex: nextLayer() };
            update(old => ({ ...old, items: [...old.items, copy] }));
            setSelected(copy.id);
            return;
        }
        const screen = latest.current.screens.find(screen => screen.id === id);
        if (!screen || latest.current.screens.length >= 100) return;
        const copy = { ...screen, id: crypto.randomUUID(), x: screen.x + 80, y: screen.y + 80, zIndex: nextLayer() };
        update(old => ({ ...old, screens: [...old.screens, copy] }));
        setSelected(copy.id);
    }
    function resizeScreen(id: string, preset: ScreenPreset) {
        update(old => ({ ...old, screens: old.screens.map(screen => screen.id === id ? { ...screen, width: preset.width, height: preset.height } : screen) }));
    }
    function unlinkScreen(id: string) {
        update(old => ({ ...old, screens: old.screens.map(screen => screen.id === id ? { ...screen, linkGroup: null } : screen) }));
    }
    function deleteScreen(id: string) { deleteItems([id]); }
    const backToProjects = async () => { if (await save()) router.visit('/'); };
    return <CanvasQuickMenu screens={[...screens, ...items.map(item => ({ ...item, title: item.label || itemLabels[item.kind] }))]} onLayer={arrangeItem} onFitItem={fitItem} onDuplicate={duplicateScreen} onResize={resizeScreen} onUnlink={unlinkScreen} onDelete={deleteScreen} tool={tool} zoom={v.zoom} canAddScreen={screens.length < 100} onAddScreen={() => addScreen()} onToolChange={changeTool} onZoom={zoomTo} onFit={fit}><div ref={stage} tabIndex={-1} onBlurCapture={() => history.current.breakGroup()} className={`canvas ${showLabels ? '' : 'hide-canvas-labels'} ${panning ? 'hand-mode' : ''} ${dragging ? 'is-dragging' : ''}`} style={{ backgroundImage: showDots ? undefined : 'none', backgroundSize: `${24 * v.zoom}px ${24 * v.zoom}px`, backgroundPosition: `${v.x}px ${v.y}px` }} onPointerDown={e => { if (e.button !== 2 && (e.target === stage.current || panning || e.button === 1)) { if (panning || e.button === 1) start(e, 'pan'); else if (e.button === 0) startMarquee(e); } }} onPointerMove={move} onPointerUp={finishDrag} onPointerCancel={() => { cancelMarquee(); cancelLink(); gesture.current = null; setDragging(false); }}>
        <Head title={state.name} />
        <input ref={imageInput} type="file" accept="image/png,image/jpeg,image/gif,image/webp" className="hidden" aria-label="Upload canvas image" onChange={event => { const file = event.target.files?.[0]; event.target.value = ''; if (file) void uploadImage(file); }} />
        {(uploading || uploadError) && <div className="canvas-upload-status" role="status" data-ui onPointerDown={event => event.stopPropagation()}>{uploading ? 'Uploading image…' : uploadError}{uploadError && <button aria-label="Dismiss upload error" onClick={() => setUploadError('')}><X size={14} /></button>}</div>}
        <div className="canvas-toolbars">
        <nav className="canvas-toolbar" aria-label="Canvas tools" data-ui onPointerDown={e => e.stopPropagation()}>
            <div className="toolbar-project-group">
            <Button variant="ghost" size="icon" title="Back to projects" aria-label="Back to projects" onClick={backToProjects}><ArrowLeft /></Button><span className="divider" />
        <div className="canvas-project toolbar-project" data-ui onPointerDown={e => e.stopPropagation()}><span className="brand-icon"><PanelsTopLeft size={20} /></span><div><input aria-label="Project name" value={state.name} maxLength={120} onChange={e => update(old => ({ ...old, name: e.target.value }), 'project-name')} onBlur={() => { if (!latest.current.name.trim()) update(old => ({ ...old, name: project.name })); }} /><button className={`save-status ${saveStatus.startsWith('Save failed') ? 'error' : ''}`} onClick={() => void save()}>{saveStatus === 'All changes saved' && <Check size={11} />}{saveStatus}</button></div></div>
            </div><span className="divider project-divider" />
            <Button variant="ghost" size="icon" className={tool === 'select' ? 'active-tool' : ''} title="Select (V)" aria-label="Select tool" onClick={() => changeTool('select')}><MousePointer2 /></Button>
            <Button variant="ghost" size="icon" className={tool === 'hand' ? 'active-tool' : ''} title="Pan (H or hold Space)" aria-label="Pan tool" onClick={() => changeTool('hand')}><Hand /></Button><span className="divider" />
            <Button variant="ghost" size="icon" title="Undo (⌘/Ctrl+Z)" aria-label="Undo" disabled={!historyStatus.canUndo} onClick={() => restoreHistory('undo')}><Undo2 /></Button>
            <Button variant="ghost" size="icon" title="Redo (⌘/Ctrl+Shift+Z)" aria-label="Redo" disabled={!historyStatus.canRedo} onClick={() => restoreHistory('redo')}><Redo2 /></Button><span className="divider" />
            <AddScreenMenu disabled={screens.length >= 100} onChoose={addScreen} itemsDisabled={items.length >= 200 || uploading} onAddItem={addItem} /><span className="divider" />
            <Button variant="ghost" size="icon" aria-label="Zoom out" onClick={() => zoomTo(v.zoom / 1.2)}><Minus /></Button><button className="zoom-value" title="Reset to 100%" onClick={() => zoomTo(1)}>{Math.round(v.zoom * 100)}%</button><Button variant="ghost" size="icon" aria-label="Zoom in" onClick={() => zoomTo(v.zoom * 1.2)}><Plus /></Button><Button variant="ghost" size="icon" title="Fit all items (0)" aria-label="Fit all items" onClick={fit}><Maximize /></Button>
            <span className="divider" /><Button variant="ghost" size="icon" aria-label={showDots ? 'Hide dot background' : 'Show dot background'} title={showDots ? 'Hide dot background' : 'Show dot background'} aria-pressed={showDots} className={showDots ? 'active-tool' : ''} onClick={() => setShowDots(value => !value)}><Grid2X2 /></Button>
            <Button variant="ghost" size="icon" aria-label={showLabels ? 'Hide all labels' : 'Show all labels'} title={showLabels ? 'Hide all labels' : 'Show all labels'} aria-pressed={showLabels} className={showLabels ? 'active-tool' : ''} onClick={() => setShowLabels(value => !value)}><Tags /></Button>
            <Button variant="ghost" size="icon" aria-label={showConnections ? 'Hide group link lines' : 'Show group link lines'} title={showConnections ? 'Hide group link lines' : 'Show group link lines'} aria-pressed={showConnections} className={showConnections ? 'active-tool' : ''} onClick={() => setShowConnections(value => !value)}><Workflow /></Button>
        </nav>
        {selectedItem && <ItemInspector item={selectedItem} onChange={patch => changeItem(selectedItem.id, patch)} onDelete={() => deleteScreen(selectedItem.id)} onDuplicate={() => duplicateScreen(selectedItem.id)} />}
        </div>
        {!screens.length && !items.length && <div className="canvas-empty" data-ui onPointerDown={e => e.stopPropagation()}><div className="empty-icon"><PanelsTopLeft size={36} /></div><span className="eyebrow">YOUR IDEAS, WITHOUT EDGES</span><h1>Give your tabs some space.</h1><p>Add your first screen and start exploring.<br />An entire web, on your canvas.</p><Button onClick={() => addScreen()}><Plus size={16} /> Add your first screen</Button><small>Desktop size by default. Resize to make it yours.</small></div>}
        {showConnections && <ScreenConnections screens={screens} viewport={v} />}
        <div className="canvas-world" style={{ transform: `translate(${v.x}px, ${v.y}px) scale(${v.zoom})`, '--label-scale': Math.max(1, 1 / v.zoom) } as CSSProperties}>
            {items.map(item => <CanvasItemView key={item.id} item={item} selected={selection.includes(item.id)} onStart={(event, resize) => startItemDrag(event, item, resize)} onChange={patch => changeItem(item.id, patch)} />)}
            {screens.map((screen, index) => <section key={screen.id} data-screen-id={screen.id} className={`browser-screen ${linkDrag?.targetId === screen.id ? 'link-drop-target' : ''} ${selection.includes(screen.id) ? 'selected' : ''}`} style={{ left: screen.x, top: screen.y, width: screen.width, zIndex: screen.zIndex ?? index }} onPointerDown={e => { if (panning || e.button === 1) start(e, 'pan'); else { e.stopPropagation(); if (!selectionRef.current.includes(screen.id)) setSelected(screen.id); } }}>
                <div className="screen-label" title="Drag to move · double-click and hold to draw a link" onPointerDown={e => startScreenDrag(e, screen)}><span><Monitor size={17} /> {screen.title}{linkedCount(screen) > 1 && <span className="linked-badge"><Link2 size={13} /> {linkedCount(screen)} linked</span>}</span><span>{screen.width} × {screen.height}</span></div>
                <div className="browser-chrome" onPointerDown={e => { if (!(e.target as HTMLElement).closest('input,button,a')) startScreenDrag(e, screen); }}><span className="traffic-lights"><i /><i /><i /></span><button aria-label={`Reload ${screen.title}`} onClick={() => setReloads(old => ({ ...old, [screen.id]: (old[screen.id] ?? 0) + 1 }))}><RotateCw size={17} /></button><form className="address-bar" onSubmit={e => { e.preventDefault(); const input = e.currentTarget.elements.namedItem('url') as HTMLInputElement; try { const url = normalizeUrl(input.value); input.setCustomValidity(''); setScreenUrl(screen.id, url); setInteracting(null); } catch { input.setCustomValidity('Enter an http:// or https:// address.'); input.reportValidity(); } }}><Globe size={15} /><input key={screen.url} name="url" aria-label={`URL for ${screen.title}`} defaultValue={screen.url} placeholder="Enter a website URL…" onChange={e => e.target.setCustomValidity('')} /><button type="submit" aria-label="Load URL"><MoveUpRight size={15} /></button></form>
                    <button title="Manage linked screens" aria-label={`Link screens for ${screen.title}`} className={linkedCount(screen) > 1 ? 'linked-control' : ''} onClick={() => { setLinkingId(screen.id); setExistingTarget(''); }}><Link2 size={17} /></button>
                    <button title="Duplicate screen" aria-label={`Duplicate ${screen.title}`} disabled={screens.length >= 100} onClick={() => duplicateScreen(screen.id)}><Copy size={17} /></button>
                    {screen.url && <a href={screen.url} target="_blank" rel="noreferrer" title="Open in new tab" aria-label={`Open ${screen.title} in new tab`}><ExternalLink size={17} /></a>}
                    <button aria-label={`Delete ${screen.title}`} title="Delete screen" onClick={() => deleteScreen(screen.id)}><X size={18} /></button>
                </div>
                <div className="browser-body" style={{ height: screen.height }}>
                    {screen.url ? <><iframe key={`${screen.url}-${reloads[screen.id] ?? 0}`} src={screen.url} title={screen.title} sandbox="allow-scripts allow-same-origin allow-forms allow-popups allow-popups-to-escape-sandbox" referrerPolicy="no-referrer" style={{ pointerEvents: interacting === screen.id && !panning && !dragging ? 'auto' : 'none' }} />{interacting !== screen.id && <div className="screen-shield" onDoubleClick={() => { if (performance.now() < suppressInteractionUntil.current || panning) return; setInteracting(screen.id); setTool('select'); }} onPointerDown={e => startScreenDrag(e, screen)}><button onPointerDown={e => e.stopPropagation()} onClick={() => { setInteracting(screen.id); setTool('select'); }}><MousePointer2 size={16} /> Interact with website</button></div>}</> : <div className="blank-screen" onPointerDown={e => startScreenDrag(e, screen)}><Globe size={50} /><h2>Your next destination.</h2><p>Enter a web address above to load a page here.</p></div>}
                </div>
                <div className="screen-footer"><span>{interacting === screen.id ? 'Interacting · click canvas to finish' : 'Drag to move · double-click to interact · double-click-drag to link'}</span><span>Page not showing? Some sites block embedding. {screen.url && <a href={screen.url} target="_blank" rel="noreferrer">Open in new tab ↗</a>}</span></div>
                <button className="resize-handle" aria-label={`Resize ${screen.title}`} title="Drag to resize" onPointerDown={e => start(e, 'resize', screen.id)}><MoveUpRight size={18} /></button>
            </section>)}
        </div>
        {marquee && <div className="selection-marquee" style={{ left: Math.min(marquee.startX, marquee.x), top: Math.min(marquee.startY, marquee.y), width: Math.abs(marquee.x - marquee.startX), height: Math.abs(marquee.y - marquee.startY) }} />}
        {selection.length > 1 && <div className="selection-count" role="status">{selection.length} items selected · drag any selected item to move together</div>}
        {linkDrag && <div className="link-drag-overlay" aria-hidden="true"><svg><path d={`M ${linkDrag.startX} ${linkDrag.startY} C ${linkDrag.startX + (linkDrag.x - linkDrag.startX) / 2} ${linkDrag.startY}, ${linkDrag.startX + (linkDrag.x - linkDrag.startX) / 2} ${linkDrag.y}, ${linkDrag.x} ${linkDrag.y}`} /><circle cx={linkDrag.startX} cy={linkDrag.startY} r="4" /><circle cx={linkDrag.x} cy={linkDrag.y} r="6" /></svg><span style={{ left: Math.min(linkDrag.x + 16, window.innerWidth - 260), top: Math.max(10, linkDrag.y - 38) }}>{linkDrag.targetId ? 'Release to use this screen’s website' : 'Drag onto a screen · Esc to cancel'}</span></div>}
        <CanvasMinimap screens={objects} viewport={v} selected={selected} onNavigate={(centerX, centerY) => {
            setInteracting(null);
            update(old => ({ ...old, viewport: { ...old.viewport, x: clamp(window.innerWidth / 2 - centerX * old.viewport.zoom, -1000000, 1000000), y: clamp(window.innerHeight / 2 - centerY * old.viewport.zoom, -1000000, 1000000) } }));
        }} />
        <div className="canvas-bottom" data-ui><span><span className="status-dot" />{objects.length} {objects.length === 1 ? 'item' : 'items'} <span className="bottom-divider">/</span> Infinite possibilities</span><span>Hold <kbd>space</kbd> to pan <span className="bottom-divider">·</span> <kbd>⌘ / ctrl</kbd> + scroll to zoom <Button variant="ghost" size="icon" aria-label="Canvas help" onClick={() => setHelp(true)}><HelpCircle size={17} /></Button></span></div>
        <Dialog open={!!linkingScreen} onOpenChange={open => { if (!open) setLinkingId(null); }}><DialogContent><DialogHeader><DialogTitle>Link screens</DialogTitle><DialogDescription>Share a website address across screens. Each screen keeps its own size and position. Links clicked inside a website stay independent.</DialogDescription></DialogHeader>
            {linkingScreen && <div className="dialog-form">
                {linkedCount(linkingScreen) > 1 && <p className="link-note"><Link2 size={15} /> This screen shares its address with {linkedCount(linkingScreen) - 1} other {linkedCount(linkingScreen) === 2 ? 'screen' : 'screens'}.</p>}
                <label htmlFor="existing-link-target">Use the website from</label><select id="existing-link-target" className="canvas-select" value={existingTarget} onChange={event => setExistingTarget(event.target.value)}><option value="">Choose a screen…</option>{screens.filter(screen => screen.id !== linkingScreen.id && (!linkingScreen.linkGroup || screen.linkGroup !== linkingScreen.linkGroup)).map(screen => <option key={screen.id} value={screen.id}>{screen.title} — {screen.width} × {screen.height}</option>)}</select>
                <p className="small-note">Linking replaces this screen’s address with the chosen screen’s address and joins its group.</p>
                <div className="dialog-actions">{linkingScreen.linkGroup && <Button variant="outline" onClick={() => { unlinkScreen(linkingScreen.id); setLinkingId(null); }}><Unlink size={15} /> Unlink this screen</Button>}<Button disabled={!existingTarget} onClick={() => { update(old => ({ ...old, screens: linkScreens(old.screens, linkingScreen.id, existingTarget, crypto.randomUUID()) })); setInteracting(null); setLinkingId(null); }}><Link2 size={15} /> Link screen</Button></div>
            </div>}
        </DialogContent></Dialog>
        <Dialog open={help} onOpenChange={setHelp}><DialogContent><DialogHeader><DialogTitle>A little canvas know-how</DialogTitle><DialogDescription>Your shortcuts to the bigger picture.</DialogDescription></DialogHeader><div className="help-list"><p><span>Undo / redo</span><kbd>⌘/Ctrl + Z / Shift + Z</kbd></p><p><span>Delete selected items</span><kbd>Backspace / Delete</kbd></p><p><span>Select / hand tool</span><kbd>V / H</kbd></p><p><span>Pan canvas</span><kbd>Space + drag</kbd></p><p><span>Zoom in / out</span><kbd>+ / −</kbd></p><p><span>Fit all / actual size</span><kbd>0 / 1</kbd></p><p><span>Use a live website</span><kbd>Double-click screen</kbd></p><p>Drag the corner of a screen to resize it. Changes save automatically to your local database.</p></div></DialogContent></Dialog>
    </div></CanvasQuickMenu>;
}
