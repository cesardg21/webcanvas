# Webcanvas

A local workspace for arranging live websites side by side on project canvases.

## Stack

Laravel 13, Inertia 2, React 19, TypeScript, Tailwind CSS 4, and shadcn/ui (Radix). SQLite stores projects, screens, and viewport state.

## Run locally

Requirements: PHP 8.3+, Composer, and Node.js compatible with Vite 8 (22.12+ or 24+).

```sh
composer setup
```

On a fresh checkout, `composer setup` installs dependencies, creates `.env`, generates an application key, runs migrations, and builds assets. If SQLite asks to create its database file, accept.

Start the backend:

```sh
php artisan serve --host=127.0.0.1 --port=8000
```

For frontend hot reload, in another terminal:

```sh
npm run dev
```

Open http://127.0.0.1:8000. Without the Vite dev server, Laravel uses the latest `npm run build` output.

## Use

- Create a project from the library; each project is a separate canvas.
- Add blank screens or enter HTTP/HTTPS URLs. New screens have a 1440 × 900 content viewport.
- Drag a screen's label, browser chrome, or inactive content to move it. Drag its bottom-right handle to resize (320–3840 wide, 240–2160 high).
- Click **Interact with website** or double-click the screen to use its links and forms. Click the canvas to return to arranging screens.
- Pan by dragging the background, using the hand tool, holding Space while dragging, or scrolling. Ctrl/Cmd + scroll zooms around the pointer.
- Toolbar buttons provide back-to-projects, select, hand, add screen, zoom, 100%, and fit all.
- Shortcuts: V select, H hand, Space pan, +/− zoom, 0 fit all, 1 actual size.
- Screen chrome supports URL changes, reload, duplicate, open in a new tab, and delete.
- Rename the project at the upper left. Changes save automatically; failed saves display a retry action. Leaving through the toolbar flushes pending changes.
- Search projects or delete them from the library.

## Scope and constraints

This is a **local single-user app**, without authentication or per-user authorization. All users of the same server share the project library. Keep the server bound to loopback; add authentication and project ownership before hosting it for others.

Websites are loaded directly in sandboxed browser iframes. Sites with restrictive CSP `frame-ancestors` or `X-Frame-Options` cannot be embedded. An **open in new tab** fallback is always available. Embedding restrictions are not bypassed; cross-origin iframe failure cannot be reliably detected. Third-party cookies, authentication, popups, and navigation also follow the browser's policies. URL changes within an embedded site are not reflected in its address field because the parent cannot read cross-origin navigation.

The app supports up to 100 screens per project and 10–200% canvas zoom. Many live websites can use significant memory. Concurrent edits to one project from multiple tabs use last-write-wins; collaboration and undo/redo are not implemented.

## Checks

```sh
npm run typecheck
npm run build
php artisan test
```

Feature tests cover project lifecycle, screen/viewport persistence, blank screens, URL validation, duplicate IDs, and invalid zoom rejection. Tests use an isolated in-memory SQLite database.
