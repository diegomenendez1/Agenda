import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useStore } from '../core/store';
import { FolderPlus, MoreHorizontal, Folder } from 'lucide-react';
import { format } from 'date-fns';

export function ProjectsView() {
    const { projects, addProject } = useStore();
    const [isCreating, setIsCreating] = useState(false);
    const [newProjectName, setNewProjectName] = useState('');
    const navigate = useNavigate();

    const handleCreate = (e: React.FormEvent) => {
        e.preventDefault();
        if (!newProjectName.trim()) return;
        addProject(newProjectName);
        setNewProjectName('');
        setIsCreating(false);
    };

    const projectList = Object.values(projects).sort((a, b) => b.createdAt - a.createdAt);

    return (
        <div className="flex flex-col h-full p-8 w-full max-w-6xl mx-auto">
            <header className="mb-8 flex items-center justify-between">
                <h1 className="text-2xl font-bold flex items-center gap-md">
                    <Folder className="w-8 h-8 text-accent-primary" />
                    Projects
                </h1>
                <button
                    onClick={() => setIsCreating(true)}
                    className="btn btn-primary"
                >
                    <FolderPlus size={16} /> New Project
                </button>
            </header>

            {isCreating && (
                <div className="mb-8 p-4 bg-bg-card rounded-lg border border-border-focus animate-in fade-in slide-in-from-top-4">
                    <form onSubmit={handleCreate} className="flex gap-4">
                        <input
                            autoFocus
                            type="text"
                            placeholder="Project Name"
                            className="input flex-1"
                            value={newProjectName}
                            onChange={e => setNewProjectName(e.target.value)}
                        />
                        <button type="submit" className="btn btn-primary">Create</button>
                        <button type="button" onClick={() => setIsCreating(false)} className="btn">Cancel</button>
                    </form>
                </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 overflow-y-auto pb-10">
                {projectList.map(project => (
                    <div
                        key={project.id}
                        onClick={() => navigate(`/projects/${project.id}`)}
                        className="group bg-bg-card p-6 rounded-xl border border-border-subtle hover:border-border-focus transition-all hover:shadow-lg flex flex-col h-48 cursor-pointer"
                    >
                        <div className="flex items-start justify-between mb-4">
                            <div className="bg-bg-input p-2 rounded-lg text-accent-primary">
                                <Folder size={20} />
                            </div>
                            <button className="text-muted hover:text-primary opacity-0 group-hover:opacity-100 transition-opacity">
                                <MoreHorizontal size={20} />
                            </button>
                        </div>

                        <h3 className="text-lg font-semibold mb-2">{project.name}</h3>
                        <p className="text-muted text-sm line-clamp-2 flex-1">
                            {project.goal || "No specific goal defined."}
                        </p>

                        <div className="mt-4 pt-4 border-t border-border-subtle flex items-center justify-between text-xs text-muted">
                            <span>{project.status}</span>
                            <span>{format(project.createdAt, 'MMM d')}</span>
                        </div>
                    </div>
                ))}

                {projectList.length === 0 && !isCreating && (
                    <div className="col-span-full text-center py-20 text-muted border-2 border-dashed border-border-subtle rounded-xl">
                        <Folder size={48} className="mx-auto mb-4 opacity-50" />
                        <p className="text-lg">No projects yet</p>
                        <p className="text-sm">Create one to organize your tasks</p>
                    </div>
                )}
            </div>
        </div>
    );
}
