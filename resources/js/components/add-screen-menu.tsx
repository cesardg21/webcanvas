import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { screenPresets, type ScreenPreset } from '@/lib/screens';
import { Monitor } from 'lucide-react';
import { DropdownMenu } from 'radix-ui';

export function AddScreenMenu({
    disabled,
    onChoose,
}: {
    disabled: boolean;
    onChoose: (preset: ScreenPreset) => void;
}) {
    return (
        <DropdownMenu.Root>
            <Tooltip>
                <TooltipTrigger asChild>
                    <DropdownMenu.Trigger asChild>
                        <Button
                            variant="ghost"
                            size="icon"
                            aria-label="Add screen"
                            className="add-screen-trigger"
                            disabled={disabled}
                        >
                            <Monitor />
                        </Button>
                    </DropdownMenu.Trigger>
                </TooltipTrigger>
                <TooltipContent side="bottom">Add screen</TooltipContent>
            </Tooltip>
            <DropdownMenu.Portal>
                <DropdownMenu.Content
                    className="canvas-quick-menu screen-presets"
                    sideOffset={10}
                    collisionPadding={12}
                    data-ui
                    onPointerDown={(event) => event.stopPropagation()}
                    onKeyDown={(event) => event.stopPropagation()}
                >
                    <DropdownMenu.Label className="quick-menu-label">Add screen</DropdownMenu.Label>
                    {screenPresets.map((preset) => (
                        <DropdownMenu.Item
                            key={preset.id}
                            className="quick-menu-item"
                            onSelect={() => onChoose(preset)}
                        >
                            <Monitor />
                            <span>
                                {preset.label}
                                <small>
                                    {preset.width} × {preset.height}
                                </small>
                            </span>
                            {preset.id === 'xl' && <span className="preset-default">Default</span>}
                        </DropdownMenu.Item>
                    ))}
                </DropdownMenu.Content>
            </DropdownMenu.Portal>
        </DropdownMenu.Root>
    );
}
