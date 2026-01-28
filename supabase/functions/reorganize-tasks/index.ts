import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders })
    }

    try {
        // 1. Init Supabase Client with User Context
        const supabaseClient = createClient(
            Deno.env.get('SUPABASE_URL') ?? '',
            Deno.env.get('SUPABASE_ANON_KEY') ?? '',
            { global: { headers: { Authorization: req.headers.get('Authorization')! } } }
        )

        // 2. Auth Check
        const { data: { user }, error: userError } = await supabaseClient.auth.getUser()
        if (userError || !user) throw new Error('User not authenticated')

        // 3. Fetch Tasks (OWNER ONLY)
        // Rule: "Las tareas privadas si nproblemas, y las tareas compartidas, solo se modificara si el dueno de la tarea es quien usa esta herramienta"
        // Translation: Only update tasks where owner_id == user.id.
        const { data: tasks, error: fetchError } = await supabaseClient
            .from('tasks')
            .select('*')
            .eq('owner_id', user.id)
            .neq('status', 'done') // Only active tasks need reordering

        if (fetchError) throw fetchError

        if (!tasks || tasks.length === 0) {
            return new Response(JSON.stringify({ message: "No tasks to reorganize" }), {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                status: 200,
            })
        }

        // 4. Construct AI Prompt
        const openAiKey = Deno.env.get('OPENAI_API_KEY')
        if (!openAiKey) throw new Error('OPENAI_API_KEY not configured')

        const taskSummaries = tasks.map(t => ({
            id: t.id,
            title: t.title,
            priority: t.priority,
            dueDate: t.due_date, // Note: DB column is likely due_date or handled by mapper
            // We use snake_case for DB fields usually, but let's check tasks structure if possible.
            // Assuming Standard Supabase snake_case in input, but mapped in JS.
            // Let's pass what we got.
        }))

        const prompt = `
    You are an expert Personal Productivity Assistant.
    Goal: Global Context Reorganization.
    
    1. Analyze the following tasks.
    2. Assign a 'rank' (1 to N, where 1 is highest priority) to each task based on implied urgency, importance, and deadlines.
    3. Update the 'priority' (critical, high, medium, low) if the current one is misaligned with the global context.
    
    Context Rules:
    - Urgent + Important = Critical (Rank 1-5)
    - Important + Not Urgent = High (Rank 6-15)
    - Urgent + Not Important = Medium (Rank 16-30)
    - Neither = Low (Rank 30+)
    
    Tasks JSON:
    ${JSON.stringify(taskSummaries)}
    
    Response Format:
    Return a JSON object with a key "tasks" containing an array of objects: { "id": "uuid", "priority": "string", "rank": number, "reasoning": "string" }
    `

        // 5. Call AI
        const aiRes = await fetch('https://api.openai.com/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${openAiKey}`
            },
            body: JSON.stringify({
                model: 'gpt-4o-mini',
                messages: [{ role: 'system', content: "You are a helpful JSON-only assistant." }, { role: 'user', content: prompt }],
                response_format: { type: "json_object" }
            })
        })

        const aiData = await aiRes.json()
        if (!aiData.choices) throw new Error('AI response invalid')

        const content = JSON.parse(aiData.choices[0].message.content)
        const updates = content.tasks

        // 6. DB Updates
        // We map over updates and construct upsert objects.
        const upsertRows = updates.map((u: any) => {
            const original = tasks.find(t => t.id === u.id)
            if (!original) return null

            return {
                ...original,
                priority: u.priority.toLowerCase(),
                smart_analysis: {
                    ...(original.smart_analysis || {}), // Preserve existing analysis
                    smartRank: u.rank,
                    aiReasoning: u.reasoning,
                    reorganizedAt: new Date().toISOString()
                },
                updated_at: new Date().toISOString()
            }
        }).filter(Boolean)

        const { error: updateError } = await supabaseClient
            .from('tasks')
            .upsert(upsertRows)

        if (updateError) throw updateError

        return new Response(JSON.stringify({ success: true, count: upsertRows.length }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 200,
        })

    } catch (error) {
        return new Response(JSON.stringify({ error: error.message }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 400,
        })
    }
})
