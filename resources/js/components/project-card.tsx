import { Button } from '@/components/ui/button';
import { itemLabels } from '@/lib/items';
import type { Project } from '@/types';
import { Link } from '@inertiajs/react';
import { ArrowUpRight, Monitor, PanelsTopLeft, Trash2 } from 'lucide-react';

type Props = { project: Project; index: number; onDelete: (project: Project) => void };
export function ProjectCard({ project, index, onDelete }: Props) {
    return (
        <article className="project-card">
            <Link
                href={`/projects/${project.id}`}
                className="project-preview"
                style={{ backgroundColor: ['#eaf1fc', '#edf0f7', '#e8f0f7'][index % 3] }}
            >
                <div className="preview-dots" />
                {project.screens.length ? (
                    <div className="preview-windows">
                        {project.screens.slice(0, 3).map((s) => (
                            <div key={s.id} className="preview-window">
                                <div>
                                    <i />
                                    <i />
                                    <i />
                                </div>
                                <Monitor size={25} />
                                <span>{s.url ? new URL(s.url).hostname : s.title}</span>
                            </div>
                        ))}
                    </div>
                ) : project.items?.length ? (
                    <div className="preview-windows">
                        {project.items.slice(0, 3).map((item) => (
                            <div
                                className="preview-window"
                                key={item.id}
                                style={{
                                    background: item.kind === 'note' ? item.color : undefined,
                                }}
                            >
                                <PanelsTopLeft size={25} />
                                <span>{itemLabels[item.kind]}</span>
                            </div>
                        ))}
                    </div>
                ) : (
                    <div className="blank-preview">
                        <PanelsTopLeft size={30} />
                        <span>A space for possibilities</span>
                    </div>
                )}
                <span className="open-project">
                    <ArrowUpRight size={18} />
                </span>
            </Link>
            <div className="project-info">
                <Link href={`/projects/${project.id}`}>
                    <h3>{project.name}</h3>
                    <p>
                        {project.screens.length + (project.items?.length ?? 0)}{' '}
                        {project.screens.length + (project.items?.length ?? 0) === 1
                            ? 'item'
                            : 'items'}
                        <span>·</span>
                        {new Date(project.updated_at).toLocaleDateString(undefined, {
                            month: 'short',
                            day: 'numeric',
                        })}
                    </p>
                </Link>
                <Button
                    variant="ghost"
                    size="icon"
                    aria-label={`Delete ${project.name}`}
                    onClick={() => onDelete(project)}
                >
                    <Trash2 size={15} />
                </Button>
            </div>
        </article>
    );
}
