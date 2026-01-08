import { useStore } from '../core/store';
import { Users, Plus, Filter } from 'lucide-react';
import { KanbanBoard } from '../components/KanbanBoard';


export function TeamBoardView() {
    const { tasks, team } = useStore();
    const taskList = Object.values(tasks).filter(t => t.visibility === 'team');

    return (
        <div className="flex flex-col h-full bg-bg-app overflow-hidden p-6 md:p-8">
            <header className="mb-6 flex flex-col md:flex-row md:items-center justify-between gap-4 animate-enter">
                <div>
                    <h1 className="text-3xl font-display font-bold flex items-center gap-3 tracking-tight text-text-primary">
                        <Users className="w-8 h-8 text-accent-primary" />
                        Team Board
                    </h1>
                    <p className="text-text-muted text-sm mt-1 ml-11">
                        Track project velocity and collaborate with your team.
                    </p>
                </div>

                <div className="flex items-center gap-4 bg-bg-card border border-border-subtle p-2 rounded-xl shadow-sm">
                    <div className="flex -space-x-2 px-2">
                        {Object.values(team).slice(0, 5).map(member => (
                            <img
                                key={member.id}
                                src={member.avatar || `https://ui-avatars.com/api/?name=${member.name}`}
                                alt={member.name}
                                title={member.name}
                                className="w-8 h-8 rounded-full border-2 border-bg-card hover:scale-110 transition-transform cursor-pointer shadow-sm"
                            />
                        ))}
                        <button className="w-8 h-8 rounded-full bg-bg-input border-2 border-bg-card flex items-center justify-center text-text-muted hover:text-text-primary hover:bg-bg-card-hover transition-colors">
                            <Plus size={14} />
                        </button>
                    </div>
                    <div className="h-6 w-px bg-border-subtle" />
                    <button className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium text-text-muted hover:text-text-primary hover:bg-bg-input transition-colors">
                        <Filter size={16} /> <span className="hidden md:inline">Filter</span>
                    </button>
                </div>
            </header>

            <div className="flex-1 overflow-hidden -mx-2 px-2 pb-2">
                <KanbanBoard tasks={taskList} />
            </div>
        </div>
    );
}
