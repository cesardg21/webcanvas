import { test } from 'node:test';
import assert from 'node:assert/strict';
import { CanvasHistory } from '../../resources/js/lib/history.ts';

test('one undo restores a whole drag and redo reapplies its final position', () => {
    const history = new CanvasHistory<{ x: number }>();
    history.record({ x: 0 }, { x: 10 }, 'drag-1');
    history.record({ x: 10 }, { x: 50 }, 'drag-1');
    history.record({ x: 50 }, { x: 100 }, 'drag-1');
    assert.deepEqual(history.undo(), { x: 0 });
    assert.equal(history.canUndo, false);
    assert.deepEqual(history.redo(), { x: 100 });
    assert.equal(history.canRedo, false);
});

test('multi-item deletion can be restored with all properties and links intact', () => {
    const before = { screens: [{ id: 'a', linkGroup: 'linked', url: 'https://example.com', width: 1440 }], items: [{ id: 'b', label: 'Ideas', fillStyle: 'translucent', zIndex: 2 }, { id: 'c', src: '/projects/1/images/example.png' }] };
    const after = { screens: [], items: [] };
    const history = new CanvasHistory<typeof before>();
    history.record(before, after);
    assert.deepEqual(history.undo(), before);
    assert.deepEqual(history.redo(), after);
});

test('new edits clear redo, but no-op updates preserve it', () => {
    const history = new CanvasHistory<number>();
    history.record(0, 1);
    history.record(1, 2);
    assert.equal(history.undo(), 1);
    history.record(1, 1);
    assert.equal(history.canRedo, true);
    history.record(1, 3);
    assert.equal(history.canRedo, false);
    assert.equal(history.undo(), 1);
    assert.equal(history.undo(), 0);
    assert.equal(history.undo(), undefined);
});

test('separate editing sessions with the same field create separate undo steps', () => {
    const history = new CanvasHistory<string>();
    history.record('', 'Hel', 'label');
    history.record('Hel', 'Hello', 'label');
    history.breakGroup();
    history.record('Hello', 'Hello world', 'label');
    assert.equal(history.undo(), 'Hello');
    assert.equal(history.undo(), '');
    assert.equal(history.redo(), 'Hello');
    history.record('Hello', 'New text', 'label');
    assert.equal(history.undo(), 'Hello');
});

test('history retains its latest bounded number of edits', () => {
    const history = new CanvasHistory<number>(2);
    history.record(0, 1);
    history.record(1, 2);
    history.record(2, 3);
    assert.equal(history.undo(), 2);
    assert.equal(history.undo(), 1);
    assert.equal(history.canUndo, false);
});
