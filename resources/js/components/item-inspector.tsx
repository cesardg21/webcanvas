import { TooltipHint } from '@/components/ui/tooltip';
import { isShape, itemLabels } from '@/lib/items';
import type { CanvasItem } from '@/types';
import { Copy, Pencil, Trash2 } from 'lucide-react';

export function ItemInspector({
    item,
    onChange,
    onDelete,
    onDuplicate,
}: {
    item: CanvasItem;
    onChange: (patch: Partial<CanvasItem>) => void;
    onDelete: () => void;
    onDuplicate: () => void;
}) {
    return (
        <aside
            className="item-inspector"
            data-ui
            aria-label="Item properties"
            onPointerDown={(event) => event.stopPropagation()}
            onKeyDown={(event) => event.stopPropagation()}
        >
            <strong>{itemLabels[item.kind]}</strong>
            {item.kind !== 'image' && (
                <TooltipHint label="Change item color">
                    <label>
                        Color
                        <input
                            type="color"
                            aria-label="Item color"
                            value={item.color}
                            onInput={(event) => onChange({ color: event.currentTarget.value })}
                        />
                    </label>
                </TooltipHint>
            )}
            {isShape(item.kind) && (
                <>
                    <TooltipHint label="Choose solid, translucent, or outline fill">
                        <label>
                            Fill
                            <select
                                aria-label="Shape fill"
                                value={item.fillStyle ?? (item.filled ? 'solid' : 'outline')}
                                onChange={(event) =>
                                    onChange({
                                        fillStyle: event.target.value as CanvasItem['fillStyle'],
                                        filled: event.target.value !== 'outline',
                                    })
                                }
                            >
                                <option value="solid">Solid</option>
                                <option value="translucent">Translucent</option>
                                <option value="outline">Outline</option>
                            </select>
                        </label>
                    </TooltipHint>
                    <TooltipHint label="Edit shape label">
                        <label>
                            Label
                            <input
                                className="shape-label-field"
                                aria-label="Shape label text"
                                placeholder="Add label…"
                                maxLength={120}
                                value={item.label ?? ''}
                                onChange={(event) => onChange({ label: event.target.value })}
                            />
                        </label>
                    </TooltipHint>
                </>
            )}
            {(item.kind === 'note' || item.kind === 'text') && (
                <>
                    <TooltipHint label="Change text size">
                        <label>
                            Text size
                            <select
                                aria-label="Text size"
                                value={item.fontSize}
                                onChange={(event) =>
                                    onChange({ fontSize: Number(event.target.value) })
                                }
                            >
                                {[16, 20, 24, 32, 48, 64, 96].map((size) => (
                                    <option key={size} value={size}>
                                        {size}
                                    </option>
                                ))}
                            </select>
                        </label>
                    </TooltipHint>
                    <span className="inspector-hint">
                        <Pencil size={12} />
                        Double-click to edit
                    </span>
                </>
            )}
            <TooltipHint label="Duplicate item">
                <button aria-label="Duplicate item" onClick={onDuplicate}>
                    <Copy size={16} />
                </button>
            </TooltipHint>
            <TooltipHint label="Delete item">
                <button aria-label="Delete item" onClick={onDelete}>
                    <Trash2 size={16} />
                </button>
            </TooltipHint>
        </aside>
    );
}
