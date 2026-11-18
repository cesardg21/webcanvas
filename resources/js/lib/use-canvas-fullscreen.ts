import { useCallback, useEffect, useRef, useState } from 'react';

export function useCanvasFullscreen() {
    const [isFullscreen, setIsFullscreen] = useState(false);
    const [supported, setSupported] = useState(false);
    const [error, setError] = useState('');
    const pending = useRef(false);
    const ownsFullscreen = useRef(false);

    useEffect(() => {
        setSupported(document.fullscreenEnabled);
        const synchronize = () => {
            const active = document.fullscreenElement === document.documentElement;
            setIsFullscreen(active);
            if (!active) ownsFullscreen.current = false;
        };
        synchronize();
        document.addEventListener('fullscreenchange', synchronize);
        return () => {
            document.removeEventListener('fullscreenchange', synchronize);
            if (ownsFullscreen.current && document.fullscreenElement === document.documentElement) {
                void document.exitFullscreen().catch(() => {});
            }
        };
    }, []);

    const toggleFullscreen = useCallback(async () => {
        if (pending.current || !document.fullscreenEnabled) return;
        pending.current = true;
        setError('');
        try {
            if (document.fullscreenElement === document.documentElement) {
                await document.exitFullscreen();
            } else {
                // Include body portals so menus, dialogs, and tooltips remain visible.
                await document.documentElement.requestFullscreen();
                ownsFullscreen.current = true;
            }
        } catch {
            setError('Could not change fullscreen mode. Please try again.');
        } finally {
            pending.current = false;
        }
    }, []);

    return { isFullscreen, supported, error, toggleFullscreen, dismissError: () => setError('') };
}
