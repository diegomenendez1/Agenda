import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useStore } from '../core/store';
import { FolderPlus, Folder, ArrowRight } from 'lucide-react';
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
        <div className="flex flex-col h-full w-full max-w-7xl mx-auto p-6 md:p-10">
            <header className="mb-10 flex flex-col md:flex-row md:items-center justify-between gap-6 animate-enter">
                <div>
                    <h1 className="text-3xl font-display font-bold flex items-center gap-3 tracking-tight text-text-primary mb-2">
                        <div className="w-10 h-10 rounded-xl bg-accent-primary/10 flex items-center justify-center shadow-inner">
                            <Folder className="w-6 h-6 text-accent-primary" />
                        </div>
                        Projects
                    </h1>
                    <p className="text-text-muted text-lg font-light ml-1">
                        Organize your tasks into high-level goals.
                    </p>
                </div>

                <button
                    onClick={() => setIsCreating(true)}
                    className="btn btn-primary shadow-lg shadow-accent-primary/20"
                >
                    <FolderPlus size={18} className="mr-2" /> New Project
                </button>
            </header>

            {isCreating && (
                <div className="mb-8 p-6 bg-bg-card rounded-2xl border border-accent-primary/20 shadow-lg shadow-accent-primary/5 animate-in fade-in slide-in-from-top-4 relative overflow-hidden">
                    <div className="absolute left-0 top-0 w-1 h-full bg-accent-primary" />
                    <h3 className="text-sm font-bold uppercase text-accent-primary tracking-wider mb-4">Create New Project</h3>
                    <form onSubmit={handleCreate} className="flex gap-4 items-end">
                        <div className="flex-1">
                            <label className="block text-xs font-semibold text-text-muted mb-1.5 ml-1">Project Name</label>
                            <input
                                autoFocus
                                type="text"
                                placeholder="e.g., Marketing Campaign Q1"
                                className="input w-full text-lg"
                                value={newProjectName}
                                onChange={e => setNewProjectName(e.target.value)}
                            />
                        </div>
                        <div className="flex gap-2">
                            <button type="button" onClick={() => setIsCreating(false)} className="btn btn-ghost">Cancel</button>
                            <button type="submit" className="btn btn-primary min-w-[100px]">Create</button>
                        </div>
                    </form>
                </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 overflow-y-auto pb-10 -mx-2 px-2">
                {projectList.map(project => (
                    <div
                        key={project.id}
                        onClick={() => navigate(`/projects/${project.id}`)}
                        className="group bg-bg-card p-6 rounded-2xl border border-border-subtle hover:border-accent-primary/40 transition-all duration-300 hover:shadow-xl hover:shadow-accent-primary/5 hover:-translate-y-1 cursor-pointer flex flex-col h-64 relative overflow-hidden"
                    >
                        <div className="absolute top-0 right-0 p-4 opacity-0 group-hover:opacity-100 transition-opacity">
                            <div className="bg-bg-input p-1.5 rounded-lg text-text-muted hover:text-text-primary">
                                <ArrowRight size={20} className="-rotate-45" />
                            </div>
                        </div>

                        <div className="flex items-start justify-between mb-5">
                            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-bg-input to-bg-card border border-border-subtle flex items-center justify-center text-accent-secondary group-hover:text-accent-primary group-hover:scale-110 transition-all shadow-sm">
                                <Folder size={24} />
                            </div>
                        </div>

                        <h3 className="text-xl font-bold mb-2 text-text-primary group-hover:text-accent-primary transition-colors">{project.name}</h3>
                        <p className="text-text-muted text-sm line-clamp-2 flex-1 leading-relaxed pb-1">
                            {project.goal || "No specific goal defined yet."}
                        </p>

                        <div className="mt-4 pt-4 border-t border-border-subtle flex items-center justify-between text-xs font-medium text-text-secondary">
                            <span className="bg-bg-input px-2 py-1 rounded-md capitalize">{project.status}</span>
                            <span className="font-mono opacity-70">{format(project.createdAt, 'MMM d, yyyy')}</span>
                        </div>
                    </div>
                ))}

                {projectList.length === 0 && !isCreating && (
                    <div className="col-span-full flex flex-col items-center justify-center py-24 text-text-muted border-2 border-dashed border-border-subtle rounded-3xl bg-bg-sidebar/30">
                        <div className="w-20 h-20 bg-bg-input rounded-full flex items-center justify-center mb-6">
                            <Folder size={40} className="opacity-30" />
                        </div>
                        <h3 className="text-xl font-semibold text-text-primary pb-2">No projects yet</h3>
                        <p className="text-sm max-w-xs text-center leading-relaxed">Create a project to organize your tasks and track high-level goals.</p>
                        <button onClick={() => setIsCreating(true)} className="btn btn-secondary mt-6">Create your first project</button>
                    </div>
                )}
            </div>
        </div>
    );
}
