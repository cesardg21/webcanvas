import type { Screen } from '@/types';

export const screenPresets = [
    { id: 'xs', label: 'XS · Phone', width: 375, height: 812 },
    { id: 'sm', label: 'Small', width: 640, height: 900 },
    { id: 'md', label: 'Medium · Tablet', width: 768, height: 1024 },
    { id: 'lg', label: 'Large · Laptop', width: 1024, height: 768 },
    { id: 'xl', label: 'X-Large · Desktop', width: 1440, height: 900 },
    { id: '2xl', label: '2X-Large · Wide', width: 1920, height: 1080 },
] as const;
export type ScreenPreset = (typeof screenPresets)[number];
export const defaultScreenPreset = screenPresets[4];

export function changeScreenUrl(screens: Screen[], id: string, url: string): Screen[] {
    const source = screens.find((screen) => screen.id === id);
    if (!source) return screens;
    return screens.map((screen) =>
        screen.id === id || (source.linkGroup && screen.linkGroup === source.linkGroup)
            ? { ...screen, url, title: url ? new URL(url).hostname : screen.title }
            : screen,
    );
}

export function linkScreens(
    screens: Screen[],
    sourceId: string,
    targetId: string,
    groupId: string,
): Screen[] {
    const target = screens.find((screen) => screen.id === targetId);
    if (!target || sourceId === targetId || !screens.some((screen) => screen.id === sourceId))
        return screens;
    const linkGroup = target.linkGroup || groupId;
    return screens.map((screen) =>
        screen.id === sourceId || screen.id === targetId
            ? {
                  ...screen,
                  linkGroup,
                  url: target.url,
                  title: target.url ? new URL(target.url).hostname : screen.title,
              }
            : screen,
    );
}

export function linkTargets(screens: Screen[], source: Screen): Screen[] {
    return screens.filter(
        (candidate) =>
            candidate.id !== source.id &&
            (!source.linkGroup || candidate.linkGroup !== source.linkGroup),
    );
}
