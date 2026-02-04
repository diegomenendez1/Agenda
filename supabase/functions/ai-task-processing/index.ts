import "jsr:@supabase/functions-js/edge-runtime.d.ts"

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders })
    }

    try {
        const { inputText, userRoleContext, appLanguage, availableProjects, availableTeam } = await req.json()

        if (!inputText) {
            throw new Error('Missing inputText')
        }

        const openAiKey = Deno.env.get('OPENAI_API_KEY')
        if (!openAiKey) {
            throw new Error('Missing OPENAI_API_KEY')
        }

        const currentDate = new Date().toISOString().split('T')[0]
        const targetLang = appLanguage === 'en' ? 'English' : 'Spanish'

        const systemPrompt = `Role: Senior Executive Asst (GTD). Convert raw input into structured tasks. 
Rules:
1. OUTPUT LANGUAGE: MUST BE IN ${targetLang.toUpperCase()}.
2. PRESERVE ORIGINALS: Text inside quotes "..." must remain in original language (e.g. email subjects).
3. One task unless actions are totally unrelated.
4. Priority: critical|high|medium|low based on role context.
5. Use refs: Projects[${availableProjects || 'None'}], Team[${availableTeam || 'None'}].
6. Date: Today is ${currentDate}.
Output JSON: { "tasks": [{ "title": "Action in ${targetLang}", "priority": "lvl", "date": "YYYY-MM-DD", "reason": "why in ${targetLang}", "pid": "id", "aids": ["ids"] }] }`

        const userPrompt = `Input: "${inputText}"\nRoleCtx: "${userRoleContext || 'Productivity'}"`

        console.log("Calling OpenAI gpt-5-mini...")

        const response = await fetch('https://api.openai.com/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${openAiKey}`
            },
            body: JSON.stringify({
                model: 'gpt-5-mini', // User specified model
                messages: [
                    { role: 'system', content: systemPrompt },
                    { role: 'user', content: userPrompt }
                ],
                response_format: { type: "json_object" }
            })
        })

        if (!response.ok) {
            const errorText = await response.text()
            console.error("OpenAI Error:", errorText)
            throw new Error(`OpenAI API Error: ${response.status} ${errorText}`)
        }

        const data = await response.json()
        const content = data.choices[0].message.content

        // Ensure we return JSON
        const parsedContent = typeof content === 'string' ? JSON.parse(content) : content

        return new Response(JSON.stringify(parsedContent), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })

    } catch (error) {
        console.error("EF Error:", error)
        return new Response(JSON.stringify({ error: error.message }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 400,
        })
    }
})
