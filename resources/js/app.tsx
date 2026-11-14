import '../css/app.css';
import { createInertiaApp } from '@inertiajs/react';
import { createRoot } from 'react-dom/client';

createInertiaApp({
    title: title => `${title} — Webcanvas`,
    resolve: name => name === 'Projects' ? import('./pages/Projects') : import('./pages/Canvas'),
    setup({ el, App, props }) { createRoot(el).render(<App {...props} />); },
    progress: { color: '#2563eb' },
});
