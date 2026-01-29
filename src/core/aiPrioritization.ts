import { supabase } from './supabase';
import { addMinutes, setHours, setMinutes, startOfHour, isAfter, addDays } from 'date-fns';

/**
 * Service to handle AI prioritization directly from the client.
 * This bypasses N8N and Supabase Edge Functions to avoid environment/deployment issues.
 */
export async function runAITaskPrioritization(
    userId: string,
    workingHours: { start: number; end: number } = { start: 9, end: 18 }
) {
    // 1. Validate Env
    const openAiKey = import.meta.env.VITE_OPENAI_API_KEY;
    if (!openAiKey) {
        throw new Error('Missing VITE_OPENAI_API_KEY in .env');
    }

    try {
        // 2. Fetch User's Owned Tasks (Active only: backlog, todo, in_progress)
        // We exclude 'review' and 'done' as per user request.
        const { data: tasks, error: fetchError } = await supabase
            .from('tasks')
            .select('*')
            .eq('user_id', userId)
            .in('status', ['backlog', 'todo', 'in_progress']);

        if (fetchError) throw fetchError;
        if (!tasks || tasks.length === 0) {
            return { count: 0, message: "No active tasks in backlog/todo/in_progress to prioritize." };
        }

        // 3. Construct Payload for AI (Compact)
        const taskSummaries = tasks.map(t => `${t.id}|${t.title}|${t.status}|${t.priority}|${t.estimated_minutes || 60}`).join('\n');

        const prompt = `Role: Productivity Strategist. Reorganize tasks (backlog|todo|in_progress) into a high-performance schedule.
Rules:
1. Logic: If title implies sequence (e.g. Draft -> Send), rank Draft earlier.
2. Energy: Hard tasks earlier.
3. Realistic: Adjust estMins if title suggests otherwise.
4. Rank: Unique integer starting at 1.
Data (ID|Title|Status|Priority|Mins):
${taskSummaries}
Output JSON: {"tasks":[{"id":"uuid","priority":"lvl","rank":int,"reason":"why","mins":int}]}`;

        // 4. Call OpenAI Directly
        const response = await fetch('/api/openai/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${openAiKey}`
            },
            body: JSON.stringify({
                model: 'gpt-5-mini',
                messages: [
                    { role: 'system', content: "JSON assistant." },
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
        const content = typeof aiData.choices[0].message.content === 'string'
            ? JSON.parse(aiData.choices[0].message.content)
            : aiData.choices[0].message.content;
        const updates = content.tasks;

        // 5. Deterministic Scheduling (The "Calendar" Logic)
        // Sort by Rank
        updates.sort((a: any, b: any) => a.rank - b.rank);

        // Current Simulation Time
        let currentSlot = new Date();

        // Ensure we start at a clean time (next 30 mins) or working start
        if (currentSlot.getMinutes() > 30) {
            currentSlot = addMinutes(startOfHour(currentSlot), 60);
        } else {
            currentSlot = setMinutes(startOfHour(currentSlot), 30);
        }

        // Normalize Working Hours
        const workStart = workingHours.start;
        const workEnd = workingHours.end;

        const scheduledUpdates = updates.map((u: any) => {
            const original = tasks.find(t => t.id === u.id);
            if (!original) return null;

            const duration = u.mins || 60;

            // Check if currentSlot is within pending working hours
            // If before start, move to start
            if (currentSlot.getHours() < workStart) {
                currentSlot = setHours(currentSlot, workStart);
                currentSlot = setMinutes(currentSlot, 0);
            }

            // Check if task fits in remaining day
            const taskEndTime = addMinutes(currentSlot, duration);
            const workEndTime = setHours(currentSlot, workEnd);
            workEndTime.setMinutes(0);

            if (isAfter(taskEndTime, workEndTime)) {
                // Move to TOMORROW Start
                currentSlot = addDays(currentSlot, 1);
                currentSlot = setHours(currentSlot, workStart);
                currentSlot = setMinutes(currentSlot, 0);

                // If moved to weekend (Sat=6, Sun=0), move to Monday? 
                // Simple implementation: Just sequential days for now, user didn't specify strict workday rules.
            }

            const assignedDate = new Date(currentSlot);

            // Advance slot
            currentSlot = addMinutes(currentSlot, duration);

            return {
                ...original,
                priority: u.priority.toLowerCase(),
                due_date: assignedDate.getTime(), // Assign the computed date
                estimated_minutes: duration,
                smart_analysis: {
                    ...(original.smart_analysis || {}),
                    smartRank: u.rank,
                    aiReasoning: u.reason,
                    reorganizedAt: new Date().toISOString()
                },
                updated_at: new Date().toISOString()
            };
        }).filter(Boolean);

        // 6. Update Supabase
        if (scheduledUpdates.length > 0) {
            const { error: updateError } = await supabase
                .from('tasks')
                .upsert(scheduledUpdates);

            if (updateError) throw updateError;
        }

        return { count: scheduledUpdates.length, message: "Success" };

    } catch (error: any) {
        console.error("AI Prioritization Failed:", error);
        throw error;
    }
}
