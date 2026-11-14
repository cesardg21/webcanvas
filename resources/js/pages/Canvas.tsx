import { Head, router } from '@inertiajs/react';
import { useCallback, useEffect, useRef, useState, type PointerEvent as ReactPointerEvent } from 'react';
import { ArrowLeft, Plus, MousePointer2, Hand, Minus, Maximize, Monitor, Copy, ExternalLink, RotateCw, Globe, X, Check, PanelsTopLeft, MoveUpRight, HelpCircle, Link2, Unlink, Grid2X2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { AddScreenMenu } from '@/components/add-screen-menu';
import { changeScreenUrl, linkScreens, defaultScreenPreset, type ScreenPreset } from '@/lib/screens';
import { CanvasMinimap } from '@/components/canvas-minimap';
import { CanvasQuickMenu } from '@/components/canvas-quick-menu';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { clamp, fitViewport, normalizeUrl } from '@/lib/canvas';
import type { Project, Screen } from '@/types';

type Snapshot = Pick<Project, 'name' | 'screens' | 'viewport'>;
export default function Canvas({ project }: { project: Project }) {
    const [state, setState] = useState<Snapshot>({ name: project.name, screens: project.screens, viewport: project.viewport });
    const latest = useRef(state);
    const persisted = useRef(JSON.stringify(state));
    const inFlight = useRef<Promise<boolean> | null>(null);
    const [saveStatus, setSaveStatus] = useState('All changes saved');
    const [selected, setSelected] = useState<string | null>(null);
    const [showDots, setShowDots] = useState(true);
    const [tool, setTool] = useState<'select' | 'hand'>('select');
    const [space, setSpace] = useState(false);
    const [dragging, setDragging] = useState(false);
    const [linkingId, setLinkingId] = useState<string | null>(null);
    const [existingTarget, setExistingTarget] = useState('');
    const [help, setHelp] = useState(false);
    const [reloads, setReloads] = useState<Record<string, number>>({});
    const [interacting, setInteracting] = useState<string | null>(null);
    const stage = useRef<HTMLDivElement>(null);
    const gesture = useRef<{ kind: 'pan' | 'move' | 'resize'; id?: string; startX: number; startY: number; snapshot: Snapshot } | null>(null);
    const update = useCallback((fn: (old: Snapshot) => Snapshot) => {
        const next = fn(latest.current); latest.current = next; setState(next); setSaveStatus('Unsaved changes');
    }, []);
    const save = useCallback(async (): Promise<boolean> => {
        if (inFlight.current) { if (!await inFlight.current) return false; }
        const body = JSON.stringify(latest.current);
        if (body === persisted.current) return true;
        setSaveStatus('Saving…');
        const request = (async () => {
            try {
                const response = await fetch(`/projects/${project.id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json', Accept: 'application/json', 'X-CSRF-TOKEN': document.querySelector<HTMLMetaElement>('meta[name="csrf-token"]')!.content }, body });
                if (!response.ok) throw new Error('Save failed');
                persisted.current = body;
                setSaveStatus(JSON.stringify(latest.current) === body ? 'All changes saved' : 'Unsaved changes');
                return true;
            } catch { setSaveStatus('Save failed · click to retry'); return false; }
        })();
        inFlight.current = request;
        const result = await request;
        if (inFlight.current === request) inFlight.current = null;
        return result;
    }, [project.id]);
    useEffect(() => { const timer = setTimeout(() => void save(), 500); return () => clearTimeout(timer); }, [state, save]);
    useEffect(() => {
        const beforeUnload = (e: BeforeUnloadEvent) => { if (JSON.stringify(latest.current) !== persisted.current) { e.preventDefault(); } };
        window.addEventListener('beforeunload', beforeUnload);
        return () => window.removeEventListener('beforeunload', beforeUnload);
    }, []);
    const zoomTo = useCallback((value: number, point?: { x: number; y: number }) => update(old => {
        const zoom = clamp(value, .1, 2), p = point ?? { x: window.innerWidth / 2, y: window.innerHeight / 2 };
        return { ...old, viewport: { zoom, x: p.x - (p.x - old.viewport.x) * zoom / old.viewport.zoom, y: p.y - (p.y - old.viewport.y) * zoom / old.viewport.zoom } };
    }), [update]);
    const fit = useCallback(() => update(old => ({ ...old, viewport: fitViewport(old.screens, window.innerWidth, window.innerHeight) })), [update]);
    useEffect(() => {
        const down = (e: KeyboardEvent) => {
            if ((e.target as HTMLElement).closest('input, textarea, [contenteditable], [role="dialog"], [role="menu"], select')) return;
            if (e.code === 'Space') { e.preventDefault(); setSpace(true); }
            if (e.key === 'Escape') { setInteracting(null); setSelected(null); }
            if (e.key.toLowerCase() === 'v') setTool('select');
            if (e.key.toLowerCase() === 'h') setTool('hand');
            if (e.key === '1') zoomTo(1);
            if (e.key === '0') fit();
            if (e.key === '+' || e.key === '=') zoomTo(latest.current.viewport.zoom * 1.2);
            if (e.key === '-') zoomTo(latest.current.viewport.zoom / 1.2);
        };
        const up = (e: KeyboardEvent) => { if (e.code === 'Space') setSpace(false); };
        const blur = () => { setSpace(false); setDragging(false); gesture.current = null; };
        window.addEventListener('keydown', down); window.addEventListener('keyup', up); window.addEventListener('blur', blur);
        return () => { window.removeEventListener('keydown', down); window.removeEventListener('keyup', up); window.removeEventListener('blur', blur); };
    }, [fit, zoomTo]);
    useEffect(() => {
        const element = stage.current!;
        const wheel = (e: WheelEvent) => {
            if ((e.target as HTMLElement).closest('[data-ui]')) return;
            e.preventDefault();
            if (e.ctrlKey || e.metaKey) zoomTo(latest.current.viewport.zoom * Math.exp(-e.deltaY * .008), { x: e.clientX, y: e.clientY });
            else update(old => ({ ...old, viewport: { ...old.viewport, x: old.viewport.x - e.deltaX, y: old.viewport.y - e.deltaY } }));
        };
        element.addEventListener('wheel', wheel, { passive: false });
        return () => element.removeEventListener('wheel', wheel);
    }, [update, zoomTo]);
    function start(e: ReactPointerEvent, kind: 'pan' | 'move' | 'resize', id?: string) {
        if (e.button !== 0 && e.button !== 1) return;
        e.preventDefault(); e.stopPropagation(); setInteracting(null);
        gesture.current = { kind, id, startX: e.clientX, startY: e.clientY, snapshot: latest.current };
        e.currentTarget.setPointerCapture(e.pointerId); setDragging(true); if (id) setSelected(id);
    }
    function move(e: ReactPointerEvent) {
        const g = gesture.current; if (!g) return;
        const dx = e.clientX - g.startX, dy = e.clientY - g.startY, v = g.snapshot.viewport;
        if (g.kind === 'pan') update(old => ({ ...old, viewport: { ...v, x: v.x + dx, y: v.y + dy } }));
        else {
            const original = g.snapshot.screens.find(s => s.id === g.id)!;
            update(old => ({ ...old, screens: old.screens.map(s => s.id !== g.id ? s : { ...s, ...(g.kind === 'move' ? { x: original.x + dx / v.zoom, y: original.y + dy / v.zoom } : { width: Math.round(clamp(original.width + dx / v.zoom, 320, 3840)), height: Math.round(clamp(original.height + dy / v.zoom, 240, 2160)) }) }) }));
        }
    }
    function setScreenUrl(id: string, url: string) {
        update(old => ({ ...old, screens: changeScreenUrl(old.screens, id, url) }));
    }
    function addScreen(size: ScreenPreset = defaultScreenPreset) {
        if (latest.current.screens.length >= 100) return;
        const viewport = latest.current.viewport;
        const screen: Screen = {
            id: crypto.randomUUID(), title: `Screen ${latest.current.screens.length + 1}`, url: '',
            width: size.width, height: size.height,
            x: (window.innerWidth / 2 - viewport.x) / viewport.zoom - size.width / 2,
            y: (window.innerHeight / 2 - viewport.y) / viewport.zoom - size.height / 2,
        };
        update(old => ({ ...old, screens: [...old.screens, screen] }));
        setSelected(screen.id);
        setInteracting(null);
    }
    const { viewport: v, screens } = state;
    const panning = tool === 'hand' || space;
    const linkingScreen = screens.find(screen => screen.id === linkingId);
    const linkedCount = (screen: Screen) => screen.linkGroup ? screens.filter(other => other.linkGroup === screen.linkGroup).length : 0;
    const changeTool = (tool: 'select' | 'hand') => { setTool(tool); setInteracting(null); };
    const backToProjects = async () => { if (await save()) router.visit('/'); };
    return <CanvasQuickMenu tool={tool} zoom={v.zoom} canAddScreen={screens.length < 100} onAddScreen={() => addScreen()} onToolChange={changeTool} onZoom={zoomTo} onFit={fit} onBack={() => void backToProjects()}><div ref={stage} className={`canvas ${panning ? 'hand-mode' : ''} ${dragging ? 'is-dragging' : ''}`} style={{ backgroundImage: showDots ? undefined : 'none', backgroundSize: `${24 * v.zoom}px ${24 * v.zoom}px`, backgroundPosition: `${v.x}px ${v.y}px` }} onPointerDown={e => { if (e.button !== 2 && (e.target === stage.current || panning || e.button === 1)) { setSelected(null); start(e, 'pan'); } }} onPointerMove={move} onPointerUp={() => { gesture.current = null; setDragging(false); }} onPointerCancel={() => { gesture.current = null; setDragging(false); }}>
        <Head title={state.name} />
        <nav className="canvas-toolbar" aria-label="Canvas tools" data-ui onPointerDown={e => e.stopPropagation()}>
            <div className="toolbar-project-group">
            <Button variant="ghost" size="icon" title="Back to projects" aria-label="Back to projects" onClick={backToProjects}><ArrowLeft /></Button><span className="divider" />
        <div className="canvas-project toolbar-project" data-ui onPointerDown={e => e.stopPropagation()}><span className="brand-icon"><PanelsTopLeft size={20} /></span><div><input aria-label="Project name" value={state.name} maxLength={120} onChange={e => update(old => ({ ...old, name: e.target.value }))} onBlur={() => { if (!latest.current.name.trim()) update(old => ({ ...old, name: project.name })); }} /><button className={`save-status ${saveStatus.startsWith('Save failed') ? 'error' : ''}`} onClick={() => void save()}>{saveStatus === 'All changes saved' && <Check size={11} />}{saveStatus}</button></div></div>
            </div><span className="divider project-divider" />
            <Button variant="ghost" size="icon" className={tool === 'select' ? 'active-tool' : ''} title="Select (V)" aria-label="Select tool" onClick={() => changeTool('select')}><MousePointer2 /></Button>
            <Button variant="ghost" size="icon" className={tool === 'hand' ? 'active-tool' : ''} title="Pan (H or hold Space)" aria-label="Pan tool" onClick={() => changeTool('hand')}><Hand /></Button><span className="divider" />
            <AddScreenMenu disabled={screens.length >= 100} onChoose={addScreen} /><span className="divider" />
            <Button variant="ghost" size="icon" aria-label="Zoom out" onClick={() => zoomTo(v.zoom / 1.2)}><Minus /></Button><button className="zoom-value" title="Reset to 100%" onClick={() => zoomTo(1)}>{Math.round(v.zoom * 100)}%</button><Button variant="ghost" size="icon" aria-label="Zoom in" onClick={() => zoomTo(v.zoom * 1.2)}><Plus /></Button><Button variant="ghost" size="icon" title="Fit all screens (0)" aria-label="Fit all screens" onClick={fit}><Maximize /></Button>
            <span className="divider" /><Button variant="ghost" size="icon" aria-label={showDots ? 'Hide dot background' : 'Show dot background'} title={showDots ? 'Hide dot background' : 'Show dot background'} aria-pressed={showDots} className={showDots ? 'active-tool' : ''} onClick={() => setShowDots(value => !value)}><Grid2X2 /></Button>
        </nav>
        {!screens.length && <div className="canvas-empty" data-ui onPointerDown={e => e.stopPropagation()}><div className="empty-icon"><PanelsTopLeft size={36} /></div><span className="eyebrow">YOUR IDEAS, WITHOUT EDGES</span><h1>Give your tabs some space.</h1><p>Add your first screen and start exploring.<br />An entire web, on your canvas.</p><Button onClick={() => addScreen()}><Plus size={16} /> Add your first screen</Button><small>Desktop size by default. Resize to make it yours.</small></div>}
        <div className="canvas-world" style={{ transform: `translate(${v.x}px, ${v.y}px) scale(${v.zoom})` }}>
            {screens.map((screen, index) => <section key={screen.id} className={`browser-screen ${selected === screen.id ? 'selected' : ''}`} style={{ left: screen.x, top: screen.y, width: screen.width, zIndex: selected === screen.id ? 1000 : index }} onPointerDown={e => { if (panning || e.button === 1) start(e, 'pan'); else { e.stopPropagation(); setSelected(screen.id); } }}>
                <div className="screen-label" onPointerDown={e => start(e, panning ? 'pan' : 'move', screen.id)}><span><Monitor size={17} /> {screen.title}{linkedCount(screen) > 1 && <span className="linked-badge"><Link2 size={13} /> {linkedCount(screen)} linked</span>}</span><span>{screen.width} × {screen.height}</span></div>
                <div className="browser-chrome" onPointerDown={e => { if (!(e.target as HTMLElement).closest('input,button,a')) start(e, panning ? 'pan' : 'move', screen.id); }}><span className="traffic-lights"><i /><i /><i /></span><button aria-label={`Reload ${screen.title}`} onClick={() => setReloads(old => ({ ...old, [screen.id]: (old[screen.id] ?? 0) + 1 }))}><RotateCw size={17} /></button><form className="address-bar" onSubmit={e => { e.preventDefault(); const input = e.currentTarget.elements.namedItem('url') as HTMLInputElement; try { const url = normalizeUrl(input.value); input.setCustomValidity(''); setScreenUrl(screen.id, url); setInteracting(null); } catch { input.setCustomValidity('Enter an http:// or https:// address.'); input.reportValidity(); } }}><Globe size={15} /><input key={screen.url} name="url" aria-label={`URL for ${screen.title}`} defaultValue={screen.url} placeholder="Enter a website URL…" onChange={e => e.target.setCustomValidity('')} /><button type="submit" aria-label="Load URL"><MoveUpRight size={15} /></button></form>
                    <button title="Manage linked screens" aria-label={`Link screens for ${screen.title}`} className={linkedCount(screen) > 1 ? 'linked-control' : ''} onClick={() => { setLinkingId(screen.id); setExistingTarget(''); }}><Link2 size={17} /></button>
                    <button title="Duplicate screen" aria-label={`Duplicate ${screen.title}`} disabled={screens.length >= 100} onClick={() => { const copy = { ...screen, id: crypto.randomUUID(), x: screen.x + 80, y: screen.y + 80 }; update(old => ({ ...old, screens: [...old.screens, copy] })); setSelected(copy.id); }}><Copy size={17} /></button>
                    {screen.url && <a href={screen.url} target="_blank" rel="noreferrer" title="Open in new tab" aria-label={`Open ${screen.title} in new tab`}><ExternalLink size={17} /></a>}
                    <button aria-label={`Delete ${screen.title}`} onClick={() => update(old => ({ ...old, screens: old.screens.filter(s => s.id !== screen.id) }))}><X size={18} /></button>
                </div>
                <div className="browser-body" style={{ height: screen.height }}>
                    {screen.url ? <><iframe key={`${screen.url}-${reloads[screen.id] ?? 0}`} src={screen.url} title={screen.title} sandbox="allow-scripts allow-same-origin allow-forms allow-popups allow-popups-to-escape-sandbox" referrerPolicy="no-referrer" style={{ pointerEvents: interacting === screen.id && !panning && !dragging ? 'auto' : 'none' }} />{interacting !== screen.id && <div className="screen-shield" onDoubleClick={() => { setInteracting(screen.id); setTool('select'); }} onPointerDown={e => start(e, panning ? 'pan' : 'move', screen.id)}><button onPointerDown={e => e.stopPropagation()} onClick={() => { setInteracting(screen.id); setTool('select'); }}><MousePointer2 size={16} /> Interact with website</button></div>}</> : <div className="blank-screen" onPointerDown={e => start(e, panning ? 'pan' : 'move', screen.id)}><Globe size={50} /><h2>Your next destination.</h2><p>Enter a web address above to load a page here.</p></div>}
                </div>
                <div className="screen-footer"><span>{interacting === screen.id ? 'Interacting · click canvas to finish' : 'Drag to move · double-click to interact'}</span><span>Page not showing? Some sites block embedding. {screen.url && <a href={screen.url} target="_blank" rel="noreferrer">Open in new tab ↗</a>}</span></div>
                <button className="resize-handle" aria-label={`Resize ${screen.title}`} title="Drag to resize" onPointerDown={e => start(e, 'resize', screen.id)}><MoveUpRight size={18} /></button>
            </section>)}
        </div>
        <CanvasMinimap screens={screens} viewport={v} selected={selected} onNavigate={(centerX, centerY) => {
            setInteracting(null);
            update(old => ({ ...old, viewport: { ...old.viewport, x: clamp(window.innerWidth / 2 - centerX * old.viewport.zoom, -1000000, 1000000), y: clamp(window.innerHeight / 2 - centerY * old.viewport.zoom, -1000000, 1000000) } }));
        }} />
        <div className="canvas-bottom" data-ui><span><span className="status-dot" />{screens.length} {screens.length === 1 ? 'screen' : 'screens'} <span className="bottom-divider">/</span> Infinite possibilities</span><span>Hold <kbd>space</kbd> to pan <span className="bottom-divider">·</span> <kbd>⌘ / ctrl</kbd> + scroll to zoom <Button variant="ghost" size="icon" aria-label="Canvas help" onClick={() => setHelp(true)}><HelpCircle size={17} /></Button></span></div>
        <Dialog open={!!linkingScreen} onOpenChange={open => { if (!open) setLinkingId(null); }}><DialogContent><DialogHeader><DialogTitle>Link screens</DialogTitle><DialogDescription>Share a website address across screens. Each screen keeps its own size and position. Links clicked inside a website stay independent.</DialogDescription></DialogHeader>
            {linkingScreen && <div className="dialog-form">
                {linkedCount(linkingScreen) > 1 && <p className="link-note"><Link2 size={15} /> This screen shares its address with {linkedCount(linkingScreen) - 1} other {linkedCount(linkingScreen) === 2 ? 'screen' : 'screens'}.</p>}
                <label htmlFor="existing-link-target">Use the website from</label><select id="existing-link-target" className="canvas-select" value={existingTarget} onChange={event => setExistingTarget(event.target.value)}><option value="">Choose a screen…</option>{screens.filter(screen => screen.id !== linkingScreen.id && (!linkingScreen.linkGroup || screen.linkGroup !== linkingScreen.linkGroup)).map(screen => <option key={screen.id} value={screen.id}>{screen.title} — {screen.width} × {screen.height}</option>)}</select>
                <p className="small-note">Linking replaces this screen’s address with the chosen screen’s address and joins its group.</p>
                <div className="dialog-actions">{linkingScreen.linkGroup && <Button variant="outline" onClick={() => { update(old => ({ ...old, screens: old.screens.map(screen => screen.id === linkingScreen.id ? { ...screen, linkGroup: null } : screen) })); setLinkingId(null); }}><Unlink size={15} /> Unlink this screen</Button>}<Button disabled={!existingTarget} onClick={() => { update(old => ({ ...old, screens: linkScreens(old.screens, linkingScreen.id, existingTarget, crypto.randomUUID()) })); setInteracting(null); setLinkingId(null); }}><Link2 size={15} /> Link screen</Button></div>
            </div>}
        </DialogContent></Dialog>
        <Dialog open={help} onOpenChange={setHelp}><DialogContent><DialogHeader><DialogTitle>A little canvas know-how</DialogTitle><DialogDescription>Your shortcuts to the bigger picture.</DialogDescription></DialogHeader><div className="help-list"><p><span>Select / hand tool</span><kbd>V / H</kbd></p><p><span>Pan canvas</span><kbd>Space + drag</kbd></p><p><span>Zoom in / out</span><kbd>+ / −</kbd></p><p><span>Fit all / actual size</span><kbd>0 / 1</kbd></p><p><span>Use a live website</span><kbd>Double-click screen</kbd></p><p>Drag the corner of a screen to resize it. Changes save automatically to your local database.</p></div></DialogContent></Dialog>
    </div></CanvasQuickMenu>;
}
