import type { Project } from '@/types';
import type { CanvasSnapshot, UploadedImage } from './canvas-types';

function csrfToken(): string {
    const token = document.querySelector<HTMLMetaElement>('meta[name="csrf-token"]')?.content;
    if (!token) throw new Error('Your session is unavailable. Refresh the page and try again.');
    return token;
}

export async function saveProject(
    projectId: number,
    snapshot: CanvasSnapshot,
    revision: number,
): Promise<{ saved: true; revision: number } | { saved: false; conflict: true }> {
    const response = await fetch(`/projects/${projectId}`, {
        method: 'PATCH',
        headers: {
            'Content-Type': 'application/json',
            Accept: 'application/json',
            'X-CSRF-TOKEN': csrfToken(),
        },
        body: JSON.stringify({ ...snapshot, revision }),
    });
    if (response.status === 409) return { saved: false, conflict: true };
    if (!response.ok) throw new Error('Save failed');
    const result: { revision: number } = await response.json();
    return { saved: true, revision: result.revision };
}

export async function getProject(projectId: number): Promise<Project> {
    const response = await fetch(`/projects/${projectId}/state`, {
        headers: { Accept: 'application/json' },
        cache: 'no-store',
    });
    if (!response.ok) throw new Error('Could not load the latest canvas.');
    const result: { project: Project } = await response.json();
    return result.project;
}

export async function uploadProjectImage(projectId: number, file: File): Promise<UploadedImage> {
    const body = new FormData();
    body.append('image', file);
    const response = await fetch(`/projects/${projectId}/images`, {
        method: 'POST',
        headers: { Accept: 'application/json', 'X-CSRF-TOKEN': csrfToken() },
        body,
    });
    const result = await response.json();
    if (!response.ok) throw new Error(result.errors?.image?.[0] ?? 'Could not upload this image.');
    return result as UploadedImage;
}
