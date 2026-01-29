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

        // 2. Build Prompt
        const availableProjects = projectsData || [];
        const availableTeam = teamData || [];
        const currentDate = new Date().toISOString().split('T')[0];

        const systemPrompt = `
### ROL
Eres un Asistente Ejecutivo Senior experto en metodología GTD. Tu objetivo es procesar inputs crudos y convertirlos en tareas estructuradas y accionables.

### INSTRUCCIONES CLAVE
1. **Atomicidad y Cohesión (EVITAR SOBRE-DESGLOSE):** 
   - Mantén el input como **una sola tarea** siempre que sea posible.
   - **NO desgloses** una tarea si el usuario menciona un objetivo y su propósito (ej. "Subir dashboard para la sesión" = 1 tarea). 
   - **SOLO desglosa** si el input contiene acciones totalmente independientes y sin relación biyectiva (ej. "Comprar leche y enviar reporte a Juan" = 2 tareas).
   
2. **Priorización por Contexto:** Usa el "Contexto del Rol" para determinar la importancia.
   - Si una tarea NO encaja con el rol, crea la tarea con prioridad "low" y sin proyecto. Jamás descartes información.

3. **Mapeo Estricto:** 
   - Usa SOLO los IDs de "Proyectos" y "Equipo" proporcionados en las listas de referencia. Si no hay coincidencia clara, usa null.

4. **Fechas:** "Para hoy" = ${currentDate}.

### FORMATO DE SALIDA (JSON ARRAY)
Devuelve SIEMPRE una lista (Array) de objetos JSON válidos bajo la clave "tasks".
{
  "tasks": [
    {
      "ai_title": "Verbo de Acción + Objeto Claro",
      "ai_priority": "critical" | "high" | "medium" | "low",
      "ai_date": "YYYY-MM-DD" | null,
      "ai_context": "Razón breve",
      "ai_project_id": "UUID_EXACTO" | null,
      "ai_assignee_ids": ["UUID_EXACTO"] | []
    }
  ]
}
`;

        const userPrompt = `
==== DATOS DE ENTRADA ===
Fecha de hoy: ${currentDate}
INPUT DEL USUARIO:
"${inputText}"

=== CONTEXTO DEL ROL (FILTRO PRINCIPAL) ===
"${context.userRoleContext || 'Contexto general de productividad.'}"

=== LISTAS DE REFERENCIA ===
Proyectos: ${JSON.stringify(availableProjects)}
Equipo: ${JSON.stringify(availableTeam)}
`;

        // 3. Call OpenAI (STRICTLY GPT-5-MINI)
        console.log("AI Attempt with model: gpt-5-mini");
        const response = await fetch('https://api.openai.com/v1/chat/completions', {
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
        const content = JSON.parse(json.choices[0].message.content);
        const aiTasks = content.tasks || [];

        // 4. Return Tasks (Do NOT insert - verify first)
        const tasksToReturn = aiTasks.map((t: any) => ({
            title: t.ai_title,
            status: 'todo',
            priority: t.ai_priority,
            due_date: t.ai_date ? new Date(t.ai_date).getTime() : null, // BIGINT
            project_id: t.ai_project_id,
            assignee_ids: t.ai_assignee_ids,
            user_id: userId,
            organization_id: context.organizationId,
            tags: ['ai-generated'],
            visibility: t.ai_assignee_ids?.length > 0 ? 'team' : 'private',
            smart_analysis: {
                summary: t.ai_context,
                originalContext: inputText,
                confidence: 1,
                suggestedPriority: t.ai_priority
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
