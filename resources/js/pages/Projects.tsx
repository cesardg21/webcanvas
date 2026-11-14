import { Head, Link, router, useForm } from '@inertiajs/react';
import { useState } from 'react';
import { ArrowUpRight, Search, Plus, PanelsTopLeft, LayoutGrid, Monitor, Trash2, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import type { Project } from '@/types';

export default function Projects({ projects, release }: { projects: Project[]; release: { version: string; build: string; isLocal: boolean } }) {
    const [query, setQuery] = useState('');
    const [open, setOpen] = useState(false);
    const [deleting, setDeleting] = useState<Project | null>(null);
    const form = useForm({ name: '' });
    const filtered = projects.filter(p => p.name.toLowerCase().includes(query.toLowerCase()));
    return <div className="library"><Head title="Projects" />
        <header className="library-header"><Link href="/" className="brand"><span className="brand-icon"><PanelsTopLeft size={21} /></span>webcanvas</Link><div className="flex items-center gap-3 text-xs text-slate-500"><span>v{release.version} · Build {release.build}</span>{release.isLocal && <span className="rounded border border-blue-200 bg-blue-50 px-2 py-1 text-[10px] font-semibold tracking-widest text-blue-600">LOCAL</span>}</div></header>
        <main className="library-main">
            <div className="library-heading"><div><h1>Projects</h1></div><Button onClick={() => setOpen(true)} className="primary-button"><Plus size={17} /> New project</Button></div>
            <div className="projects-bar"><h2><LayoutGrid size={18} /> All projects <span>{projects.length}</span></h2><div className="search"><Search size={16} /><Input aria-label="Search projects" placeholder="Search projects…" value={query} onChange={e => setQuery(e.target.value)} /></div></div>
            <div className="project-grid">{filtered.map((project, index) => <article className="project-card" key={project.id}><Link href={`/projects/${project.id}`} className="project-preview" style={{ backgroundColor: ['#eaf1fc', '#edf0f7', '#e8f0f7'][index % 3] }}><div className="preview-dots" />{project.screens.length ? <div className="preview-windows">{project.screens.slice(0, 3).map(s => <div key={s.id} className="preview-window"><div><i /><i /><i /></div><Monitor size={25} /><span>{s.url ? new URL(s.url).hostname : s.title}</span></div>)}</div> : <div className="blank-preview"><PanelsTopLeft size={30} /><span>A space for possibilities</span></div>}<span className="open-project"><ArrowUpRight size={18} /></span></Link><div className="project-info"><Link href={`/projects/${project.id}`}><h3>{project.name}</h3><p>{project.screens.length} {project.screens.length === 1 ? 'screen' : 'screens'}<span>·</span>{new Date(project.updated_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}</p></Link><Button variant="ghost" size="icon" aria-label={`Delete ${project.name}`} onClick={() => setDeleting(project)}><Trash2 size={15} /></Button></div></article>)}
            {!query && <button className="new-project-card" onClick={() => setOpen(true)}><span><Plus size={23} /></span><strong>Create a new project</strong><small>A blank canvas. Endless possibilities.</small></button>}</div>
            {query && !filtered.length && <div className="no-results">No projects match “{query}”.</div>}
        </main>
        <Dialog open={open} onOpenChange={setOpen}><DialogContent><DialogHeader><DialogTitle>A new space to explore</DialogTitle><DialogDescription>Give your canvas a name. You can change it anytime.</DialogDescription></DialogHeader><form onSubmit={e => { e.preventDefault(); form.post('/projects'); }} className="dialog-form"><label htmlFor="project-name">Project name</label><Input id="project-name" placeholder="e.g. Design inspiration" maxLength={120} autoFocus value={form.data.name} onChange={e => form.setData('name', e.target.value)} required />{form.errors.name && <p className="error">{form.errors.name}</p>}<Button disabled={form.processing}>Create project <ArrowRight size={16} /></Button></form></DialogContent></Dialog>
        <Dialog open={!!deleting} onOpenChange={v => !v && setDeleting(null)}><DialogContent><DialogHeader><DialogTitle>Delete {deleting?.name}?</DialogTitle><DialogDescription>This removes the canvas and all its screens. This cannot be undone.</DialogDescription></DialogHeader><div className="dialog-actions"><Button variant="outline" onClick={() => setDeleting(null)}>Cancel</Button><Button variant="destructive" onClick={() => { router.delete(`/projects/${deleting!.id}`); setDeleting(null); }}>Delete project</Button></div></DialogContent></Dialog>
    </div>;
}
