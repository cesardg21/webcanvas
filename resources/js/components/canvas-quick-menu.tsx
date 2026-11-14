import { useState, type ReactNode } from 'react';
import { screenPresets, type ScreenPreset } from '@/lib/screens';
import { ContextMenu } from 'radix-ui';
import { Copy, Check, Hand, Maximize, Minus, MousePointer2, Plus, Scan, Unlink, Trash2, Monitor, ChevronRight } from 'lucide-react';

type Props = {
    children: ReactNode;
    screens: { id: string; title: string; width: number; height: number; linkGroup?: string | null }[];
    onUnlink: (id: string) => void;
    onResize: (id: string, preset: ScreenPreset) => void;
    onDelete: (id: string) => void;
    onDuplicate: (id: string) => void;
    tool: 'select' | 'hand';
    zoom: number;
    canAddScreen: boolean;
    onAddScreen: () => void;
    onToolChange: (tool: 'select' | 'hand') => void;
    onZoom: (zoom: number) => void;
    onFit: () => void;
};

export function CanvasQuickMenu({ children, tool, zoom, canAddScreen, onAddScreen, onToolChange, onZoom, onFit, screens, onUnlink, onDelete, onResize, onDuplicate }: Props) {
    const [targetId, setTargetId] = useState<string | null>(null);
    const target = screens.find(screen => screen.id === targetId);
    return <ContextMenu.Root>
        <ContextMenu.Trigger asChild onContextMenuCapture={event => {
            // Keep native editing menus and existing controls independent of the canvas menu.
            if ((event.target as Element).closest('input, textarea, [contenteditable], button, a, [data-ui], [role="dialog"]')) { event.stopPropagation(); return; }
            setTargetId((event.target as Element).closest<HTMLElement>('[data-screen-id]')?.dataset.screenId ?? null);
        }}>{children}</ContextMenu.Trigger>
        <ContextMenu.Portal>
            <ContextMenu.Content className="canvas-quick-menu" collisionPadding={12} aria-label="Canvas quick actions" onKeyDown={event => event.stopPropagation()}>
                {target && <>
                    <ContextMenu.Label className="quick-menu-label">{target.title}</ContextMenu.Label>
                    <ContextMenu.Item className="quick-menu-item" disabled={!canAddScreen} onSelect={() => onDuplicate(target.id)}><Copy />Duplicate screen</ContextMenu.Item>
                    <ContextMenu.Sub>
                        <ContextMenu.SubTrigger className="quick-menu-item"><Monitor />Resize to preset<ChevronRight className="ml-auto" /></ContextMenu.SubTrigger>
                        <ContextMenu.Portal><ContextMenu.SubContent className="canvas-quick-menu screen-presets" sideOffset={6} collisionPadding={12} onKeyDown={event => event.stopPropagation()}>
                            <ContextMenu.Label className="quick-menu-label">{target.width} × {target.height} currently</ContextMenu.Label>
                            {screenPresets.map(preset => <ContextMenu.Item key={preset.id} className="quick-menu-item" onSelect={() => onResize(target.id, preset)}><Monitor /><span>{preset.label}<small>{preset.width} × {preset.height}</small></span>{target.width === preset.width && target.height === preset.height && <Check className="ml-auto" aria-label="Current size" />}</ContextMenu.Item>)}
                        </ContextMenu.SubContent></ContextMenu.Portal>
                    </ContextMenu.Sub>
                    <ContextMenu.Item className="quick-menu-item" disabled={!target.linkGroup} onSelect={() => onUnlink(target.id)}><Unlink />Unlink screen</ContextMenu.Item>
                    <ContextMenu.Item className="quick-menu-item screen-delete-action" onSelect={() => onDelete(target.id)}><Trash2 />Delete screen</ContextMenu.Item>
                    <ContextMenu.Separator className="quick-menu-separator" />
                </>}
                <ContextMenu.Label className="quick-menu-label">Canvas actions</ContextMenu.Label>
                <ContextMenu.Item className="quick-menu-item" disabled={!canAddScreen} onSelect={onAddScreen}><Plus />Add screen</ContextMenu.Item>
                <ContextMenu.Separator className="quick-menu-separator" />
                <ContextMenu.RadioGroup value={tool} onValueChange={value => onToolChange(value as 'select' | 'hand')}>
                    <ContextMenu.RadioItem className="quick-menu-item" value="select"><MousePointer2 />Select<kbd>V</kbd><ContextMenu.ItemIndicator><Check /></ContextMenu.ItemIndicator></ContextMenu.RadioItem>
                    <ContextMenu.RadioItem className="quick-menu-item" value="hand"><Hand />Pan<kbd>H</kbd><ContextMenu.ItemIndicator><Check /></ContextMenu.ItemIndicator></ContextMenu.RadioItem>
                </ContextMenu.RadioGroup>
                <ContextMenu.Separator className="quick-menu-separator" />
                <ContextMenu.Item className="quick-menu-item" disabled={zoom >= 2} onSelect={() => onZoom(zoom * 1.2)}><Plus />Zoom in<kbd>+</kbd></ContextMenu.Item>
                <ContextMenu.Item className="quick-menu-item" disabled={zoom <= .1} onSelect={() => onZoom(zoom / 1.2)}><Minus />Zoom out<kbd>−</kbd></ContextMenu.Item>
                <ContextMenu.Item className="quick-menu-item" onSelect={() => onZoom(1)}><Scan />Reset zoom to 100%<kbd>1</kbd></ContextMenu.Item>
                <ContextMenu.Item className="quick-menu-item" onSelect={onFit}><Maximize />Fit all screens<kbd>0</kbd></ContextMenu.Item>
            </ContextMenu.Content>
        </ContextMenu.Portal>
    </ContextMenu.Root>;
}
