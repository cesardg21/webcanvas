import { normalizeUrl } from '@/lib/canvas';
import type { Screen } from '@/types';
import {
    Copy,
    ExternalLink,
    Globe,
    Link2,
    Monitor,
    MousePointer2,
    MoveUpRight,
    RotateCw,
    X,
} from 'lucide-react';
import type { PointerEvent } from 'react';
type Props = {
    screen: Screen;
    layer: number;
    selected: boolean;
    linkTarget: boolean;
    linkedCount: number;
    canDuplicate: boolean;
    reloadVersion: number;
    interacting: boolean;
    panning: boolean;
    dragging: boolean;
    onSelect: (event: PointerEvent) => void;
    onDrag: (event: PointerEvent) => void;
    onResize: (event: PointerEvent) => void;
    onReload: () => void;
    onUrlChange: (url: string) => void;
    onLink: () => void;
    onDuplicate: () => void;
    onDelete: () => void;
    onDoubleClick: () => void;
    onInteract: () => void;
};

export function BrowserScreen({
    screen,
    layer,
    selected,
    linkTarget,
    linkedCount,
    canDuplicate,
    reloadVersion,
    interacting,
    panning,
    dragging,
    onSelect,
    onDrag,
    onResize,
    onReload,
    onUrlChange,
    onLink,
    onDuplicate,
    onDelete,
    onDoubleClick,
    onInteract,
}: Props) {
    return (
        <section
            data-screen-id={screen.id}
            className={`browser-screen ${linkTarget ? 'link-drop-target' : ''} ${selected ? 'selected' : ''}`}
            style={{ left: screen.x, top: screen.y, width: screen.width, zIndex: layer }}
            onPointerDown={onSelect}
        >
            <div
                className="screen-label"
                title="Drag to move · double-click and hold to draw a link"
                onPointerDown={onDrag}
            >
                <span>
                    <Monitor size={17} /> {screen.title}
                    {linkedCount > 1 && (
                        <span className="linked-badge">
                            <Link2 size={13} /> {linkedCount} linked
                        </span>
                    )}
                </span>
                <span>
                    {screen.width} × {screen.height}
                </span>
            </div>
            <div
                className="browser-chrome"
                onPointerDown={(e) => {
                    if (!(e.target as HTMLElement).closest('input,button,a')) onDrag(e);
                }}
            >
                <span className="traffic-lights">
                    <i />
                    <i />
                    <i />
                </span>
                <button aria-label={`Reload ${screen.title}`} onClick={onReload}>
                    <RotateCw size={17} />
                </button>
                <form
                    className="address-bar"
                    onSubmit={(e) => {
                        e.preventDefault();
                        const input = e.currentTarget.elements.namedItem('url') as HTMLInputElement;
                        try {
                            const url = normalizeUrl(input.value);
                            input.setCustomValidity('');
                            onUrlChange(url);
                        } catch {
                            input.setCustomValidity('Enter an http:// or https:// address.');
                            input.reportValidity();
                        }
                    }}
                >
                    <Globe size={15} />
                    <input
                        key={screen.url}
                        name="url"
                        aria-label={`URL for ${screen.title}`}
                        defaultValue={screen.url}
                        placeholder="Enter a website URL…"
                        onChange={(e) => e.target.setCustomValidity('')}
                    />
                    <button type="submit" aria-label="Load URL">
                        <MoveUpRight size={15} />
                    </button>
                </form>
                <button
                    title="Manage linked screens"
                    aria-label={`Link screens for ${screen.title}`}
                    className={linkedCount > 1 ? 'linked-control' : ''}
                    onClick={onLink}
                >
                    <Link2 size={17} />
                </button>
                <button
                    title="Duplicate screen"
                    aria-label={`Duplicate ${screen.title}`}
                    disabled={!canDuplicate}
                    onClick={onDuplicate}
                >
                    <Copy size={17} />
                </button>
                {screen.url && (
                    <a
                        href={screen.url}
                        target="_blank"
                        rel="noreferrer"
                        title="Open in new tab"
                        aria-label={`Open ${screen.title} in new tab`}
                    >
                        <ExternalLink size={17} />
                    </a>
                )}
                <button
                    aria-label={`Delete ${screen.title}`}
                    title="Delete screen"
                    onClick={onDelete}
                >
                    <X size={18} />
                </button>
            </div>
            <div className="browser-body" style={{ height: screen.height }}>
                {screen.url ? (
                    <>
                        <iframe
                            key={`${screen.url}-${reloadVersion}`}
                            src={screen.url}
                            title={screen.title}
                            sandbox="allow-scripts allow-same-origin allow-forms allow-popups allow-popups-to-escape-sandbox"
                            referrerPolicy="no-referrer"
                            style={{
                                pointerEvents:
                                    interacting && !panning && !dragging ? 'auto' : 'none',
                            }}
                        />
                        {!interacting && (
                            <div
                                className="screen-shield"
                                onDoubleClick={onDoubleClick}
                                onPointerDown={onDrag}
                            >
                                <button
                                    onPointerDown={(e) => e.stopPropagation()}
                                    onClick={onInteract}
                                >
                                    <MousePointer2 size={16} /> Interact with website
                                </button>
                            </div>
                        )}
                    </>
                ) : (
                    <div className="blank-screen" onPointerDown={onDrag}>
                        <Globe size={50} />
                        <h2>Your next destination.</h2>
                        <p>Enter a web address above to load a page here.</p>
                    </div>
                )}
            </div>
            <div className="screen-footer">
                <span>
                    {interacting
                        ? 'Interacting · click canvas to finish'
                        : 'Drag to move · double-click to interact · double-click-drag to link'}
                </span>
                <span>
                    Page not showing? Some sites block embedding.{' '}
                    {screen.url && (
                        <a href={screen.url} target="_blank" rel="noreferrer">
                            Open in new tab ↗
                        </a>
                    )}
                </span>
            </div>
            <button
                className="resize-handle"
                aria-label={`Resize ${screen.title}`}
                title="Drag to resize"
                onPointerDown={onResize}
            >
                <MoveUpRight size={18} />
            </button>
        </section>
    );
}
