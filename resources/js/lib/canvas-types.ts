import type { CanvasItem, Project } from '@/types';
export type Point = { x: number; y: number };
export type CanvasSnapshot = Pick<Project, 'name' | 'screens' | 'viewport' | 'display_settings'> & {
    items: CanvasItem[];
};
export type CanvasContent = Pick<CanvasSnapshot, 'name' | 'screens' | 'items'>;
export type CanvasTool = 'select' | 'hand';
export type UploadedImage = { src: string; width: number; height: number };
export type HistoryDirection = 'undo' | 'redo';
export type HistoryStatus = { canUndo: boolean; canRedo: boolean };
export const canvasContent = ({ name, screens, items }: CanvasSnapshot): CanvasContent => ({
    name,
    screens,
    items,
});
export const projectSnapshot = (project: Project): CanvasSnapshot => ({
    name: project.name,
    screens: project.screens,
    items: project.items ?? [],
    viewport: project.viewport,
    display_settings: project.display_settings,
});
