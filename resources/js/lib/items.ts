import type { CanvasItem, Screen } from '../types';

export type LayerAction = 'forward' | 'backward' | 'front' | 'back';
export const itemKinds = [
    'note',
    'text',
    'image',
    'square',
    'rectangle',
    'triangle',
    'circle',
] as const;
export const itemLabels: Record<CanvasItem['kind'], string> = {
    note: 'Sticky note',
    text: 'Text',
    image: 'Image',
    square: 'Square',
    rectangle: 'Rectangle',
    triangle: 'Triangle',
    circle: 'Circle',
};
export const isShape = (kind: CanvasItem['kind']) =>
    ['square', 'rectangle', 'triangle', 'circle'].includes(kind);
export function orderedObjects(screens: Screen[], items: CanvasItem[]) {
    return [...screens, ...items]
        .map((object, index) => ({ ...object, zIndex: object.zIndex ?? index }))
        .sort((a, b) => a.zIndex - b.zIndex);
}
export function reorderObjects(
    screens: Screen[],
    items: CanvasItem[],
    id: string,
    action: LayerAction,
) {
    const ordered = orderedObjects(screens, items);
    const index = ordered.findIndex((object) => object.id === id);
    if (index < 0) return { screens, items };
    const destination =
        action === 'front'
            ? ordered.length - 1
            : action === 'back'
              ? 0
              : Math.max(0, Math.min(ordered.length - 1, index + (action === 'forward' ? 1 : -1)));
    const [object] = ordered.splice(index, 1);
    ordered.splice(destination, 0, object);
    const layers = new Map(ordered.map((entry, layer) => [entry.id, layer]));
    return {
        screens: screens.map((screen) => ({ ...screen, zIndex: layers.get(screen.id)! })),
        items: items.map((item) => ({ ...item, zIndex: layers.get(item.id)! })),
    };
}
export function canvasObjects(screens: Screen[], items: CanvasItem[], zoom = 1) {
    const labelHeight = 39 * Math.max(1, 1 / zoom);
    return [
        ...screens.map((screen) => ({
            id: screen.id,
            title: screen.title,
            x: screen.x,
            y: screen.y - labelHeight,
            width: screen.width,
            height: screen.height + 84 + labelHeight,
        })),
        ...items.map((item) => ({
            ...item,
            title: item.label || itemLabels[item.kind],
            y: item.y - (isShape(item.kind) && item.label ? labelHeight : 0),
            height: item.height + (isShape(item.kind) && item.label ? labelHeight : 0),
        })),
    ];
}
