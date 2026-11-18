import type { Screen, Viewport } from '@/types';

// Groups use a stable hub so N screens need only N−1 connections.
export function ScreenConnections({
    screens,
    viewport,
}: {
    screens: Screen[];
    viewport: Viewport;
}) {
    const groups = new Map<string, Screen[]>();
    for (const screen of screens) {
        if (!screen.linkGroup) continue;
        const members = groups.get(screen.linkGroup) ?? [];
        members.push(screen);
        groups.set(screen.linkGroup, members);
    }
    const point = (x: number, y: number) => ({
        x: x * viewport.zoom + viewport.x,
        y: y * viewport.zoom + viewport.y,
    });
    return (
        <svg className="screen-connections" aria-hidden="true">
            {[...groups.entries()].flatMap(([group, members]) => {
                const source = members[0];
                return members.slice(1).map((target) => {
                    const sourceCenter = {
                        x: source.x + source.width / 2,
                        y: source.y + (source.height + 84) / 2,
                    };
                    const targetCenter = {
                        x: target.x + target.width / 2,
                        y: target.y + (target.height + 84) / 2,
                    };
                    const horizontal =
                        Math.abs(targetCenter.x - sourceCenter.x) >=
                        Math.abs(targetCenter.y - sourceCenter.y);
                    const direction =
                        (horizontal
                            ? targetCenter.x - sourceCenter.x
                            : targetCenter.y - sourceCenter.y) >= 0
                            ? 1
                            : -1;
                    const start = horizontal
                        ? point(sourceCenter.x + (direction * source.width) / 2, sourceCenter.y)
                        : point(
                              sourceCenter.x,
                              sourceCenter.y + (direction * (source.height + 84)) / 2,
                          );
                    const end = horizontal
                        ? point(targetCenter.x - (direction * target.width) / 2, targetCenter.y)
                        : point(
                              targetCenter.x,
                              targetCenter.y - (direction * (target.height + 84)) / 2,
                          );
                    const bend = Math.max(
                        30,
                        Math.abs(horizontal ? end.x - start.x : end.y - start.y) / 2,
                    );
                    const path = horizontal
                        ? `M ${start.x} ${start.y} C ${start.x + direction * bend} ${start.y}, ${end.x - direction * bend} ${end.y}, ${end.x} ${end.y}`
                        : `M ${start.x} ${start.y} C ${start.x} ${start.y + direction * bend}, ${end.x} ${end.y - direction * bend}, ${end.x} ${end.y}`;
                    return (
                        <g key={`${group}-${target.id}`}>
                            <path d={path} />
                            <circle cx={start.x} cy={start.y} r={3} />
                            <circle cx={end.x} cy={end.y} r={3} />
                        </g>
                    );
                });
            })}
        </svg>
    );
}
