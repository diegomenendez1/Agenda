import { supabase } from './supabase';

export interface PromptContext {
    userRoleContext?: string;
    organizationId?: string;
    appLanguage?: 'es' | 'en'; // NEW
}

/**
 * AI Service for processing natural language inputs into structured tasks.
 * Replaces N8N workflow 'Start AI Agent'.
 */
export async function processTaskInputWithAI(
    userId: string,
    inputText: string,
    context: PromptContext = {}
) {
    if (!inputText.trim()) return [];



    try {
        // 1. Fetch Context (Projects & Team)
        // We fetch "available" projects and members to give options to AI.
        const { data: projectsData, error: projError } = await supabase
            .from('projects')
            .select('id, name')
            .eq('status', 'active');

        if (projError) console.warn("Failed to fetch projects context", projError);

        const { data: teamData, error: teamError } = await supabase
            .from('profiles')
            .select('id, full_name, email');

        if (teamError) console.warn("Failed to fetch team context", teamError);

        const availableProjects = projectsData?.map(p => `${p.id}:${p.name}`).join('|') || 'None';
        const availableTeam = teamData?.map(m => `${m.id}:${m.full_name}`).join('|') || 'None';

        console.log("Invoking AI Edge Function...");

        const { data: content, error } = await supabase.functions.invoke('ai-task-processing', {
            body: {
                inputText,
                userRoleContext: context.userRoleContext || 'Productivity',
                appLanguage: context.appLanguage || 'es',
                availableProjects,
                availableTeam
            }
        });

        if (error) {
            console.error("Link to AI Function failed:", error);
            throw error;
        }

        const aiTasks = content.tasks || [];

        // 4. Return Tasks (Do NOT insert - verify first)
        const tasksToReturn = aiTasks.map((t: any) => ({
            title: t.title,
            status: 'todo',
            priority: t.priority,
            due_date: t.date ? new Date(t.date).getTime() : null, // BIGINT
            project_id: t.pid,
            assignee_ids: t.aids,
            user_id: userId,
            organization_id: context.organizationId,
            tags: ['ai-generated'],
            visibility: t.aids?.length > 0 ? 'team' : 'private',
            smart_analysis: {
                summary: t.reason,
                originalContext: inputText,
                confidence: 1,
                suggestedPriority: t.priority
            },
            created_at: Date.now(), // BIGINT
            updated_at: new Date().toISOString() // TIMESTAMPTZ (String)
        }));

        return tasksToReturn;

    } catch (err: any) {
        console.error("AI Task Processing Failed:", err);
        throw err;
    }
}
