import { Tooltip, TooltipTrigger, TooltipContent } from '@/components/ui/tooltip';
import { DropdownMenu } from 'radix-ui';
import { ChevronDown, ChevronRight, Monitor, Plus, StickyNote, Type, Image, Square, RectangleHorizontal, Triangle, Circle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { CanvasItem } from '@/types';
import { screenPresets, type ScreenPreset } from '@/lib/screens';

export function AddScreenMenu({ disabled, onChoose, onAddItem, itemsDisabled }: { disabled: boolean; onChoose: (preset: ScreenPreset) => void; onAddItem: (kind: CanvasItem['kind']) => void; itemsDisabled: boolean }) {
    return <DropdownMenu.Root>
        <Tooltip><TooltipTrigger asChild><DropdownMenu.Trigger asChild><Button aria-label="Add to canvas" className="add-screen-trigger"><Plus /><ChevronDown /></Button></DropdownMenu.Trigger></TooltipTrigger><TooltipContent side="bottom">Add to canvas</TooltipContent></Tooltip>
        <DropdownMenu.Portal><DropdownMenu.Content className="canvas-quick-menu screen-presets" sideOffset={10} collisionPadding={12} data-ui onPointerDown={event => event.stopPropagation()} onKeyDown={event => event.stopPropagation()}>
            <DropdownMenu.Label className="quick-menu-label">Add to canvas</DropdownMenu.Label>
            <DropdownMenu.Sub><DropdownMenu.SubTrigger disabled={disabled} className="quick-menu-item"><Monitor />Screen<ChevronRight className="ml-auto" /></DropdownMenu.SubTrigger><DropdownMenu.Portal><DropdownMenu.SubContent className="canvas-quick-menu screen-presets" sideOffset={6} collisionPadding={12} data-ui onKeyDown={event => event.stopPropagation()}>
            {screenPresets.map(preset => <DropdownMenu.Item key={preset.id} className="quick-menu-item" onSelect={() => onChoose(preset)}><Monitor /><span>{preset.label}<small>{preset.width} × {preset.height}</small></span>{preset.id === 'xl' && <span className="preset-default">Default</span>}</DropdownMenu.Item>)}
            </DropdownMenu.SubContent></DropdownMenu.Portal></DropdownMenu.Sub>
            <DropdownMenu.Separator className="quick-menu-separator" />
            {([
                ['note', 'Sticky note', StickyNote], ['image', 'Image…', Image], ['text', 'Text', Type],
                ['square', 'Square', Square], ['rectangle', 'Rectangle', RectangleHorizontal], ['triangle', 'Triangle', Triangle], ['circle', 'Circle', Circle],
            ] as const).map(([kind, label, Icon]) => <DropdownMenu.Item key={kind} className="quick-menu-item" disabled={itemsDisabled} onSelect={() => onAddItem(kind)}><Icon />{label}</DropdownMenu.Item>)}
        </DropdownMenu.Content></DropdownMenu.Portal>
    </DropdownMenu.Root>;
}
