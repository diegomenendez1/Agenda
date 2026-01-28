import { supabase } from './supabase';
import { toast } from 'sonner';

/**
 * Service to handle AI prioritization directly from the client.
 * This bypasses N8N and Supabase Edge Functions to avoid environment/deployment issues.
 */
export async function runAITaskPrioritization(userId: string) {
    // 1. Validate Env
    const openAiKey = import.meta.env.VITE_OPENAI_API_KEY;
    if (!openAiKey) {
        throw new Error('Missing VITE_OPENAI_API_KEY in .env');
    }

    try {
        // 2. Fetch User's Owned Tasks (Active Only)
        // Privacy Rule: Only reorganize tasks OWNED by the current user.
        const { data: tasks, error: fetchError } = await supabase
            .from('tasks')
            .select('*')
            .eq('user_id', userId)
            .neq('status', 'done');

        if (fetchError) throw fetchError;
        if (!tasks || tasks.length === 0) {
            return { count: 0, message: "No active tasks to prioritize." };
        }

        // 3. Construct Payload for AI
        const taskSummaries = tasks.map(t => ({
            id: t.id,
            title: t.title,
            priority: t.priority,
            dueDate: t.due_date,
            createdAt: t.created_at
        }));

        const prompt = `
        You are an expert Personal Productivity Assistant.
        
        GOAL: Reorganize these tasks based on "Global Context".
        
        RULES:
        1. Context: Urgent (Due Soon) + Important = Critical.
        2. Assign a 'rank' (1 = Top Priority) to strictly order them.
        3. Assign a 'priority' (critical, high, medium, low).
        4. Be decisive.
        
        TASKS:
        ${JSON.stringify(taskSummaries)}
        
        OUTPUT FORMAT (JSON ONLY):
        {
          "tasks": [
            { "id": "uuid", "priority": "high", "rank": 1, "reasoning": "Due tomorrow" }
          ]
        }
        `;

        // 4. Call OpenAI Directly
        const response = await fetch('https://api.openai.com/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${openAiKey}`
            },
            body: JSON.stringify({
                model: 'gpt-5-mini',
                messages: [
                    { role: 'system', content: "You are a helpful JSON-only assistant." },
                    { role: 'user', content: prompt }
                ],
                response_format: { type: "json_object" }
            })
        });

        if (!response.ok) {
            const errText = await response.text();
            throw new Error(`OpenAI Error: ${response.status} - ${errText}`);
        }

        const aiData = await response.json();
        const content = JSON.parse(aiData.choices[0].message.content);
        const updates = content.tasks;

        // 5. Update Supabase
        const updatesToUpsert = updates.map((u: any) => {
            const original = tasks.find(t => t.id === u.id);
            if (!original) return null;

            return {
                ...original,
                priority: u.priority.toLowerCase(),
                smart_analysis: {
                    ...(original.smart_analysis || {}),
                    smartRank: u.rank,
                    aiReasoning: u.reasoning,
                    reorganizedAt: new Date().toISOString()
                },
                updated_at: new Date().toISOString()
            };
        }).filter(Boolean);

        if (updatesToUpsert.length > 0) {
            const { error: updateError } = await supabase
                .from('tasks')
                .upsert(updatesToUpsert);

            if (updateError) throw updateError;
        }

        return { count: updatesToUpsert.length, message: "Success" };

    } catch (error: any) {
        console.error("AI Prioritization Failed:", error);
        throw error;
    }
}
