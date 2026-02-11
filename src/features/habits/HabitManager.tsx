import React, { useState } from 'react';
import { useStore } from '../../core/store';
import { Trash2, Plus, Clock, Sun, Calendar } from 'lucide-react';
import clsx from 'clsx';


export const HabitManager = () => {
    const { habits, addHabit, deleteHabit } = useStore();
    const [isAdding, setIsAdding] = useState(false);
    const [newHabitName, setNewHabitName] = useState('');

    // Sort items by creation for now
    const habitList = Object.values(habits).sort((a, b) => b.createdAt - a.createdAt);

    const handleAdd = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newHabitName.trim()) return;

        await addHabit({
            name: newHabitName,
            frequency: 'daily',
            durationMinutes: 30,
            priority: 'medium',
            flexibleWindow: { start: '09:00', end: '17:00' },
            color: '#6366f1' // default indigo
        });

        setNewHabitName('');
        setIsAdding(false);
    };

    return (
        <div className="flex flex-col h-full">
            <div className="flex justify-between items-center mb-4">
                <h3 className="text-sm font-medium text-text-secondary uppercase tracking-wider">Smart Habits</h3>
                <button
                    onClick={() => setIsAdding(!isAdding)}
                    className="text-accent-primary hover:bg-accent-primary/10 p-1 rounded transition-colors"
                >
                    <Plus className={clsx("w-4 h-4 transition-transform", isAdding && "rotate-45")} />
                </button>
            </div>

            {isAdding && (
                <form onSubmit={handleAdd} className="mb-4 p-3 bg-bg-card border border-accent-primary/20 rounded-lg shadow-sm animate-in fade-in slide-in-from-top-2">
                    <input
                        autoFocus
                        type="text"
                        placeholder="e.g., Morning Run"
                        className="w-full text-sm border-none focus:ring-0 p-0 mb-2 placeholder:text-text-muted font-medium bg-transparent text-text-primary"
                        value={newHabitName}
                        onChange={e => setNewHabitName(e.target.value)}
                    />
                    <div className="flex justify-between items-center">
                        <span className="text-xs text-text-muted">Daily • 30m</span>
                        <button type="submit" className="text-xs bg-accent-primary text-white px-2 py-1 rounded hover:opacity-90 transition-opacity">
                            Add
                        </button>
                    </div>
                </form>
            )}

            <div className="space-y-3 overflow-y-auto flex-1 pr-1 custom-scrollbar">
                {habitList.map(habit => (
                    <div key={habit.id} className="group relative p-3 bg-bg-card hover:bg-bg-input rounded-lg border border-border-subtle transition-all flex flex-col gap-1 shadow-sm">
                        <div className="flex justify-between items-start">
                            <span className="text-sm font-medium text-text-primary">{habit.name}</span>
                            <button
                                onClick={() => deleteHabit(habit.id)}
                                className="opacity-0 group-hover:opacity-100 text-text-muted hover:text-red-500 transition-opacity"
                            >
                                <Trash2 className="w-3.5 h-3.5" />
                            </button>
                        </div>

                        <div className="flex items-center gap-3 text-xs text-text-muted">
                            <span className="flex items-center gap-1">
                                <Clock className="w-3 h-3" />
                                {habit.durationMinutes}m
                            </span>
                            {habit.frequency === 'daily' && (
                                <span className="flex items-center gap-1">
                                    <Sun className="w-3 h-3 text-amber-500" />
                                    Daily
                                </span>
                            )}
                            {habit.frequency === 'weekly' && (
                                <span className="flex items-center gap-1">
                                    <Calendar className="w-3 h-3 text-accent-primary" />
                                    Weekly
                                </span>
                            )}
                        </div>

                        {/* Progress Bar (Mock for visuals) */}
                        <div className="w-full h-1 bg-bg-input rounded-full mt-1 overflow-hidden">
                            <div className="h-full bg-border-highlight w-0 group-hover:w-1/3 transition-all duration-500" />
                        </div>
                    </div>
                ))}

                {habitList.length === 0 && !isAdding && (
                    <p className="text-xs text-text-muted text-center py-4 italic">
                        No habits configured.
                    </p>
                )}
            </div>
        </div>
    );
};
