import { normalizeUrl } from '@/lib/canvas';
import type { Screen } from '@/types';
import { Globe, Link2, Monitor, MousePointer2, MoveUpRight } from 'lucide-react';
import type { PointerEvent } from 'react';
type Props = {
    screen: Screen;
    layer: number;
    selected: boolean;
    linkTarget: boolean;
    linkedCount: number;
    reloadVersion: number;
    interacting: boolean;
    panning: boolean;
    dragging: boolean;
    onSelect: (event: PointerEvent) => void;
    onDrag: (event: PointerEvent) => void;
    onResize: (event: PointerEvent) => void;
    onUrlChange: (url: string) => void;
    onDoubleClick: () => void;
    onInteract: () => void;
};

export function BrowserScreen({
    screen,
    layer,
    selected,
    linkTarget,
    linkedCount,
    reloadVersion,
    interacting,
    panning,
    dragging,
    onSelect,
    onDrag,
    onResize,
    onUrlChange,
    onDoubleClick,
    onInteract,
}: Props) {
    return (
        <section
            data-screen-id={screen.id}
            className={`browser-screen ${linkTarget ? 'link-drop-target' : ''} ${selected ? 'selected' : ''}`}
            style={{ left: screen.x, top: screen.y, width: screen.width, zIndex: layer }}
            onDoubleClick={(event) => {
                if ((event.target as Element).closest('input, button, a')) return;
                onDoubleClick();
            }}
            onPointerDown={onSelect}
        >
            <div
                className="screen-label"
                title={`${screen.title} · ${screen.width} × ${screen.height}${linkedCount > 1 ? ` · ${linkedCount} linked` : ''} · Drag to move`}
                onPointerDown={onDrag}
            >
                <span>
                    <Monitor size={17} /> <strong className="screen-title">{screen.title}</strong>
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
                <span className="traffic-lights" aria-hidden="true">
                    <i />
                    <i />
                    <i />
                </span>
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
                    <input
                        key={screen.url}
                        name="url"
                        aria-label={`URL for ${screen.title}`}
                        defaultValue={screen.url}
                        placeholder="Enter a website URL…"
                        onChange={(e) => e.target.setCustomValidity('')}
                    />
                </form>
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
                            <div className="screen-shield" onPointerDown={onDrag}>
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
                        : 'Drag to move · double-click to fit · double-click-drag to link'}
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
