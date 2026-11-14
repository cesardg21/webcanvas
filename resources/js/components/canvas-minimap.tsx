import { useEffect, useRef, useState, type PointerEvent } from 'react';
import type { Screen, Viewport } from '@/types';

const MAP_WIDTH = 224;
const MAP_HEIGHT = 136;
const PADDING = 12;
type Projection = { x: number; y: number; scale: number };
type Props = {
    screens: Screen[];
    viewport: Viewport;
    selected: string | null;
    onNavigate: (centerX: number, centerY: number) => void;
};

export function CanvasMinimap({ screens, viewport, selected, onNavigate }: Props) {
    const [size, setSize] = useState({ width: window.innerWidth, height: window.innerHeight });
    const [frozenProjection, setFrozenProjection] = useState<Projection | null>(null);
    const gesture = useRef<{ pointerId: number; projection: Projection; offsetX: number; offsetY: number } | null>(null);
    useEffect(() => {
        const resize = () => setSize({ width: window.innerWidth, height: window.innerHeight });
        window.addEventListener('resize', resize);
        return () => window.removeEventListener('resize', resize);
    }, []);

    const visible = {
        x: -viewport.x / viewport.zoom,
        y: -viewport.y / viewport.zoom,
        width: size.width / viewport.zoom,
        height: size.height / viewport.zoom,
    };
    const left = Math.min(visible.x, ...screens.map(screen => screen.x));
    const top = Math.min(visible.y, ...screens.map(screen => screen.y - 39));
    const right = Math.max(visible.x + visible.width, ...screens.map(screen => screen.x + screen.width));
    const bottom = Math.max(visible.y + visible.height, ...screens.map(screen => screen.y + screen.height + 84));
    const scale = Math.min((MAP_WIDTH - PADDING * 2) / (right - left), (MAP_HEIGHT - PADDING * 2) / (bottom - top));
    const projection = frozenProjection ?? {
        scale,
        x: (MAP_WIDTH - (right - left) * scale) / 2 - left * scale,
        y: (MAP_HEIGHT - (bottom - top) * scale) / 2 - top * scale,
    };

    function worldPoint(event: PointerEvent<SVGSVGElement>, mapping: Projection) {
        const bounds = event.currentTarget.getBoundingClientRect();
        return {
            x: ((event.clientX - bounds.left) * MAP_WIDTH / bounds.width - mapping.x) / mapping.scale,
            y: ((event.clientY - bounds.top) * MAP_HEIGHT / bounds.height - mapping.y) / mapping.scale,
        };
    }
    function navigate(event: PointerEvent<SVGSVGElement>) {
        const current = gesture.current;
        if (!current || current.pointerId !== event.pointerId) return;
        const point = worldPoint(event, current.projection);
        onNavigate(point.x + current.offsetX, point.y + current.offsetY);
    }
    function finish() {
        gesture.current = null;
        setFrozenProjection(null);
    }

    return <aside className="canvas-minimap" aria-label="Canvas overview" data-ui onPointerDown={event => event.stopPropagation()} onKeyDown={event => event.stopPropagation()}>
        <svg
            className="minimap-map"
            viewBox={`0 0 ${MAP_WIDTH} ${MAP_HEIGHT}`}
            role="group"
            tabIndex={0}
            aria-label="Canvas minimap. Click or drag to navigate, or use arrow keys."
            onPointerDown={event => {
                if (event.button !== 0) return;
                event.preventDefault();
                event.currentTarget.focus();
                const point = worldPoint(event, projection);
                const inside = point.x >= visible.x && point.x <= visible.x + visible.width && point.y >= visible.y && point.y <= visible.y + visible.height;
                gesture.current = {
                    pointerId: event.pointerId,
                    projection,
                    offsetX: inside ? visible.x + visible.width / 2 - point.x : 0,
                    offsetY: inside ? visible.y + visible.height / 2 - point.y : 0,
                };
                setFrozenProjection(projection);
                event.currentTarget.setPointerCapture(event.pointerId);
                navigate(event);
            }}
            onPointerMove={navigate}
            onPointerUp={event => {
                if (gesture.current?.pointerId !== event.pointerId) return;
                navigate(event);
                finish();
                event.currentTarget.releasePointerCapture(event.pointerId);
            }}
            onPointerCancel={finish}
            onLostPointerCapture={finish}
            onKeyDown={event => {
                const directions: Record<string, [number, number]> = { ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, -1], ArrowDown: [0, 1] };
                const direction = directions[event.key];
                if (!direction) return;
                event.preventDefault();
                onNavigate(visible.x + visible.width / 2 + direction[0] * visible.width * .15, visible.y + visible.height / 2 + direction[1] * visible.height * .15);
            }}
        >
            {screens.map(screen => <rect key={screen.id} className={`minimap-screen ${selected === screen.id ? 'is-selected' : ''}`} x={screen.x * projection.scale + projection.x} y={screen.y * projection.scale + projection.y} width={screen.width * projection.scale} height={(screen.height + 84) * projection.scale} rx={2}><title>{screen.title}</title></rect>)}
            <rect className="minimap-viewport" x={visible.x * projection.scale + projection.x} y={visible.y * projection.scale + projection.y} width={visible.width * projection.scale} height={visible.height * projection.scale} rx={3} />
        </svg>
    </aside>;
}
