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
        const { inputText, userRoleContext, appLanguage, availableProjects, availableTeam, mode } = await req.json()

        if (!inputText) {
            throw new Error('Missing inputText')
        }

        const openAiKey = Deno.env.get('OPENAI_API_KEY')
        if (!openAiKey) {
            throw new Error('Missing OPENAI_API_KEY')
        }

        const currentDate = new Date().toISOString().split('T')[0]
        const targetLang = appLanguage === 'en' ? 'English' : 'Spanish'

        let systemPrompt = '';

        if (mode === 'smart_triage') {
            systemPrompt = `Role: Professional Editor & Executive Assistant.
Task: Analyze the input. 
1. Generate a "title": Single, high-quality summary (max 10 words).
2. Generate "formatted_text": THE SAME CONTENT as input, but rewritten for professional clarity.
   - **AGGRESSIVE DE-NOISING**: 
     - REMOVE ALL Email Headers (From:, Sent:, To:, Subject:).
     - REMOVE ALL Signatures, Logos, Phone numbers, Addresses.
     - REMOVE ALL Legal Disclaimers (CAUTION, Confidentiality notices).
   - **STRUCTURE**: Format as a clean conversation/narrative.
     - Example: "Daniel asked: [Content]... Pat replied: [Content]..."
   - **PRESERVE**: Keep ALL dates, specific names, numbers, and business details.
   - **GOAL**: Turn a messy email thread into a clean, readable script.
Rules:
1. OUTPUT LANGUAGE: MUST BE IN ${targetLang.toUpperCase()}.
2. PRESERVE ORIGINALS: Keep critical identifiers intact.
Output JSON: { "title": "The summary string", "formatted_text": "The cleaned up content..." }`
        } else {
            systemPrompt = `Role: Senior Executive Asst (GTD). Convert raw input into structured tasks. 
Rules:
1. OUTPUT LANGUAGE: MUST BE IN ${targetLang.toUpperCase()}.
2. PRESERVE ORIGINALS: Text inside quotes "..." must remain in original language.
3. One task unless actions are totally unrelated.
4. Priority: critical|high|medium|low based on role context.
5. Use refs: Projects[${availableProjects || 'None'}], Team[${availableTeam || 'None'}].
6. Date: Today is ${currentDate}.
7. DESCRIPTION (reason): 
   - STRICTLY FORBIDDEN: Do NOT include sections like "Original Text", "Actions", "Summary".
   - STRICTLY FORBIDDEN: Do NOT repeat the input verbatim.
   - ONLY provide the "Strategic Goal" or "Why" in 1-2 sentences.
   - If the Title self-explanatory, keep Description EMPTY.
   - NO formatting (no lists, no bold). Just plain text.
8. STRICT NO-HALLUCINATION: Do NOT invent names, dates, or details.
Output JSON: { "tasks": [{ "title": "Action in ${targetLang}", "priority": "lvl", "date": "YYYY-MM-DD", "reason": "Strategic context or empty", "pid": "id", "aids": ["ids"] }] }`
        }

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
