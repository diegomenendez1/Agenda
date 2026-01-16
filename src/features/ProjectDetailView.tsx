import { useState, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useStore } from '../core/store';
import { ArrowLeft, Folder, Plus, LayoutList, Kanban as KanbanIcon, StickyNote, TrendingUp, Trash2 } from 'lucide-react';
import { TaskItem } from '../components/TaskItem';
import { BurndownChart } from '../components/BurndownChart';
import type { TaskStatus } from '../core/types';
import clsx from 'clsx';
import { format } from 'date-fns';

export function ProjectDetailView() {
    const { projectId } = useParams<{ projectId: string }>();
    const navigate = useNavigate();
    const { projects, tasks, notes, addTask, updateTask, deleteProject } = useStore();

    const [newTaskTitle, setNewTaskTitle] = useState('');
    const [viewMode, setViewMode] = useState<'list' | 'board' | 'notes' | 'analytics'>('list');

    const project = projectId ? projects[projectId] : null;

    const projectTasks = useMemo(() => {
        if (!projectId) return [];
        const priorityScore: Record<string, number> = { critical: 4, high: 3, medium: 2, low: 1 };
        return Object.values(tasks)
            .filter(t => t.projectId === projectId)
            .sort((a, b) => {
                // Sort by status, priority, creation
                if (a.status !== b.status) return a.status === 'done' ? 1 : -1;

                const pA = priorityScore[a.priority] || 0;
                const pB = priorityScore[b.priority] || 0;

                if (pA !== pB) return pB - pA;
                return (b.createdAt || 0) - (a.createdAt || 0);
            });
    }, [tasks, projectId]);

    const projectNotes = useMemo(() => {
        if (!projectId) return [];
        return Object.values(notes)
            .filter(n => n.projectId === projectId)
            .sort((a, b) => b.updatedAt - a.updatedAt);
    }, [notes, projectId]);

    const handleQuickAdd = (e: React.FormEvent) => {
        e.preventDefault();
        if (!newTaskTitle.trim() || !projectId) return;

        addTask({
            title: newTaskTitle,
            projectId: projectId,
            priority: 'medium', // Default priority
            status: 'todo'
        });
        setNewTaskTitle('');
    };

    const handleDelete = async () => {
        if (!projectId || !project) return;
        if (window.confirm(`Are you sure you want to delete "${project.name}"? This will remove the project from your view.`)) {
            await deleteProject(projectId);
            navigate('/projects');
        }
    };

    // Kanban DnD Handlers
    const handleDragStart = (e: React.DragEvent, taskId: string) => {
        e.dataTransfer.setData('taskId', taskId);
        e.dataTransfer.effectAllowed = 'move';
    };

    const handleDragOver = (e: React.DragEvent) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
    };

    const handleDrop = (e: React.DragEvent, status: TaskStatus) => {
        e.preventDefault();
        const taskId = e.dataTransfer.getData('taskId');
        if (taskId) {
            updateTask(taskId, { status });
        }
    };

    if (!project) {
        return (
            <div className="flex flex-col items-center justify-center h-full text-muted">
                <h2 className="text-xl font-bold mb-2">Project Not Found</h2>
                <button onClick={() => navigate('/projects')} className="btn btn-primary">
                    Back to Projects
                </button>
            </div>
        );
    }

    // Calculate stats
    const total = projectTasks.length;
    const completed = projectTasks.filter(t => t.status === 'done').length;
    const progress = total === 0 ? 0 : Math.round((completed / total) * 100);

    const columns: { id: TaskStatus; label: string }[] = [
        { id: 'todo', label: 'To Do' },
        { id: 'in_progress', label: 'In Progress' },
        { id: 'review', label: 'Review' },
        { id: 'done', label: 'Done' },
    ];

    return (
        <div className="flex flex-col h-full overflow-hidden">
            {/* Header */}
            <header className="px-8 py-6 border-b border-border-subtle bg-bg-card/30 flex-shrink-0">
                <button
                    onClick={() => navigate('/projects')}
                    className="text-muted hover:text-primary mb-4 flex items-center gap-2 text-sm transition-colors"
                >
                    <ArrowLeft size={16} /> Back to Projects
                </button>

                <div className="flex items-start justify-between mb-6">
                    <div>
                        <div className="flex items-center gap-3 mb-2">
                            <Folder className="text-accent-primary w-6 h-6" />
                            <h1 className="text-2xl font-bold">{project.name}</h1>
                        </div>
                        <p className="text-muted max-w-2xl">
                            {project.goal || "No specific goal defined for this project."}
                        </p>
                    </div>

                    <div className="flex gap-2 bg-bg-card border border-border-subtle rounded-lg p-1">
                        <button
                            onClick={() => setViewMode('list')}
                            className={clsx(
                                "p-2 rounded transition-colors",
                                viewMode === 'list' ? "bg-accent-primary text-white" : "text-muted hover:text-primary"
                            )}
                            title="List View"
                        >
                            <LayoutList size={20} />
                        </button>
                        <button
                            onClick={() => setViewMode('board')}
                            className={clsx(
                                "p-2 rounded transition-colors",
                                viewMode === 'board' ? "bg-accent-primary text-white" : "text-muted hover:text-primary"
                            )}
                            title="Board View"
                        >
                            <KanbanIcon size={20} />
                        </button>
                        <button
                            onClick={() => setViewMode('notes')}
                            className={clsx(
                                "p-2 rounded transition-colors",
                                viewMode === 'notes' ? "bg-accent-primary text-white" : "text-muted hover:text-primary"
                            )}
                            title="Project Notes"
                        >
                            <StickyNote size={20} />
                        </button>
                        <button
                            onClick={() => setViewMode('analytics')}
                            className={clsx(
                                "p-2 rounded transition-colors",
                                viewMode === 'analytics' ? "bg-accent-primary text-white" : "text-muted hover:text-primary"
                            )}
                            title="Analytics & Burndown"
                        >
                            <TrendingUp size={20} />
                        </button>
                    </div>

                    <button
                        onClick={handleDelete}
                        className="p-2 ml-2 rounded-lg text-red-500 hover:bg-red-500/10 transition-colors border border-transparent hover:border-red-500/20"
                        title="Delete Project"
                    >
                        <Trash2 size={20} />
                    </button>
                </div>

                {/* Progress Bar */}
                <div className="flex items-center gap-4 text-sm text-muted">
                    <div className="flex-1 h-2 bg-bg-input rounded-full overflow-hidden">
                        <div
                            className="h-full bg-accent-primary transition-all duration-500 ease-out"
                            style={{ width: `${progress}%` }}
                        />
                    </div>
                    <span className="font-mono">{completed}/{total} tasks</span>
                </div>
            </header>

            {/* Quick Add (Visible in list/board views) */}
            {(viewMode === 'list' || viewMode === 'board') && (
                <div className="px-8 pt-6 pb-2 flex-shrink-0">
                    <form onSubmit={handleQuickAdd} className="relative max-w-4xl mx-auto w-full">
                        <div className="absolute left-4 top-1/2 -translate-y-1/2 text-muted">
                            <Plus size={20} />
                        </div>
                        <input
                            type="text"
                            value={newTaskTitle}
                            onChange={(e) => setNewTaskTitle(e.target.value)}
                            placeholder={`Add task to ${project.name}...`}
                            className="w-full bg-bg-card border border-border-subtle rounded-lg py-3 pl-12 pr-4 focus:border-accent-primary outline-none transition-all placeholder:text-muted/50"
                        />
                    </form>
                </div>
            )}


            {/* Content Area */}
            <div className="flex-1 overflow-hidden">
                {viewMode === 'list' && (
                    <div className="h-full overflow-y-auto p-8 pt-4">
                        <div className="max-w-4xl mx-auto">
                            {projectTasks.length === 0 ? (
                                <div className="text-center py-12 text-muted border border-dashed border-border-subtle rounded-lg">
                                    <p>No tasks in this project yet.</p>
                                </div>
                            ) : (
                                <ul className="flex flex-col gap-2 pb-20">
                                    {projectTasks.map(task => (
                                        <TaskItem key={task.id} task={task} showProject={false} />
                                    ))}
                                </ul>
                            )}
                        </div>
                    </div>
                )}

                {viewMode === 'board' && (
                    <div className="h-full overflow-x-auto p-8 pt-4">
                        <div className="flex gap-6 h-full min-w-max pb-4">
                            {columns.map(col => (
                                <div
                                    key={col.id}
                                    className="w-80 flex flex-col bg-bg-card/50 rounded-xl border border-border-subtle/50"
                                    onDragOver={handleDragOver}
                                    onDrop={(e) => handleDrop(e, col.id)}
                                >
                                    <header className="p-4 border-b border-border-subtle/30 flex justify-between items-center">
                                        <h3 className="font-medium text-text-secondary">{col.label}</h3>
                                        <span className="text-xs bg-bg-input px-2 py-0.5 rounded-full text-muted">
                                            {projectTasks.filter(t => t.status === col.id).length}
                                        </span>
                                    </header>

                                    <div className="flex-1 overflow-y-auto p-3 flex flex-col gap-3">
                                        {projectTasks.filter(t => t.status === col.id).map(task => (
                                            <div
                                                key={task.id}
                                                draggable
                                                onDragStart={(e) => handleDragStart(e, task.id)}
                                                className="cursor-move"
                                            >
                                                <TaskItem task={task} showProject={false} compact />
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {viewMode === 'notes' && (
                    <div className="h-full overflow-y-auto p-8 pt-4">
                        <div className="max-w-4xl mx-auto">
                            {projectNotes.length === 0 ? (
                                <div className="text-center py-12 text-muted border border-dashed border-border-subtle rounded-lg">
                                    <p>No notes linked to this project.</p>
                                </div>
                            ) : (
                                <ul className="grid grid-cols-2 gap-4 pb-20">
                                    {projectNotes.map(note => (
                                        <li
                                            key={note.id}
                                            onClick={() => navigate(`/notes/${note.id}`)}
                                            className="p-4 rounded-lg bg-bg-card border border-border-subtle hover:border-accent-primary cursor-pointer transition-all group"
                                        >
                                            <div className="flex items-start justify-between mb-2">
                                                <h3 className="font-medium truncate pr-2">{note.title || "Untitled Note"}</h3>
                                                <StickyNote size={14} className="text-muted group-hover:text-accent-primary" />
                                            </div>
                                            <p className="text-sm text-muted line-clamp-3 h-12 mb-3">
                                                {note.body || "No content..."}
                                            </p>
                                            <div className="text-xs text-muted/50">
                                                {format(note.updatedAt, 'MMM d, yyyy')}
                                            </div>
                                        </li>
                                    ))}
                                </ul>
                            )}
                        </div>
                    </div>
                )}

                {viewMode === 'analytics' && (
                    <div className="h-full overflow-y-auto p-8 pt-4">
                        <div className="max-w-4xl mx-auto space-y-8">
                            <div className="glass-panel p-6 rounded-2xl border border-border-subtle shadow-sm">
                                <h2 className="text-xl font-bold mb-2 flex items-center gap-2">
                                    <TrendingUp className="text-accent-primary" />
                                    Burn-down Chart
                                </h2>
                                <p className="text-muted mb-6">Tracking remaining tasks against the ideal completion rate.</p>

                                <div className="bg-bg-app/50 p-4 rounded-xl border border-border-subtle h-[300px] flex flex-col justify-end pb-8">
                                    <BurndownChart
                                        tasks={projectTasks}
                                        startDate={project.createdAt} // Fallback to createdAt
                                        // TODO: Add deadline to project model for better charts
                                        height={300}
                                    />
                                </div>
                                <div className="flex justify-center gap-8 mt-4 text-sm">
                                    <div className="flex items-center gap-2">
                                        <div className="w-3 h-0.5 border-t-2 border-dashed border-text-muted"></div>
                                        <span className="text-muted">Ideal Pace</span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <div className="w-3 h-0.5 bg-accent-primary"></div>
                                        <span className="text-accent-primary font-medium">Actual Remaining</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
