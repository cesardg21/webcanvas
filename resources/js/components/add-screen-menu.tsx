import { DropdownMenu } from 'radix-ui';
import { ChevronDown, Monitor, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { screenPresets, type ScreenPreset } from '@/lib/screens';

export function AddScreenMenu({ disabled, onChoose }: { disabled: boolean; onChoose: (preset: ScreenPreset) => void }) {
    return <DropdownMenu.Root>
        <DropdownMenu.Trigger asChild><Button disabled={disabled} aria-label="Add screen" title="Add screen" className="add-screen-trigger"><Plus /><ChevronDown /></Button></DropdownMenu.Trigger>
        <DropdownMenu.Portal><DropdownMenu.Content className="canvas-quick-menu screen-presets" sideOffset={10} collisionPadding={12} data-ui onPointerDown={event => event.stopPropagation()} onKeyDown={event => event.stopPropagation()}>
            <DropdownMenu.Label className="quick-menu-label">Choose a screen size</DropdownMenu.Label>
            {screenPresets.map(preset => <DropdownMenu.Item key={preset.id} className="quick-menu-item" onSelect={() => onChoose(preset)}><Monitor /><span>{preset.label}<small>{preset.width} × {preset.height}</small></span>{preset.id === 'xl' && <span className="preset-default">Default</span>}</DropdownMenu.Item>)}
        </DropdownMenu.Content></DropdownMenu.Portal>
    </DropdownMenu.Root>;
}
