import { ProjectCard } from '@/components/project-card';
import { Button } from '@/components/ui/button';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import type { Project } from '@/types';
import { Head, Link, router, useForm } from '@inertiajs/react';
import { ArrowRight, LayoutGrid, PanelsTopLeft, Plus, Search } from 'lucide-react';
import { useState } from 'react';

export default function Projects({
    projects,
    release,
}: {
    projects: Project[];
    release: { version: string; build: string; isLocal: boolean };
}) {
    const [query, setQuery] = useState('');
    const [open, setOpen] = useState(false);
    const [deleting, setDeleting] = useState<Project | null>(null);
    const form = useForm({ name: '' });
    const filtered = projects.filter((p) => p.name.toLowerCase().includes(query.toLowerCase()));
    return (
        <div className="library">
            <Head title="Projects" />
            <header className="library-header">
                <Link href="/" className="brand">
                    <span className="brand-icon">
                        <PanelsTopLeft size={21} />
                    </span>
                    webcanvas
                </Link>
                <div className="flex items-center gap-3 text-xs text-slate-500">
                    <span>
                        v{release.version} · Build {release.build}
                    </span>
                    {release.isLocal && (
                        <span className="rounded border border-blue-200 bg-blue-50 px-2 py-1 text-[10px] font-semibold tracking-widest text-blue-600">
                            LOCAL
                        </span>
                    )}
                </div>
            </header>
            <main className="library-main">
                <div className="library-heading">
                    <div>
                        <h1>Projects</h1>
                    </div>
                    <Button onClick={() => setOpen(true)} className="primary-button">
                        <Plus size={17} /> New project
                    </Button>
                </div>
                <div className="projects-bar">
                    <h2>
                        <LayoutGrid size={18} /> All projects <span>{projects.length}</span>
                    </h2>
                    <div className="search">
                        <Search size={16} />
                        <Input
                            aria-label="Search projects"
                            placeholder="Search projects…"
                            value={query}
                            onChange={(e) => setQuery(e.target.value)}
                        />
                    </div>
                </div>
                <div className="project-grid">
                    {filtered.map((project, index) => (
                        <ProjectCard
                            key={project.id}
                            project={project}
                            index={index}
                            onDelete={setDeleting}
                        />
                    ))}
                    {!query && (
                        <button className="new-project-card" onClick={() => setOpen(true)}>
                            <span>
                                <Plus size={23} />
                            </span>
                            <strong>Create a new project</strong>
                            <small>A blank canvas. Endless possibilities.</small>
                        </button>
                    )}
                </div>
                {query && !filtered.length && (
                    <div className="no-results">No projects match “{query}”.</div>
                )}
            </main>
            <Dialog open={open} onOpenChange={setOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>A new space to explore</DialogTitle>
                        <DialogDescription>
                            Give your canvas a name. You can change it anytime.
                        </DialogDescription>
                    </DialogHeader>
                    <form
                        onSubmit={(e) => {
                            e.preventDefault();
                            form.post('/projects');
                        }}
                        className="dialog-form"
                    >
                        <label htmlFor="project-name">Project name</label>
                        <Input
                            id="project-name"
                            placeholder="e.g. Design inspiration"
                            maxLength={120}
                            autoFocus
                            value={form.data.name}
                            onChange={(e) => form.setData('name', e.target.value)}
                            required
                        />
                        {form.errors.name && <p className="error">{form.errors.name}</p>}
                        <Button disabled={form.processing}>
                            Create project <ArrowRight size={16} />
                        </Button>
                    </form>
                </DialogContent>
            </Dialog>
            <Dialog open={!!deleting} onOpenChange={(v) => !v && setDeleting(null)}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Delete {deleting?.name}?</DialogTitle>
                        <DialogDescription>
                            This removes the canvas and all its screens. This cannot be undone.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="dialog-actions">
                        <Button variant="outline" onClick={() => setDeleting(null)}>
                            Cancel
                        </Button>
                        <Button
                            variant="destructive"
                            onClick={() => {
                                router.delete(`/projects/${deleting!.id}`);
                                setDeleting(null);
                            }}
                        >
                            Delete project
                        </Button>
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    );
}
