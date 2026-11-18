import { useCanvasFullscreen } from '@/lib/use-canvas-fullscreen';
import { BrowserScreen } from '@/components/browser-screen';
import { CanvasItemView } from '@/components/canvas-item';
import { CanvasMinimap } from '@/components/canvas-minimap';
import { CanvasQuickMenu } from '@/components/canvas-quick-menu';
import { CanvasToolbar } from '@/components/canvas-toolbar';
import { ItemInspector } from '@/components/item-inspector';
import { LinkScreensDialog } from '@/components/link-screens-dialog';
import { ScreenConnections } from '@/components/screen-connections';
import { Button } from '@/components/ui/button';
import { TooltipProvider } from '@/components/ui/tooltip';
import { clamp } from '@/lib/canvas';
import { canvasObjects, itemLabels } from '@/lib/items';
import { linkScreens } from '@/lib/screens';
import { useCanvasActions } from '@/lib/use-canvas-actions';
import { useCanvasDocument } from '@/lib/use-canvas-document';
import { useCanvasImages } from '@/lib/use-canvas-images';
import { useCanvasInteractions } from '@/lib/use-canvas-interactions';
import type { Project, Screen } from '@/types';
import { Head, router } from '@inertiajs/react';
import { PanelsTopLeft, Plus, X } from 'lucide-react';
import { useRef, type CSSProperties } from 'react';

export default function Canvas({ project }: { project: Project }) {
    const fullscreen = useCanvasFullscreen();
    const {
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
    } = useCanvasDocument(project, {
        isBusy: (): boolean => interactions.isBusy(),
        historyGroup: (): string | undefined => interactions.historyGroup(),
        onRemoteApplied: () => {
            selectScreens([]);
            setInteracting(null);
            setLinkingId(null);
        },
    });
    const interactions = useCanvasInteractions({ latest, update, restore, breakHistoryGroup });
    const {
        stage,
        selection,
        selected,
        selectScreens,
        setSelected,
        marquee,
        linkDrag,
        tool,
        setTool,
        changeTool,
        panning,
        dragging,
        interacting,
        setInteracting,
        linkingId,
        setLinkingId,
        suppressInteractionUntil,
        restoreHistory,
        deleteItems,
        zoomTo,
        fit,
        start,
        startScreenDrag,
        startItemDrag,
        move,
        finishDrag,
        cancelGesture,
        onStagePointerDown,
        selectScreen,
    } = interactions;
    const lastScreenFit = useRef<{ id: string; viewport: Project['viewport'] } | null>(null);
    const { showDots, showLabels, showConnections } = state.display_settings;
    function toggleDisplay(key: keyof typeof state.display_settings) {
        update((previous) => ({
            ...previous,
            display_settings: {
                ...previous.display_settings,
                [key]: !previous.display_settings[key],
            },
        }));
    }
    const { imageInput, uploading, droppingImages, uploadError, clearUploadError, uploadImages } =
        useCanvasImages({
            projectId: project.id,
            itemCount: () => latest.current.items.length,
            viewport: () => latest.current.viewport,
            bounds: () => stage.current!.getBoundingClientRect(),
            onImage: (image, position) => addItem('image', image, position),
        });
    const {
        setScreenUrl,
        addScreen,
        addScreenGroup,
        addItem,
        changeItem,
        fitItem,
        fitItems,
        arrangeItem,
        duplicateItem,
        resizeScreen,
        unlinkScreen,
        reloadAllScreens,
        reloadScreen,
        reloads,
    } = useCanvasActions({
        latest,
        update,
        selectItem: setSelected,
        selectItems: selectScreens,
        stopInteracting: () => setInteracting(null),
        selectTool: () => setTool('select'),
        chooseImage: () => imageInput.current?.click(),
    });
    const { viewport: v, screens, items } = state;
    const objects = canvasObjects(screens, items, v.zoom);
    const selectedItem =
        selection.length === 1 ? items.find((item) => item.id === selected) : undefined;
    const linkingScreen = screens.find((screen) => screen.id === linkingId);
    const linkedCount = (screen: Screen) =>
        screen.linkGroup
            ? screens.filter((other) => other.linkGroup === screen.linkGroup).length
            : 0;
    function deleteScreen(id: string) {
        deleteItems([id]);
    }
    const backToProjects = async () => {
        if (await save()) router.visit('/');
    };
    return (
        <CanvasQuickMenu
            screens={[
                ...screens,
                ...items.map((item) => ({ ...item, title: item.label || itemLabels[item.kind] })),
            ]}
            onLayer={arrangeItem}
            onReload={reloadScreen}
            onLink={setLinkingId}
            onFitItem={fitItem}
            onDuplicate={duplicateItem}
            onResize={resizeScreen}
            onUnlink={unlinkScreen}
            onDelete={deleteScreen}
            tool={tool}
            zoom={v.zoom}
            canAddScreen={screens.length < 100}
            onAddScreen={() => addScreen()}
            onToolChange={changeTool}
            onZoom={zoomTo}
            onFit={fit}
        >
            <div
                ref={stage}
                tabIndex={-1}
                onBlurCapture={() => breakHistoryGroup()}
                className={`canvas ${showLabels ? '' : 'hide-canvas-labels'} ${panning ? 'hand-mode' : ''} ${dragging ? 'is-dragging' : ''}`}
                style={{
                    backgroundImage: showDots ? undefined : 'none',
                    backgroundSize: `${24 * v.zoom}px ${24 * v.zoom}px`,
                    backgroundPosition: `${v.x}px ${v.y}px`,
                }}
                onPointerDown={onStagePointerDown}
                onPointerMove={move}
                onPointerUp={finishDrag}
                onPointerCancel={cancelGesture}
            >
                <Head title={state.name} />
                {fullscreen.error && (
                    <div
                        className="canvas-upload-status"
                        role="alert"
                        data-ui
                        onPointerDown={(event) => event.stopPropagation()}
                    >
                        {fullscreen.error}
                        <button
                            aria-label="Dismiss fullscreen error"
                            onClick={fullscreen.dismissError}
                        >
                            <X size={14} />
                        </button>
                    </div>
                )}
                {droppingImages && (
                    <div className="canvas-image-drop-overlay">
                        <div role="status">
                            Drop images onto the canvas
                            <span>PNG, JPG, GIF, or WebP · up to 10 MB each</span>
                        </div>
                    </div>
                )}
                {hasConflict && (
                    <div
                        className="canvas-sync-conflict"
                        role="alert"
                        data-ui
                        onPointerDown={(event) => event.stopPropagation()}
                    >
                        <span>
                            This canvas changed elsewhere. Your local edits have not been saved.
                        </span>
                        <Button variant="outline" onClick={() => void loadLatestProject()}>
                            Discard local edits and load latest
                        </Button>
                    </div>
                )}
                <input
                    ref={imageInput}
                    type="file"
                    accept="image/png,image/jpeg,image/gif,image/webp"
                    className="hidden"
                    aria-label="Upload canvas image"
                    onChange={(event) => {
                        const file = event.target.files?.[0];
                        event.target.value = '';
                        if (file) void uploadImages([file]);
                    }}
                />
                {(uploading || uploadError) && (
                    <div
                        className="canvas-upload-status"
                        role="status"
                        data-ui
                        onPointerDown={(event) => event.stopPropagation()}
                    >
                        {uploading ? 'Uploading image…' : uploadError}
                        {uploadError && (
                            <button
                                aria-label="Dismiss upload error"
                                onClick={() => clearUploadError()}
                            >
                                <X size={14} />
                            </button>
                        )}
                    </div>
                )}
                <TooltipProvider>
                    <div className="canvas-toolbars">
                        <CanvasToolbar
                            isFullscreen={fullscreen.isFullscreen}
                            fullscreenSupported={fullscreen.supported}
                            onToggleFullscreen={() => void fullscreen.toggleFullscreen()}
                            name={state.name}
                            saveStatus={saveStatus}
                            tool={tool}
                            zoom={v.zoom}
                            screenCount={screens.length}
                            itemCount={items.length}
                            hasPages={screens.some((screen) => !!screen.url)}
                            uploading={uploading}
                            historyStatus={historyStatus}
                            showDots={showDots}
                            showLabels={showLabels}
                            showConnections={showConnections}
                            onBack={backToProjects}
                            onSave={() => void save()}
                            onNameChange={(name) =>
                                update((old) => ({ ...old, name }), 'project-name')
                            }
                            onNameBlur={() => {
                                if (!latest.current.name.trim())
                                    update((old) => ({ ...old, name: project.name }));
                            }}
                            onToolChange={changeTool}
                            onHistory={restoreHistory}
                            onReload={reloadAllScreens}
                            onAddScreen={addScreen}
                            onAddScreenGroup={addScreenGroup}
                            onAddItem={addItem}
                            onZoom={zoomTo}
                            fitLabel={selection.length ? 'Fit selection' : 'Fit all items'}
                            onFit={selection.length ? () => fitItems(selection) : fit}
                            onToggleDots={() => toggleDisplay('showDots')}
                            onToggleLabels={() => toggleDisplay('showLabels')}
                            onToggleConnections={() => toggleDisplay('showConnections')}
                        />
                        {selectedItem && (
                            <ItemInspector
                                item={selectedItem}
                                onChange={(patch) => changeItem(selectedItem.id, patch)}
                                onDelete={() => deleteScreen(selectedItem.id)}
                                onDuplicate={() => duplicateItem(selectedItem.id)}
                            />
                        )}
                    </div>
                </TooltipProvider>
                {!screens.length && !items.length && (
                    <div
                        className="canvas-empty"
                        data-ui
                        onPointerDown={(e) => e.stopPropagation()}
                    >
                        <div className="empty-icon">
                            <PanelsTopLeft size={36} />
                        </div>
                        <span className="eyebrow">YOUR IDEAS, WITHOUT EDGES</span>
                        <h1>Give your tabs some space.</h1>
                        <p>
                            Add your first screen and start exploring.
                            <br />
                            An entire web, on your canvas.
                        </p>
                        <Button onClick={() => addScreen()}>
                            <Plus size={16} /> Add your first screen
                        </Button>
                        <small>Desktop size by default. Resize to make it yours.</small>
                    </div>
                )}
                {showConnections && <ScreenConnections screens={screens} viewport={v} />}
                <div
                    className="canvas-world"
                    style={
                        {
                            transform: `translate(${v.x}px, ${v.y}px) scale(${v.zoom})`,
                            '--label-scale': Math.max(1, 1 / v.zoom),
                        } as CSSProperties
                    }
                >
                    {items.map((item) => (
                        <CanvasItemView
                            key={item.id}
                            item={item}
                            selected={selection.includes(item.id)}
                            onStart={(event, resize) => startItemDrag(event, item, resize)}
                            onChange={(patch) => changeItem(item.id, patch)}
                        />
                    ))}
                    {screens.map((screen, index) => (
                        <BrowserScreen
                            key={screen.id}
                            screen={screen}
                            layer={screen.zIndex ?? index}
                            selected={selection.includes(screen.id)}
                            linkTarget={linkDrag?.targetId === screen.id}
                            linkedCount={linkedCount(screen)}
                            reloadVersion={reloads[screen.id] ?? 0}
                            interacting={interacting === screen.id}
                            panning={panning}
                            dragging={dragging}
                            onSelect={(event) => selectScreen(event, screen.id)}
                            onDrag={(event) => startScreenDrag(event, screen)}
                            onResize={(event) => start(event, 'resize', screen.id)}
                            onUrlChange={(url) => {
                                setScreenUrl(screen.id, url);
                                setInteracting(null);
                            }}
                            onDoubleClick={() => {
                                if (performance.now() < suppressInteractionUntil.current || panning)
                                    return;
                                const previous = lastScreenFit.current;
                                const viewport = latest.current.viewport;
                                if (
                                    previous?.id === screen.id &&
                                    previous.viewport.x === viewport.x &&
                                    previous.viewport.y === viewport.y &&
                                    previous.viewport.zoom === viewport.zoom
                                ) {
                                    lastScreenFit.current = null;
                                    fit();
                                } else {
                                    fitItem(screen.id);
                                    lastScreenFit.current = {
                                        id: screen.id,
                                        viewport: latest.current.viewport,
                                    };
                                }
                            }}
                            onInteract={() => {
                                setInteracting(screen.id);
                                setTool('select');
                            }}
                        />
                    ))}
                </div>
                {marquee && (
                    <div
                        className="selection-marquee"
                        style={{
                            left: Math.min(marquee.startX, marquee.x),
                            top: Math.min(marquee.startY, marquee.y),
                            width: Math.abs(marquee.x - marquee.startX),
                            height: Math.abs(marquee.y - marquee.startY),
                        }}
                    />
                )}
                {selection.length > 1 && (
                    <div className="selection-count" role="status">
                        {selection.length} items selected · drag any selected item to move together
                    </div>
                )}
                {linkDrag && (
                    <div className="link-drag-overlay" aria-hidden="true">
                        <svg>
                            <path
                                d={`M ${linkDrag.startX} ${linkDrag.startY} C ${linkDrag.startX + (linkDrag.x - linkDrag.startX) / 2} ${linkDrag.startY}, ${linkDrag.startX + (linkDrag.x - linkDrag.startX) / 2} ${linkDrag.y}, ${linkDrag.x} ${linkDrag.y}`}
                            />
                            <circle cx={linkDrag.startX} cy={linkDrag.startY} r="4" />
                            <circle cx={linkDrag.x} cy={linkDrag.y} r="6" />
                        </svg>
                        <span
                            style={{
                                left: Math.min(linkDrag.x + 16, window.innerWidth - 260),
                                top: Math.max(10, linkDrag.y - 38),
                            }}
                        >
                            {linkDrag.targetId
                                ? 'Release to use this screen’s website'
                                : 'Drag onto a screen · Esc to cancel'}
                        </span>
                    </div>
                )}
                <CanvasMinimap
                    screens={objects}
                    viewport={v}
                    selected={selected}
                    onNavigate={(centerX, centerY) => {
                        setInteracting(null);
                        update((old) => ({
                            ...old,
                            viewport: {
                                ...old.viewport,
                                x: clamp(
                                    window.innerWidth / 2 - centerX * old.viewport.zoom,
                                    -1000000,
                                    1000000,
                                ),
                                y: clamp(
                                    window.innerHeight / 2 - centerY * old.viewport.zoom,
                                    -1000000,
                                    1000000,
                                ),
                            },
                        }));
                    }}
                />
                <LinkScreensDialog
                    key={linkingId ?? 'closed'}
                    screen={linkingScreen}
                    screens={screens}
                    onClose={() => setLinkingId(null)}
                    onUnlink={unlinkScreen}
                    onLink={(sourceId, targetId) => {
                        update((old) => ({
                            ...old,
                            screens: linkScreens(
                                old.screens,
                                sourceId,
                                targetId,
                                crypto.randomUUID(),
                            ),
                        }));
                        setInteracting(null);
                    }}
                />
            </div>
        </CanvasQuickMenu>
    );
}
