import { useStore } from '../core/store';
import { Users, Plus } from 'lucide-react';
import { KanbanBoard } from '../components/KanbanBoard';

export function TeamBoardView() {
    const { tasks, team } = useStore();
    const taskList = Object.values(tasks).filter(t => t.visibility === 'team');

    return (
        <div className="flex flex-col h-full bg-bg-app overflow-hidden">
            <header className="px-8 py-6 border-b border-border-subtle flex justify-between items-center bg-bg-app/50 backdrop-blur-sm z-10">
                <div>
                    <h1 className="text-2xl font-bold flex items-center gap-3">
                        <Users className="w-6 h-6 text-violet-500" />
                        Team Board
                    </h1>
                    <p className="text-text-muted text-sm mt-1">
                        Track project velocity and team assignments.
                    </p>
                </div>
                <div className="flex items-center gap-2">
                    <span className="text-xs text-text-muted mr-2">Team Members:</span>
                    <div className="flex -space-x-2">
                        {Object.values(team).map(member => (
                            <img
                                key={member.id}
                                src={member.avatar}
                                alt={member.name}
                                title={member.name}
                                className="w-8 h-8 rounded-full border-2 border-bg-app hover:scale-110 transition-transform cursor-pointer"
                            />
                        ))}
                        <button className="w-8 h-8 rounded-full bg-bg-card border border-dashed border-border-subtle flex items-center justify-center text-text-muted hover:text-text-primary hover:border-violet-500 transition-colors">
                            <Plus size={14} />
                        </button>
                    </div>
                </div>
            </header>

            <div className="flex-1 overflow-hidden p-6">
                <KanbanBoard tasks={taskList} />
            </div>
        </div>
    );
}
