import { supabase } from './supabase';

export interface PromptContext {
    userRoleContext?: string;
    organizationId?: string;
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

    const openAiKey = import.meta.env.VITE_OPENAI_API_KEY;
    if (!openAiKey) throw new Error("Missing VITE_OPENAI_API_KEY");

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
        const currentDate = new Date().toISOString().split('T')[0];

        const systemPrompt = `Role: Senior Executive Asst (GTD). Convert raw input into structured tasks. 
Rules:
1. One task unless actions are totally unrelated.
2. Priority: critical|high|medium|low based on role context.
3. Use refs: Projects[${availableProjects}], Team[${availableTeam}].
4. Date: Today is ${currentDate}.
Output JSON: { "tasks": [{ "title": "Action", "priority": "lvl", "date": "YYYY-MM-DD", "reason": "why", "pid": "id", "aids": ["ids"] }] }`;

        const userPrompt = `Input: "${inputText}"\nRoleCtx: "${context.userRoleContext || 'Productivity'}"`;


        // 3. Call OpenAI (STRICTLY GPT-5-MINI)
        console.log("AI Attempt with model: gpt-5-mini");
        const response = await fetch('/api/openai/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${openAiKey}`
            },
            body: JSON.stringify({
                model: 'gpt-5-mini',
                messages: [
                    { role: 'system', content: systemPrompt },
                    { role: 'user', content: userPrompt }
                ],
                response_format: { type: "json_object" }
            })
        });

        if (!response.ok) {
            const text = await response.text();
            throw new Error(`AI-SVC: OpenAI ${response.status} - ${text}`);
        }

        if (!response || !response.ok) {
            const err = await response?.text();
            throw new Error(`OpenAI Error: ${response?.status} ${err}`);
        }

        const json = await response.json();
        const content = typeof json.choices[0].message.content === 'string'
            ? JSON.parse(json.choices[0].message.content)
            : json.choices[0].message.content;
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
