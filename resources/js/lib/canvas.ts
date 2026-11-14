import type { CanvasBounds, Viewport } from '@/types';
export const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));
export function normalizeUrl(input: string): string {
    if (!input.trim()) return '';
    const value = input.trim();
    const url = new URL(/^[a-z][a-z\d+.-]*:/i.test(value) ? value : `https://${value}`);
    if (!['http:', 'https:'].includes(url.protocol)) throw new Error('Use an http:// or https:// address.');
    return url.href;
}
export function fitViewport(screens: CanvasBounds[], width: number, height: number): Viewport {
    if (!screens.length) return { x: 100, y: 140, zoom: .6 };
    const left = Math.min(...screens.map(s => s.x)), top = Math.min(...screens.map(s => s.y));
    const right = Math.max(...screens.map(s => s.x + s.width)), bottom = Math.max(...screens.map(s => s.y + s.height));
    const zoom = clamp(Math.min((width - 160) / (right - left), (height - 220) / (bottom - top)), .1, 1);
    return { x: (width - (right - left) * zoom) / 2 - left * zoom, y: 130 + (height - 220 - (bottom - top) * zoom) / 2 - top * zoom, zoom };
}
