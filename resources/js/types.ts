export type Screen = {
    id: string;
    title: string;
    url: string;
    x: number;
    y: number;
    width: number;
    height: number;
    zIndex?: number;
    linkGroup?: string | null;
};
export type Viewport = { x: number; y: number; zoom: number };
export type Project = {
    id: number;
    revision: number;
    name: string;
    screens: Screen[];
    items: CanvasItem[] | null;
    viewport: Viewport;
    updated_at: string;
};

export type CanvasItem = {
    id: string;
    kind: 'note' | 'text' | 'image' | 'square' | 'rectangle' | 'triangle' | 'circle';
    x: number;
    y: number;
    width: number;
    height: number;
    zIndex: number;
    label?: string | null;
    fillStyle?: 'solid' | 'translucent' | 'outline';
    content: string | null;
    color: string;
    filled: boolean;
    fontSize: number;
    src: string | null;
};
export type CanvasBounds = {
    id: string;
    title: string;
    x: number;
    y: number;
    width: number;
    height: number;
};
