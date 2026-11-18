import type { Viewport } from '@/types';
import { useCallback, useEffect, useRef, useState } from 'react';
import type { Point, UploadedImage } from './canvas-types';
import { uploadProjectImage } from './project-api';

type Options = {
    projectId: number;
    itemCount: () => number;
    viewport: () => Viewport;
    bounds: () => { left: number; top: number };
    onImage: (image: UploadedImage, position?: Point) => void;
};

export function useCanvasImages({ projectId, ...options }: Options) {
    const callbacks = useRef(options);
    useEffect(() => {
        callbacks.current = options;
    });
    const imageInput = useRef<HTMLInputElement>(null);
    const [uploading, setUploading] = useState(false);
    const uploadBusy = useRef(false);
    const dragDepth = useRef(0);
    const [droppingImages, setDroppingImages] = useState(false);
    const [uploadError, setUploadError] = useState('');
    const uploadImages = useCallback(
        async (files: File[], position?: Point) => {
            if (uploadBusy.current) {
                setUploadError('Wait for the current images to finish uploading, then drop again.');
                return;
            }
            uploadBusy.current = true;
            setUploadError('');
            setUploading(true);
            const errors: string[] = [];
            try {
                for (const [index, file] of files.entries()) {
                    if (callbacks.current.itemCount() >= 200) {
                        errors.push('This canvas has reached its 200-item limit.');
                        break;
                    }
                    if (
                        !['image/png', 'image/jpeg', 'image/gif', 'image/webp'].includes(file.type)
                    ) {
                        errors.push(`${file.name}: choose PNG, JPG, GIF, or WebP.`);
                        continue;
                    }
                    if (file.size > 10 * 1024 * 1024) {
                        errors.push(`${file.name}: choose an image smaller than 10 MB.`);
                        continue;
                    }
                    try {
                        const result = await uploadProjectImage(projectId, file);
                        callbacks.current.onImage(
                            result,
                            position
                                ? { x: position.x + index * 32, y: position.y + index * 32 }
                                : undefined,
                        );
                    } catch (error) {
                        errors.push(
                            `${file.name}: ${error instanceof Error ? error.message : 'Image upload failed. Please try again.'}`,
                        );
                    }
                }
            } finally {
                uploadBusy.current = false;
                setUploading(false);
                if (errors.length) setUploadError(errors.join(' '));
            }
        },
        [projectId],
    );
    useEffect(() => {
        const isFileDrag = (event: DragEvent) => event.dataTransfer?.types.includes('Files');
        const enter = (event: DragEvent) => {
            if (!isFileDrag(event)) return;
            event.preventDefault();
            dragDepth.current += 1;
            setDroppingImages(true);
        };
        const over = (event: DragEvent) => {
            if (!isFileDrag(event)) return;
            event.preventDefault();
            if (event.dataTransfer) event.dataTransfer.dropEffect = 'copy';
        };
        const leave = (event: DragEvent) => {
            if (!isFileDrag(event)) return;
            dragDepth.current = Math.max(0, dragDepth.current - 1);
            if (!dragDepth.current) setDroppingImages(false);
        };
        const reset = () => {
            dragDepth.current = 0;
            setDroppingImages(false);
        };
        const drop = (event: DragEvent) => {
            if (!isFileDrag(event)) return;
            event.preventDefault();
            reset();
            const viewport = callbacks.current.viewport();
            const bounds = callbacks.current.bounds();
            const position = {
                x: (event.clientX - bounds.left - viewport.x) / viewport.zoom,
                y: (event.clientY - bounds.top - viewport.y) / viewport.zoom,
            };
            void uploadImages(Array.from(event.dataTransfer?.files ?? []), position);
        };
        const paste = (event: ClipboardEvent) => {
            const target = event.target;
            if (
                event.defaultPrevented ||
                (target instanceof HTMLElement &&
                    (target.isContentEditable ||
                        target.closest(
                            'input, textarea, select, [role="textbox"], [role="dialog"]',
                        )))
            )
                return;
            const images = Array.from(event.clipboardData?.items ?? [])
                .filter((item) => item.kind === 'file' && item.type.startsWith('image/'))
                .map((item) => item.getAsFile())
                .filter((file): file is File => file !== null);
            if (!images.length) return;
            event.preventDefault();
            void uploadImages(images);
        };
        window.addEventListener('paste', paste);
        window.addEventListener('dragenter', enter);
        window.addEventListener('dragover', over);
        window.addEventListener('dragleave', leave);
        window.addEventListener('drop', drop);
        window.addEventListener('dragend', reset);
        window.addEventListener('blur', reset);
        return () => {
            window.removeEventListener('paste', paste);
            window.removeEventListener('dragenter', enter);
            window.removeEventListener('dragover', over);
            window.removeEventListener('dragleave', leave);
            window.removeEventListener('drop', drop);
            window.removeEventListener('dragend', reset);
            window.removeEventListener('blur', reset);
        };
    }, [uploadImages]);
    return {
        imageInput,
        uploading,
        droppingImages,
        uploadError,
        clearUploadError: () => setUploadError(''),
        uploadImages,
    };
}
