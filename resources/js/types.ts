export type Screen = { id: string; title: string; url: string; x: number; y: number; width: number; height: number; linkGroup?: string | null };
export type Viewport = { x: number; y: number; zoom: number };
export type Project = { id: number; name: string; screens: Screen[]; viewport: Viewport; updated_at: string };
