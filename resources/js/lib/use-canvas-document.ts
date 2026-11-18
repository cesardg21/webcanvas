import type { Project } from '@/types';
import { useCallback, useEffect, useRef, useState } from 'react';
import {
    canvasContent,
    projectSnapshot,
    type CanvasContent,
    type CanvasSnapshot,
    type HistoryDirection,
} from './canvas-types';
import { CanvasHistory } from './history';
import { getProject, saveProject } from './project-api';

type Options = {
    isBusy: () => boolean;
    historyGroup: () => string | undefined;
    onRemoteApplied: () => void;
};

export function useCanvasDocument(project: Project, options: Options) {
    const projectId = project.id;
    const callbacks = useRef(options);
    useEffect(() => {
        callbacks.current = options;
    });
    const [state, setState] = useState<CanvasSnapshot>(() => projectSnapshot(project));
    const latest = useRef(state);
    const history = useRef(new CanvasHistory<CanvasContent>());
    const [historyStatus, setHistoryStatus] = useState({ canUndo: false, canRedo: false });
    const revision = useRef(project.revision);
    const conflict = useRef(false);
    const [hasConflict, setHasConflict] = useState(false);
    const persisted = useRef(JSON.stringify(state));
    const inFlight = useRef<Promise<boolean> | null>(null);
    const [saveStatus, setSaveStatus] = useState('All changes saved');
    const update = useCallback(
        (change: (previous: CanvasSnapshot) => CanvasSnapshot, group?: string) => {
            const previous = latest.current;
            const next = change(previous);
            history.current.record(
                canvasContent(previous),
                canvasContent(next),
                group ?? callbacks.current.historyGroup(),
            );
            setHistoryStatus({
                canUndo: history.current.canUndo,
                canRedo: history.current.canRedo,
            });
            latest.current = next;
            setState(next);
            setSaveStatus('Unsaved changes');
        },
        [],
    );
    const restore = useCallback((direction: HistoryDirection) => {
        const content = history.current[direction]();
        if (!content) return;
        const next = { ...latest.current, ...content };
        latest.current = next;
        setState(next);
        setSaveStatus('Unsaved changes');
        setHistoryStatus({ canUndo: history.current.canUndo, canRedo: history.current.canRedo });
        return next;
    }, []);
    const save = useCallback(async (): Promise<boolean> => {
        if (inFlight.current) {
            if (!(await inFlight.current)) return false;
        }
        if (conflict.current) return false;
        const snapshot = latest.current;
        const body = JSON.stringify(snapshot);
        if (body === persisted.current) return true;
        setSaveStatus('Saving…');
        const request = (async () => {
            try {
                const result = await saveProject(projectId, snapshot, revision.current);
                if (!result.saved) {
                    conflict.current = true;
                    setHasConflict(true);
                    setSaveStatus('Changed elsewhere · local edits not saved');
                    return false;
                }
                revision.current = result.revision;
                persisted.current = body;
                setSaveStatus(
                    JSON.stringify(latest.current) === body
                        ? 'All changes saved'
                        : 'Unsaved changes',
                );
                return true;
            } catch {
                setSaveStatus('Save failed · click to retry');
                return false;
            }
        })();
        inFlight.current = request;
        const result = await request;
        if (inFlight.current === request) inFlight.current = null;
        return result;
    }, [projectId]);
    const applyRemoteProject = useCallback((remote: Project) => {
        const next = projectSnapshot(remote);
        latest.current = next;
        persisted.current = JSON.stringify(next);
        revision.current = remote.revision;
        conflict.current = false;
        setHasConflict(false);
        setState(next);
        setSaveStatus('All changes saved');
        history.current.clear();
        setHistoryStatus({ canUndo: false, canRedo: false });
        callbacks.current.onRemoteApplied();
    }, []);
    async function loadLatestProject() {
        try {
            applyRemoteProject(await getProject(projectId));
        } catch {
            setSaveStatus('Could not load latest canvas. Please try again.');
        }
    }
    useEffect(() => {
        let stopped = false;
        let polling = false;
        const idle = () =>
            !conflict.current &&
            !inFlight.current &&
            !callbacks.current.isBusy() &&
            JSON.stringify(latest.current) === persisted.current &&
            !document.activeElement?.matches('input, textarea, select, [contenteditable]');
        const poll = async () => {
            if (polling || document.hidden || !idle()) return;
            polling = true;
            const startingRevision = revision.current;
            try {
                const remote = await getProject(projectId);
                if (
                    !stopped &&
                    idle() &&
                    revision.current === startingRevision &&
                    remote.revision > startingRevision
                )
                    applyRemoteProject(remote);
            } catch {
                /* A later poll retries when the server is reachable. */
            } finally {
                polling = false;
            }
        };
        const timer = setInterval(() => void poll(), 2000);
        return () => {
            stopped = true;
            clearInterval(timer);
        };
    }, [projectId, applyRemoteProject]);
    useEffect(() => {
        const timer = setTimeout(() => void save(), 500);
        return () => clearTimeout(timer);
    }, [state, save]);
    useEffect(() => {
        const beforeUnload = (e: BeforeUnloadEvent) => {
            if (JSON.stringify(latest.current) !== persisted.current) {
                e.preventDefault();
            }
        };
        window.addEventListener('beforeunload', beforeUnload);
        return () => window.removeEventListener('beforeunload', beforeUnload);
    }, []);
    const breakHistoryGroup = useCallback(() => history.current.breakGroup(), []);
    return {
        state,
        latest,
        update,
        restore,
        historyStatus,
        breakHistoryGroup,
        save,
        saveStatus,
        hasConflict,
        loadLatestProject,
    };
}
