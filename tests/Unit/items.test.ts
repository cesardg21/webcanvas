import { test } from 'node:test';
import assert from 'node:assert/strict';
import { canvasObjects, reorderObjects, orderedObjects } from '../../resources/js/lib/items.ts';
import type { CanvasItem, Screen } from '../../resources/js/types.ts';

const screen: Screen = { id: 'screen', title: 'Screen', url: '', x: 0, y: 0, width: 1440, height: 900 };
const note: CanvasItem = { id: 'note', kind: 'note', x: 20, y: 40, width: 240, height: 240, zIndex: 1, content: 'Hello', color: '#fef08a', filled: true, fontSize: 24, src: null };
const shape: CanvasItem = { ...note, id: 'shape', kind: 'circle', zIndex: 2 };

test('layer actions interleave screens and items, preserving content and geometry', () => {
    const front = reorderObjects([screen], [note, shape], 'screen', 'front');
    assert.deepEqual(orderedObjects(front.screens, front.items).map(item => item.id), ['note', 'shape', 'screen']);
    const backward = reorderObjects(front.screens, front.items, 'screen', 'backward');
    assert.deepEqual(orderedObjects(backward.screens, backward.items).map(item => item.id), ['note', 'screen', 'shape']);
    const forward = reorderObjects(backward.screens, backward.items, 'note', 'forward');
    assert.deepEqual(orderedObjects(forward.screens, forward.items).map(item => item.id), ['screen', 'note', 'shape']);
    const back = reorderObjects(forward.screens, forward.items, 'shape', 'back');
    assert.deepEqual(orderedObjects(back.screens, back.items).map(item => item.id), ['shape', 'screen', 'note']);
    assert.deepEqual(back.items[0], { ...note, zIndex: 2 });
    assert.equal(back.screens[0].width, 1440);
});

test('layer boundary actions stay stable and absent targets do not change the canvas', () => {
    assert.deepEqual(reorderObjects([screen], [note, shape], 'missing', 'front'), { screens: [screen], items: [note, shape] });
    const result = reorderObjects([screen], [note, shape], 'shape', 'forward');
    assert.deepEqual(orderedObjects(result.screens, result.items).map(item => item.id), ['screen', 'note', 'shape']);
});

test('canvas bounds include browser chrome but no extra padding on notes and shapes', () => {
    const bounds = canvasObjects([screen], [note, shape]);
    assert.equal(bounds[0].y, -39);
    assert.equal(bounds[0].height, 1023);
    assert.equal(bounds[1].y, 40);
    assert.equal(bounds[1].height, 240);
});

test('zoomed-out label bounds preserve readable screen-space height', () => {
    const bounds = canvasObjects([screen], [{ ...shape, label: 'Board' }], 0.1);
    assert.equal(bounds[0].y, -390);
    assert.equal(bounds[1].y, shape.y - 390);
    assert.equal(bounds[1].height, shape.height + 390);
});
