import { useState, useEffect } from 'react';
import { useStore } from '../core/store';
import { User, Save, Users, Check, X } from 'lucide-react';
import clsx from 'clsx';
import { useTranslation } from '../core/i18n';

export function UserProfile() {
    const { user, updateUserProfile } = useStore();
    const { t } = useTranslation();
    const [name, setName] = useState('');

    const [aiContext, setAiContext] = useState('');

    useEffect(() => {
        if (user) {
            setName(user.name);
            setAiContext(user.preferences?.aiContext || '');
            setLanguage(user.preferences?.appLanguage || 'es');
        }
    }, [user]);

    const [language, setLanguage] = useState<'es' | 'en'>('es');

    const handleSave = async () => {
        if (!user) return;
        await updateUserProfile({
            ...user,
            name,
            // Role is preserved from the existing user object, not editable here
            preferences: {
                ...user.preferences,
                theme: 'light',
                aiContext,
                appLanguage: language
            }
        });
    };

    if (!user) return <div className="p-8 text-center text-text-muted">Loading profile...</div>;

    return (
        <div className="max-w-2xl mx-auto p-6">
            <h1 className="text-3xl font-bold mb-2">{t.settings.title}</h1>
            <p className="text-text-secondary mb-8">{t.settings.subtitle}</p>

            <div className="bg-bg-card border border-border-subtle rounded-xl overflow-hidden shadow-sm">

                {/* Header / Avatar Section */}
                <div className="p-8 border-b border-border-subtle flex flex-col md:flex-row items-center gap-6 bg-bg-surface/50">
                    <div className="w-24 h-24 rounded-full bg-accent-secondary/10 ring-4 ring-bg-surface flex items-center justify-center text-4xl shadow-inner">
                        {user.avatar ? (
                            <img src={user.avatar} alt={user.name} className="w-full h-full rounded-full object-cover" />
                        ) : (
                            <User className="text-accent-secondary w-10 h-10" />
                        )}
                    </div>
                    <div className="text-center md:text-left space-y-1">
                        <h2 className="text-xl font-bold text-text-primary">{user.name}</h2>
                        <p className="text-text-muted text-sm">{user.email}</p>
                    </div>
                </div>

                <div className="p-8 space-y-8">
                    {/* Team Invitations Section */}
                    <TeamInvitations />

                    {/* Identity Section */}
                    <div className="space-y-4">
                        <h3 className="text-lg font-semibold text-text-primary flex items-center gap-2">
                            {t.settings.personal_info}
                        </h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="space-y-2">
                                <label className="text-sm font-medium text-text-secondary">{t.settings.full_name}</label>
                                <input
                                    type="text"
                                    value={name}
                                    onChange={(e) => setName(e.target.value)}
                                    className="input w-full bg-bg-input focus:bg-bg-card transition-all"
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="text-sm font-medium text-text-secondary">{t.settings.email}</label>
                                <input
                                    type="email"
                                    value={user.email}
                                    disabled
                                    className="input w-full bg-bg-surface text-text-muted border-transparent cursor-not-allowed opacity-70"
                                />
                            </div>
                        </div>
                    </div>


                    <div className="h-px bg-border-subtle" />

                    {/* Language Settings */}
                    <div className="space-y-4">
                        <h3 className="text-lg font-semibold text-text-primary flex items-center gap-2">
                            {t.settings.language_region}
                        </h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="space-y-2">
                                <label className="text-sm font-medium text-text-secondary">{t.settings.app_language}</label>
                                <select
                                    value={language}
                                    onChange={(e) => setLanguage(e.target.value as 'es' | 'en')}
                                    className="input w-full bg-bg-input focus:bg-bg-card transition-all"
                                >
                                    <option value="es">Español (Spanish)</option>
                                    <option value="en">English (Inglés)</option>
                                </select>
                                <p className="text-xs text-text-muted mt-1">
                                    {t.settings.ai_note}
                                </p>
                            </div>
                        </div>
                    </div>

                    <div className="h-px bg-border-subtle" />

                    {/* AI Assistant Context - Restricted to Head/Owner */}
                    {(user?.role === 'owner' || user?.role === 'head') && (
                        <div className="space-y-4">
                            <div className="flex items-center gap-2">
                                <h3 className="text-lg font-semibold text-text-primary">{t.settings.ai_context_title}</h3>
                            </div>
                            <p className="text-sm text-text-secondary">
                                {t.settings.ai_context_desc}
                            </p>
                            <textarea
                                value={aiContext}
                                onChange={(e) => setAiContext(e.target.value)}
                                className="input w-full min-h-[120px] resize-y text-sm leading-relaxed"
                                placeholder="Example: I am a Project Manager. Focus on high-priority tasks and team blockers. Filter out generic newsletters. My key goals are 'Q1 Launch' and 'Process Optimization'."
                            />
                        </div>
                    )}

                    {(user?.role === 'owner' || user?.role === 'head') && <div className="h-px bg-border-subtle" />}

                    {/* Working Hours Configuration */}
                    <div className="space-y-4">
                        <h3 className="text-lg font-semibold text-text-primary">{t.settings.calendar_prefs}</h3>
                        <div className="grid grid-cols-2 gap-6">
                            <div className="space-y-2">
                                <label className="text-sm font-medium text-text-secondary">{t.settings.working_start}</label>
                                <select
                                    value={user.preferences?.workingHours?.start ?? 9}
                                    onChange={(e) => {
                                        const start = parseInt(e.target.value);
                                        const currentEnd = user.preferences?.workingHours?.end ?? 18;
                                        if (start >= currentEnd) return;

                                        updateUserProfile({
                                            ...user,
                                            preferences: {
                                                ...user.preferences,
                                                workingHours: {
                                                    ...user.preferences?.workingHours,
                                                    start,
                                                    end: currentEnd
                                                }
                                            }
                                        });
                                    }}
                                    className="input w-full bg-bg-input focus:bg-bg-card transition-all"
                                >
                                    {Array.from({ length: 24 }).map((_, i) => (
                                        <option key={i} value={i}>{i}:00</option>
                                    ))}
                                </select>
                            </div>
                            <div className="space-y-2">
                                <label className="text-sm font-medium text-text-secondary">{t.settings.working_end}</label>
                                <select
                                    value={user.preferences?.workingHours?.end ?? 18}
                                    onChange={(e) => {
                                        const end = parseInt(e.target.value);
                                        const currentStart = user.preferences?.workingHours?.start ?? 9;
                                        if (end <= currentStart) return;

                                        updateUserProfile({
                                            ...user,
                                            preferences: {
                                                ...user.preferences,
                                                workingHours: {
                                                    ...user.preferences?.workingHours,
                                                    start: currentStart,
                                                    end
                                                }
                                            }
                                        });
                                    }}
                                    className="input w-full bg-bg-input focus:bg-bg-card transition-all"
                                >
                                    {Array.from({ length: 24 }).map((_, i) => (
                                        <option key={i} value={i}>{i}:00</option>
                                    ))}
                                </select>
                            </div>
                        </div>

                        <div className="space-y-2">
                            <label className="text-sm font-medium text-text-secondary">{t.settings.working_days}</label>
                            <div className="flex flex-wrap gap-2">
                                {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day, i) => {
                                    const workingDays = user.preferences?.workingHours?.workingDays || [1, 2, 3, 4, 5];
                                    const isSelected = workingDays.includes(i);

                                    return (
                                        <button
                                            key={day}
                                            onClick={() => {
                                                const newDays = isSelected
                                                    ? workingDays.filter(d => d !== i)
                                                    : [...workingDays, i].sort();

                                                updateUserProfile({
                                                    ...user,
                                                    preferences: {
                                                        ...user.preferences,
                                                        workingHours: {
                                                            ...user.preferences?.workingHours,
                                                            start: user.preferences?.workingHours?.start ?? 9,
                                                            end: user.preferences?.workingHours?.end ?? 18,
                                                            workingDays: newDays
                                                        }
                                                    }
                                                });
                                            }}
                                            className={clsx(
                                                "px-3 py-1.5 rounded-lg text-xs font-bold border transition-all",
                                                isSelected
                                                    ? "bg-accent-primary border-accent-primary text-white"
                                                    : "bg-bg-card border-border-subtle text-text-muted hover:border-text-muted"
                                            )}
                                        >
                                            {day}
                                        </button>
                                    )
                                })}
                            </div>
                        </div>

                        <p className="text-xs text-text-muted">
                            {t.settings.calendar_note}
                        </p>
                    </div>

                    <div className="h-px bg-border-subtle" />

                    {/* (Appearance section removed) */}

                    <div className="pt-8 flex justify-end border-t border-border-subtle mt-8">
                        <button
                            onClick={handleSave}
                            className="btn btn-primary px-8 py-2.5 shadow-lg shadow-accent-primary/20 hover:shadow-accent-primary/30 transition-all active:scale-95"
                        >
                            <Save size={18} className="mr-2" />
                            {t.settings.save}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}

function TeamInvitations() {
    const { user, activeInvitations, acceptPendingInvitation, declinePendingInvitation } = useStore();
    const { t } = useTranslation();

    const myInvitations = activeInvitations.filter(i =>
        i.status === 'pending' &&
        i.email?.toLowerCase() === user?.email?.toLowerCase()
    );

    if (!myInvitations || myInvitations.length === 0) return null;

    return (
        <div className="bg-accent-primary/5 border border-accent-primary/20 rounded-xl p-4 animate-enter mb-8">
            <h3 className="text-sm font-bold text-accent-primary flex items-center gap-2 mb-3">
                <Users size={16} />
                {t.settings.invitations}
            </h3>
            <div className="space-y-3">
                {myInvitations.map((invite) => (
                    <div key={invite.id} className="flex items-center justify-between bg-bg-card p-3 rounded-lg border border-border-subtle shadow-sm">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-accent-primary/10 flex items-center justify-center text-accent-primary font-bold">
                                {invite.organizationName?.charAt(0) || 'W'}
                            </div>
                            <div>
                                <p className="text-sm font-medium text-text-primary">
                                    {t.settings.join} <span className="font-bold text-accent-primary">{invite.organizationName}</span>
                                </p>
                                <p className="text-xs text-text-muted">
                                    {t.settings.invited_by} {invite.inviterName} • {invite.role}
                                </p>
                            </div>
                        </div>
                        <div className="flex items-center gap-2">
                            <button
                                onClick={() => declinePendingInvitation(invite.id)}
                                className="p-2 text-text-muted hover:text-red-500 hover:bg-red-500/10 rounded-lg transition-all"
                                title="Decline"
                            >
                                <X size={16} />
                            </button>
                            <button
                                onClick={() => acceptPendingInvitation(invite.id)}
                                className="px-4 py-2 bg-accent-primary text-white text-xs font-bold rounded-lg shadow-md shadow-accent-primary/20 hover:bg-accent-primary-hover transition-all flex items-center gap-1.5"
                            >
                                <Check size={14} />
                                {t.settings.accept}
                            </button>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}
