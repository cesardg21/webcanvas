import { createScreenGroup } from '../../resources/js/lib/screens.ts';
import { linkTargets } from '../../resources/js/lib/screens.ts';
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { changeScreenUrl, linkScreens } from '../../resources/js/lib/screens.ts';

const desktop = {
    id: 'desktop',
    title: 'example.com',
    url: 'https://example.com/',
    x: 10,
    y: 20,
    width: 1440,
    height: 900,
};
const phone = { ...desktop, id: 'phone', width: 375, height: 812, x: 1600 };
const tablet = { ...desktop, id: 'tablet', width: 768, height: 1024, x: -800 };

test('three linked screens share address changes from any member without changing layout', () => {
    const pair = linkScreens([desktop, phone, tablet], 'phone', 'desktop', 'group-a');
    const group = linkScreens(pair, 'tablet', 'phone', 'unused-group');
    const changed = changeScreenUrl(group, 'tablet', 'https://example.org/path?q=test');
    assert.deepEqual(
        changed.map((screen) => screen.url),
        Array(3).fill('https://example.org/path?q=test'),
    );
    assert.deepEqual(
        changed.map((screen) => [screen.width, screen.height, screen.x, screen.y]),
        [desktop, phone, tablet].map((screen) => [screen.width, screen.height, screen.x, screen.y]),
    );
    assert.deepEqual(
        changed.map((screen) => screen.linkGroup),
        Array(3).fill('group-a'),
    );
});

test('unlinking isolates later URL changes and joining another group adopts its URL', () => {
    const linked = linkScreens(
        [desktop, phone, { ...tablet, url: 'https://example.org/' }],
        'phone',
        'desktop',
        'group-a',
    );
    const detached = linked.map((screen) =>
        screen.id === 'phone' ? { ...screen, linkGroup: null } : screen,
    );
    assert.equal(changeScreenUrl(detached, 'desktop', '')[1].url, 'https://example.com/');
    const joined = linkScreens(linked, 'phone', 'tablet', 'group-b');
    assert.equal(joined[1].url, 'https://example.org/');
    assert.equal(joined[0].url, 'https://example.com/');
    assert.equal(changeScreenUrl(joined, 'phone', '')[2].url, '');
});

test('stale linking targets and independent edits do not change unrelated screens', () => {
    const screens = [desktop, phone];
    assert.equal(linkScreens(screens, 'desktop', 'deleted', 'group'), screens);
    assert.equal(linkScreens(screens, 'desktop', 'desktop', 'group'), screens);
    assert.equal(changeScreenUrl(screens, 'deleted', ''), screens);
    assert.equal(changeScreenUrl(screens, 'phone', 'https://example.org/')[0], desktop);
});

test('link targets include other independent screens and exclude the current group', () => {
    const source = { id: 'source', title: 'Source', url: '', x: 0, y: 0, width: 1440, height: 900 };
    const independent = { ...source, id: 'independent' };
    const linked = { ...source, id: 'linked', linkGroup: 'group' };
    assert.deepEqual(
        linkTargets([source, independent, linked], source).map((screen) => screen.id),
        ['independent', 'linked'],
    );
    const groupedSource = { ...source, linkGroup: 'group' };
    assert.deepEqual(
        linkTargets([groupedSource, independent, linked], groupedSource).map((screen) => screen.id),
        ['independent'],
    );
});

test('screen group creates XS through Large in a spaced row sharing one URL group', () => {
    const screens = createScreenGroup({ x: 500, y: 700 }, 5, 12);
    assert.deepEqual(
        screens.map(({ width, height }) => [width, height]),
        [
            [375, 812],
            [640, 900],
            [768, 1024],
            [1024, 768],
        ],
    );
    assert.equal(new Set(screens.map((screen) => screen.id)).size, 4);
    assert.equal(new Set(screens.map((screen) => screen.linkGroup)).size, 1);
    assert.ok(screens[0].linkGroup);
    assert.deepEqual(
        screens.map((screen) => screen.zIndex),
        [12, 13, 14, 15],
    );
    assert.deepEqual(
        screens.map((screen) => screen.title),
        ['Screen 5', 'Screen 6', 'Screen 7', 'Screen 8'],
    );
    for (let index = 1; index < screens.length; index++) {
        assert.equal(screens[index].x - screens[index - 1].x - screens[index - 1].width, 80);
        assert.equal(screens[index].y, screens[0].y);
    }
    assert.equal((screens[0].x + screens[3].x + screens[3].width) / 2, 500);
    const updated = changeScreenUrl(screens, screens[0].id, 'https://example.com/');
    assert.ok(updated.every((screen) => screen.url === 'https://example.com/'));
});
