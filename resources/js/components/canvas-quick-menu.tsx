import type { ReactNode } from 'react';
import { ContextMenu } from 'radix-ui';
import { ArrowLeft, Check, Hand, Maximize, Minus, MousePointer2, Plus, Scan } from 'lucide-react';

type Props = {
    children: ReactNode;
    tool: 'select' | 'hand';
    zoom: number;
    canAddScreen: boolean;
    onAddScreen: () => void;
    onToolChange: (tool: 'select' | 'hand') => void;
    onZoom: (zoom: number) => void;
    onFit: () => void;
    onBack: () => void;
};

export function CanvasQuickMenu({ children, tool, zoom, canAddScreen, onAddScreen, onToolChange, onZoom, onFit, onBack }: Props) {
    return <ContextMenu.Root>
        <ContextMenu.Trigger asChild onContextMenuCapture={event => {
            // Keep native editing menus and existing controls independent of the canvas menu.
            if ((event.target as Element).closest('input, textarea, [contenteditable], button, a, [data-ui], [role="dialog"]')) event.stopPropagation();
        }}>{children}</ContextMenu.Trigger>
        <ContextMenu.Portal>
            <ContextMenu.Content className="canvas-quick-menu" collisionPadding={12} aria-label="Canvas quick actions" onKeyDown={event => event.stopPropagation()}>
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
                <ContextMenu.Separator className="quick-menu-separator" />
                <ContextMenu.Item className="quick-menu-item" onSelect={onBack}><ArrowLeft />Back to projects</ContextMenu.Item>
            </ContextMenu.Content>
        </ContextMenu.Portal>
    </ContextMenu.Root>;
}
