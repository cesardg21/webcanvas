import assert from 'node:assert/strict';
import { test, type TestContext } from 'node:test';
import { getProject, saveProject, uploadProjectImage } from '../../resources/js/lib/project-api.ts';

const snapshot = {
    name: 'Research',
    screens: [],
    items: [],
    viewport: { x: 100, y: 140, zoom: 0.6 },
};

function mockSession(context: TestContext) {
    Object.defineProperty(globalThis, 'document', {
        configurable: true,
        value: { querySelector: () => ({ content: 'test-csrf-token' }) },
    });
    context.after(() => Reflect.deleteProperty(globalThis, 'document'));
}

test('saving sends the complete snapshot and revision with session protection', async (context) => {
    mockSession(context);
    context.mock.method(globalThis, 'fetch', async (url: string, options: RequestInit) => {
        assert.equal(url, '/projects/7');
        assert.equal(options.method, 'PATCH');
        assert.equal(
            (options.headers as Record<string, string>)['X-CSRF-TOKEN'],
            'test-csrf-token',
        );
        assert.deepEqual(JSON.parse(options.body as string), { ...snapshot, revision: 3 });
        return Response.json({ saved: true, revision: 4 });
    });
    assert.deepEqual(await saveProject(7, snapshot, 3), { saved: true, revision: 4 });
});

test('a stale save returns a conflict instead of reporting success', async (context) => {
    mockSession(context);
    context.mock.method(globalThis, 'fetch', async () => new Response('', { status: 409 }));
    assert.deepEqual(await saveProject(7, snapshot, 3), { saved: false, conflict: true });
});

test('failed saves reject and remote reads bypass the browser cache', async (context) => {
    mockSession(context);
    context.mock.method(globalThis, 'fetch', async () => new Response('', { status: 500 }));
    await assert.rejects(saveProject(7, snapshot, 3), /Save failed/);
    context.mock.method(globalThis, 'fetch', async (url: string, options: RequestInit) => {
        assert.equal(url, '/projects/7/state');
        assert.equal(options.cache, 'no-store');
        return Response.json({ project: { ...snapshot, id: 7, revision: 4 } });
    });
    assert.equal((await getProject(7)).revision, 4);
});

test('image uploads send the file and surface server validation errors', async (context) => {
    mockSession(context);
    const file = new File(['image'], 'image.png', { type: 'image/png' });
    context.mock.method(globalThis, 'fetch', async (url: string, options: RequestInit) => {
        assert.equal(url, '/projects/7/images');
        assert.equal(options.method, 'POST');
        assert.equal((options.body as FormData).get('image'), file);
        return Response.json(
            { errors: { image: ['Image dimensions are too large.'] } },
            { status: 422 },
        );
    });
    await assert.rejects(uploadProjectImage(7, file), /Image dimensions are too large/);
});
