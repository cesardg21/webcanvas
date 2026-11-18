import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { ChevronDown, Circle, RectangleHorizontal, Shapes, Square, Triangle } from 'lucide-react';
import { DropdownMenu } from 'radix-ui';

type ShapeKind = 'square' | 'rectangle' | 'triangle' | 'circle';

type Props = {
    disabled: boolean;
    onChoose: (kind: ShapeKind) => void;
};

const shapes = [
    ['square', 'Square', Square],
    ['rectangle', 'Rectangle', RectangleHorizontal],
    ['triangle', 'Triangle', Triangle],
    ['circle', 'Circle', Circle],
] as const;

export function AddShapeMenu({ disabled, onChoose }: Props) {
    return (
        <DropdownMenu.Root>
            <Tooltip>
                <TooltipTrigger asChild>
                    <DropdownMenu.Trigger asChild>
                        <Button variant="ghost" aria-label="Add shape" disabled={disabled}>
                            <Shapes />
                            <ChevronDown />
                        </Button>
                    </DropdownMenu.Trigger>
                </TooltipTrigger>
                <TooltipContent side="bottom">Add shape</TooltipContent>
            </Tooltip>
            <DropdownMenu.Portal>
                <DropdownMenu.Content
                    className="canvas-quick-menu"
                    sideOffset={10}
                    collisionPadding={12}
                    data-ui
                    onPointerDown={(event) => event.stopPropagation()}
                    onKeyDown={(event) => event.stopPropagation()}
                >
                    <DropdownMenu.Label className="quick-menu-label">Shapes</DropdownMenu.Label>
                    {shapes.map(([kind, label, Icon]) => (
                        <DropdownMenu.Item
                            key={kind}
                            className="quick-menu-item"
                            onSelect={() => onChoose(kind)}
                        >
                            <Icon />
                            {label}
                        </DropdownMenu.Item>
                    ))}
                </DropdownMenu.Content>
            </DropdownMenu.Portal>
        </DropdownMenu.Root>
    );
}
