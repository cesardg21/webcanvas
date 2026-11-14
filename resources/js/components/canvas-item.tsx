import { TooltipHint } from '@/components/ui/tooltip';
import { useState, type PointerEvent } from 'react';
import { Copy, MoveUpRight, Pencil, Trash2, Square } from 'lucide-react';
import type { CanvasItem } from '@/types';
import { isShape, itemLabels } from '@/lib/items';

type Props = { item: CanvasItem; selected: boolean; onStart: (event: PointerEvent, resize?: boolean) => void; onChange: (patch: Partial<CanvasItem>) => void };
export function CanvasItemView({ item, selected, onStart, onChange }: Props) {
    const [editing, setEditing] = useState(false);
    const fillStyle = item.fillStyle ?? (item.filled ? 'solid' : 'outline');
    const editable = item.kind === 'note' || item.kind === 'text';
    return <section data-item-id={item.id} aria-label={itemLabels[item.kind]} className={`canvas-item item-${item.kind} ${selected ? 'selected' : ''}`} style={{ left: item.x, top: item.y, width: item.width, height: item.height, zIndex: item.zIndex }} onPointerDown={event => onStart(event)} onDoubleClick={() => { if (editable) setEditing(true); }}>
        {isShape(item.kind) && (selected || item.label) && <div className="shape-label"><Square size={17} /><input aria-label="Shape label" placeholder="Add label…" value={item.label ?? ''} maxLength={120} onPointerDown={event => event.stopPropagation()} onDoubleClick={event => event.stopPropagation()} onChange={event => onChange({ label: event.target.value })} /></div>}
        {isShape(item.kind) && <svg className="item-shape" viewBox={`0 0 ${item.width} ${item.height}`} aria-label={itemLabels[item.kind]}>
            <g fill={fillStyle === 'outline' ? 'none' : item.color} fillOpacity={fillStyle === 'translucent' ? 0.15 : 1} stroke={item.color} strokeWidth={3} strokeLinejoin="round">
                {item.kind === 'circle' ? <ellipse cx={item.width / 2} cy={item.height / 2} rx={item.width / 2 - 3} ry={item.height / 2 - 3} /> : item.kind === 'triangle' ? <polygon points={`${item.width / 2},3 ${item.width - 3},${item.height - 3} 3,${item.height - 3}`} /> : <rect x={3} y={3} width={item.width - 6} height={item.height - 6} rx={2} />}
            </g>
        </svg>}
        {item.kind === 'image' && <img src={item.src ?? ''} alt={item.content || 'Canvas image'} draggable={false} />}
        {editable && <div className="item-writing" style={{ background: item.kind === 'note' ? item.color : 'transparent', color: item.kind === 'text' ? item.color : '#292524', fontSize: item.fontSize }}>
            {editing && selected ? <textarea autoFocus aria-label={`Edit ${itemLabels[item.kind]}`} value={item.content ?? ''} maxLength={10000} placeholder={item.kind === 'note' ? 'Write a note…' : 'Add text…'} onPointerDown={event => event.stopPropagation()} onChange={event => onChange({ content: event.target.value })} onBlur={() => setEditing(false)} onKeyDown={event => { event.stopPropagation(); if (event.key === 'Escape') setEditing(false); }} /> : <div className="item-text">{item.content || (item.kind === 'note' ? 'Double-click to write a note…' : 'Double-click to add text…')}</div>}
        </div>}
        {selected && <button className="resize-handle" aria-label={`Resize ${itemLabels[item.kind]}`} onPointerDown={event => onStart(event, true)}><MoveUpRight size={18} /></button>}
    </section>;
}

export function ItemInspector({ item, onChange, onDelete, onDuplicate }: { item: CanvasItem; onChange: (patch: Partial<CanvasItem>) => void; onDelete: () => void; onDuplicate: () => void }) {
    return <aside className="item-inspector" data-ui aria-label="Item properties" onPointerDown={event => event.stopPropagation()} onKeyDown={event => event.stopPropagation()}>
        <strong>{itemLabels[item.kind]}</strong>
        {item.kind !== 'image' && <TooltipHint label="Change item color"><label>Color<input type="color" aria-label="Item color" value={item.color} onInput={event => onChange({ color: event.currentTarget.value })} /></label></TooltipHint>}
        {isShape(item.kind) && <><TooltipHint label="Choose solid, translucent, or outline fill"><label>Fill<select aria-label="Shape fill" value={item.fillStyle ?? (item.filled ? 'solid' : 'outline')} onChange={event => onChange({ fillStyle: event.target.value as CanvasItem['fillStyle'], filled: event.target.value !== 'outline' })}><option value="solid">Solid</option><option value="translucent">Translucent</option><option value="outline">Outline</option></select></label></TooltipHint><TooltipHint label="Edit shape label"><label>Label<input className="shape-label-field" aria-label="Shape label text" placeholder="Add label…" maxLength={120} value={item.label ?? ''} onChange={event => onChange({ label: event.target.value })} /></label></TooltipHint></>}
        {(item.kind === 'note' || item.kind === 'text') && <><TooltipHint label="Change text size"><label>Text size<select aria-label="Text size" value={item.fontSize} onChange={event => onChange({ fontSize: Number(event.target.value) })}>{[16, 20, 24, 32, 48, 64, 96].map(size => <option key={size} value={size}>{size}</option>)}</select></label></TooltipHint><span className="inspector-hint"><Pencil size={12} />Double-click to edit</span></>}
        <TooltipHint label="Duplicate item"><button aria-label="Duplicate item" onClick={onDuplicate}><Copy size={16} /></button></TooltipHint>
        <TooltipHint label="Delete item"><button aria-label="Delete item" onClick={onDelete}><Trash2 size={16} /></button></TooltipHint>
    </aside>;
}
