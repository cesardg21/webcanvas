import type { CanvasItem, Screen } from '@/types';
import { useState, type RefObject } from 'react';
import { clamp, fitViewport } from './canvas';
import type { CanvasSnapshot } from './canvas-types';
import { canvasObjects, orderedObjects, reorderObjects, type LayerAction } from './items';
import { changeScreenUrl, defaultScreenPreset, type ScreenPreset } from './screens';

type Options = {
    latest: RefObject<CanvasSnapshot>;
    update: (change: (previous: CanvasSnapshot) => CanvasSnapshot, group?: string) => void;
    selectItem: (id: string) => void;
    stopInteracting: () => void;
    selectTool: () => void;
    chooseImage: () => void;
};
export function useCanvasActions({
    latest,
    update,
    selectItem,
    stopInteracting,
    selectTool,
    chooseImage,
}: Options) {
    const [reloads, setReloads] = useState<Record<string, number>>({});
    function setScreenUrl(id: string, url: string) {
        update((old) => ({ ...old, screens: changeScreenUrl(old.screens, id, url) }));
    }
    function addScreen(size: ScreenPreset = defaultScreenPreset) {
        if (latest.current.screens.length >= 100) return;
        const viewport = latest.current.viewport;
        const screen: Screen = {
            id: crypto.randomUUID(),
            title: `Screen ${latest.current.screens.length + 1}`,
            url: '',
            width: size.width,
            height: size.height,
            zIndex: nextLayer(),
            x: (window.innerWidth / 2 - viewport.x) / viewport.zoom - size.width / 2,
            y: (window.innerHeight / 2 - viewport.y) / viewport.zoom - size.height / 2,
        };
        update((old) => ({ ...old, screens: [...old.screens, screen] }));
        selectItem(screen.id);
        stopInteracting();
    }
    function nextLayer() {
        return (
            Math.max(
                -1,
                ...orderedObjects(latest.current.screens, latest.current.items).map(
                    (object) => object.zIndex,
                ),
            ) + 1
        );
    }
    function addItem(
        kind: CanvasItem['kind'],
        image?: { src: string; width: number; height: number },
        position?: { x: number; y: number },
    ) {
        if (latest.current.items.length >= 200) return;
        if (kind === 'image' && !image) {
            chooseImage();
            return;
        }
        const viewport = latest.current.viewport;
        const width = image
            ? Math.max(40, Math.min(600, image.width))
            : kind === 'rectangle' || kind === 'text'
              ? 360
              : 240;
        const height = image
            ? clamp((width * image.height) / image.width, 40, 3840)
            : kind === 'text'
              ? 100
              : kind === 'rectangle'
                ? 180
                : 240;
        const item: CanvasItem = {
            id: crypto.randomUUID(),
            kind,
            width,
            height,
            x: position?.x ?? (window.innerWidth / 2 - viewport.x) / viewport.zoom - width / 2,
            y: position?.y ?? (window.innerHeight / 2 - viewport.y) / viewport.zoom - height / 2,
            zIndex: nextLayer(),
            content: '',
            color: kind === 'note' ? '#fef08a' : kind === 'text' ? '#334155' : '#3b82f6',
            filled: true,
            fillStyle: 'solid',
            label: '',
            fontSize: kind === 'text' ? 32 : 24,
            src: image?.src ?? null,
        };
        update((old) => ({ ...old, items: [...old.items, item] }));
        selectItem(item.id);
        stopInteracting();
        selectTool();
    }
    function changeItem(id: string, patch: Partial<CanvasItem>) {
        update(
            (old) => ({
                ...old,
                items: old.items.map((item) => (item.id === id ? { ...item, ...patch } : item)),
            }),
            `item:${id}:${Object.keys(patch).sort().join(',')}`,
        );
    }
    function fitItem(id: string) {
        selectItem(id);
        stopInteracting();
        update((old) => ({
            ...old,
            viewport: fitViewport(
                canvasObjects(old.screens, old.items).filter((item) => item.id === id),
                window.innerWidth,
                window.innerHeight,
            ),
        }));
    }
    function arrangeItem(id: string, action: LayerAction) {
        update((old) => ({ ...old, ...reorderObjects(old.screens, old.items, id, action) }));
    }
    function duplicateItem(id: string) {
        const item = latest.current.items.find((item) => item.id === id);
        if (item) {
            if (latest.current.items.length >= 200) return;
            const copy = {
                ...item,
                id: crypto.randomUUID(),
                x: item.x + 40,
                y: item.y + 40,
                zIndex: nextLayer(),
            };
            update((old) => ({ ...old, items: [...old.items, copy] }));
            selectItem(copy.id);
            return;
        }
        const screen = latest.current.screens.find((screen) => screen.id === id);
        if (!screen || latest.current.screens.length >= 100) return;
        const copy = {
            ...screen,
            id: crypto.randomUUID(),
            x: screen.x + 80,
            y: screen.y + 80,
            zIndex: nextLayer(),
        };
        update((old) => ({ ...old, screens: [...old.screens, copy] }));
        selectItem(copy.id);
    }
    function resizeScreen(id: string, preset: ScreenPreset) {
        update((old) => ({
            ...old,
            screens: old.screens.map((screen) =>
                screen.id === id
                    ? { ...screen, width: preset.width, height: preset.height }
                    : screen,
            ),
        }));
    }
    function unlinkScreen(id: string) {
        update((old) => ({
            ...old,
            screens: old.screens.map((screen) =>
                screen.id === id ? { ...screen, linkGroup: null } : screen,
            ),
        }));
    }
    function reloadAllScreens() {
        const loadedScreens = latest.current.screens.filter((screen) => screen.url);
        setReloads((previous) => {
            const next = { ...previous };
            for (const screen of loadedScreens) next[screen.id] = (previous[screen.id] ?? 0) + 1;
            return next;
        });
    }
    function reloadScreen(id: string) {
        setReloads((previous) => ({ ...previous, [id]: (previous[id] ?? 0) + 1 }));
    }
    return {
        setScreenUrl,
        addScreen,
        addItem,
        changeItem,
        fitItem,
        arrangeItem,
        duplicateItem,
        resizeScreen,
        unlinkScreen,
        reloadAllScreens,
        reloadScreen,
        reloads,
    };
}
