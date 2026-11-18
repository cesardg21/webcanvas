import { AddShapeMenu } from '@/components/add-shape-menu';
import { AddScreenMenu } from '@/components/add-screen-menu';
import { Button } from '@/components/ui/button';
import { TooltipHint } from '@/components/ui/tooltip';
import type { CanvasTool, HistoryDirection, HistoryStatus } from '@/lib/canvas-types';
import type { ScreenPreset } from '@/lib/screens';
import type { CanvasItem } from '@/types';
import {
    ArrowLeft,
    Check,
    Grid2X2,
    Hand,
    Image,
    Maximize,
    Expand,
    Shrink,
    Minus,
    MousePointer2,
    PanelsTopLeft,
    Plus,
    Redo2,
    RotateCw,
    Tags,
    StickyNote,
    Type,
    Undo2,
    Workflow,
} from 'lucide-react';
type Props = {
    name: string;
    saveStatus: string;
    tool: CanvasTool;
    zoom: number;
    screenCount: number;
    itemCount: number;
    hasPages: boolean;
    uploading: boolean;
    historyStatus: HistoryStatus;
    isFullscreen: boolean;
    fullscreenSupported: boolean;
    onToggleFullscreen: () => void;
    showDots: boolean;
    showLabels: boolean;
    showConnections: boolean;
    onBack: () => void;
    onSave: () => void;
    onNameChange: (name: string) => void;
    onNameBlur: () => void;
    onToolChange: (tool: CanvasTool) => void;
    onHistory: (direction: HistoryDirection) => void;
    onReload: () => void;
    onAddScreen: (preset: ScreenPreset) => void;
    onAddScreenGroup: () => void;
    onAddItem: (kind: CanvasItem['kind']) => void;
    onZoom: (zoom: number) => void;
    fitLabel: string;
    onFit: () => void;
    onToggleDots: () => void;
    onToggleLabels: () => void;
    onToggleConnections: () => void;
};

export function CanvasToolbar({
    name,
    saveStatus,
    tool,
    zoom,
    screenCount,
    itemCount,
    hasPages,
    uploading,
    historyStatus,
    isFullscreen,
    fullscreenSupported,
    onToggleFullscreen,
    showDots,
    showLabels,
    showConnections,
    onBack,
    onSave,
    onNameChange,
    onNameBlur,
    onToolChange,
    onHistory,
    onReload,
    onAddScreen,
    onAddScreenGroup,
    onAddItem,
    onZoom,
    fitLabel,
    onFit,
    onToggleDots,
    onToggleLabels,
    onToggleConnections,
}: Props) {
    return (
        <nav
            className="canvas-toolbar"
            aria-label="Canvas tools"
            data-ui
            onPointerDown={(e) => e.stopPropagation()}
        >
            <div className="toolbar-project-group">
                <TooltipHint label="Back to projects">
                    <Button
                        variant="ghost"
                        size="icon"
                        aria-label="Back to projects"
                        onClick={onBack}
                    >
                        <ArrowLeft />
                    </Button>
                </TooltipHint>
                <span className="divider" />
                <div
                    className="canvas-project toolbar-project"
                    data-ui
                    onPointerDown={(e) => e.stopPropagation()}
                >
                    <span className="brand-icon">
                        <PanelsTopLeft size={20} />
                    </span>
                    <div className="flex flex-col items-start">
                        <TooltipHint label="Rename project">
                            <input
                                aria-label="Project name"
                                value={name}
                                maxLength={120}
                                onChange={(event) => onNameChange(event.target.value)}
                                onBlur={onNameBlur}
                            />
                        </TooltipHint>
                        <TooltipHint label="Save canvas">
                            <button
                                className={`save-status ${saveStatus.startsWith('Save failed') ? 'error' : ''}`}
                                onClick={() => onSave()}
                            >
                                {saveStatus === 'All changes saved' && <Check size={11} />}
                                {saveStatus}
                            </button>
                        </TooltipHint>
                    </div>
                </div>
            </div>
            <span className="divider project-divider" />
            <TooltipHint label="Select (V)">
                <Button
                    variant="ghost"
                    size="icon"
                    className={tool === 'select' ? 'active-tool' : ''}
                    aria-label="Select tool"
                    onClick={() => onToolChange('select')}
                >
                    <MousePointer2 />
                </Button>
            </TooltipHint>
            <TooltipHint label="Pan (H or hold Space)">
                <Button
                    variant="ghost"
                    size="icon"
                    className={tool === 'hand' ? 'active-tool' : ''}
                    aria-label="Pan tool"
                    onClick={() => onToolChange('hand')}
                >
                    <Hand />
                </Button>
            </TooltipHint>
            <span className="divider" />
            <TooltipHint label="Undo (⌘/Ctrl+Z)">
                <Button
                    variant="ghost"
                    size="icon"
                    aria-label="Undo"
                    disabled={!historyStatus.canUndo}
                    onClick={() => onHistory('undo')}
                >
                    <Undo2 />
                </Button>
            </TooltipHint>
            <TooltipHint label="Redo (⌘/Ctrl+Shift+Z)">
                <Button
                    variant="ghost"
                    size="icon"
                    aria-label="Redo"
                    disabled={!historyStatus.canRedo}
                    onClick={() => onHistory('redo')}
                >
                    <Redo2 />
                </Button>
            </TooltipHint>
            <span className="divider" />
            <TooltipHint label="Reload all pages">
                <Button
                    variant="ghost"
                    size="icon"
                    aria-label="Reload all pages"
                    disabled={!hasPages}
                    onClick={onReload}
                >
                    <RotateCw />
                </Button>
            </TooltipHint>
            <AddScreenMenu
                disabled={screenCount >= 100}
                onChoose={onAddScreen}
                groupDisabled={screenCount > 96}
                onAddGroup={onAddScreenGroup}
            />
            <TooltipHint label="Add image">
                <Button
                    variant="ghost"
                    size="icon"
                    aria-label="Add image"
                    disabled={itemCount >= 200 || uploading}
                    onClick={() => onAddItem('image')}
                >
                    <Image />
                </Button>
            </TooltipHint>
            <AddShapeMenu disabled={itemCount >= 200} onChoose={onAddItem} />
            <TooltipHint label="Add sticky note">
                <Button
                    variant="ghost"
                    size="icon"
                    aria-label="Add sticky note"
                    disabled={itemCount >= 200}
                    onClick={() => onAddItem('note')}
                >
                    <StickyNote />
                </Button>
            </TooltipHint>
            <TooltipHint label="Add text">
                <Button
                    variant="ghost"
                    size="icon"
                    aria-label="Add text"
                    disabled={itemCount >= 200}
                    onClick={() => onAddItem('text')}
                >
                    <Type />
                </Button>
            </TooltipHint>
            <span className="divider" />
            <TooltipHint label="Zoom out">
                <Button
                    variant="ghost"
                    size="icon"
                    aria-label="Zoom out"
                    onClick={() => onZoom(zoom / 1.2)}
                >
                    <Minus />
                </Button>
            </TooltipHint>
            <TooltipHint label="Reset to 100%">
                <button className="zoom-value" onClick={() => onZoom(1)}>
                    {Math.round(zoom * 100)}%
                </button>
            </TooltipHint>
            <TooltipHint label="Zoom in">
                <Button
                    variant="ghost"
                    size="icon"
                    aria-label="Zoom in"
                    onClick={() => onZoom(zoom * 1.2)}
                >
                    <Plus />
                </Button>
            </TooltipHint>
            <TooltipHint label={fitLabel}>
                <Button variant="ghost" size="icon" aria-label={fitLabel} onClick={onFit}>
                    <Maximize />
                </Button>
            </TooltipHint>
            <TooltipHint
                label={
                    fullscreenSupported
                        ? isFullscreen
                            ? 'Exit fullscreen (Esc)'
                            : 'Enter fullscreen'
                        : 'Fullscreen is unavailable in this browser'
                }
            >
                <Button
                    variant="ghost"
                    size="icon"
                    aria-label={isFullscreen ? 'Exit fullscreen' : 'Enter fullscreen'}
                    aria-pressed={isFullscreen}
                    className={isFullscreen ? 'active-tool' : ''}
                    disabled={!fullscreenSupported}
                    onClick={onToggleFullscreen}
                >
                    {isFullscreen ? <Shrink /> : <Expand />}
                </Button>
            </TooltipHint>
            <span className="divider" />
            <TooltipHint label={showDots ? 'Hide dot background' : 'Show dot background'}>
                <Button
                    variant="ghost"
                    size="icon"
                    aria-label={showDots ? 'Hide dot background' : 'Show dot background'}
                    aria-pressed={showDots}
                    className={showDots ? 'active-tool' : ''}
                    onClick={onToggleDots}
                >
                    <Grid2X2 />
                </Button>
            </TooltipHint>
            <TooltipHint label={showLabels ? 'Hide all labels' : 'Show all labels'}>
                <Button
                    variant="ghost"
                    size="icon"
                    aria-label={showLabels ? 'Hide all labels' : 'Show all labels'}
                    aria-pressed={showLabels}
                    className={showLabels ? 'active-tool' : ''}
                    onClick={onToggleLabels}
                >
                    <Tags />
                </Button>
            </TooltipHint>
            <TooltipHint
                label={showConnections ? 'Hide group link lines' : 'Show group link lines'}
            >
                <Button
                    variant="ghost"
                    size="icon"
                    aria-label={showConnections ? 'Hide group link lines' : 'Show group link lines'}
                    aria-pressed={showConnections}
                    className={showConnections ? 'active-tool' : ''}
                    onClick={onToggleConnections}
                >
                    <Workflow />
                </Button>
            </TooltipHint>
        </nav>
    );
}
