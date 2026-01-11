
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://dovmyyrnhudfwvrlrzmw.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRvdm15eXJuaHVkZnd2cmxyem13Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjczMTI3NTMsImV4cCI6MjA4Mjg4ODc1M30.wM_qaUBOrE8BITOgE9asPG1vl2ZDdxgp8eqq_28stpY';
const supabase = createClient(supabaseUrl, supabaseKey);

// IDs (gathered previously)
const projectId = 'e1adbc8b-00fa-48d2-afb5-ac9590f98470';
const users = {
    exec: '34f919a7-3af0-472a-a8dc-ab7e442fb964',
    lead: 'd528e882-b883-48de-84e2-a5e1c9bf6018',
    dev: '70ffc6f5-13b4-4433-80bb-b3ee83e2cc93',
    designer: 'a8cf8930-8f82-4424-963f-0e26a84e3221',
    stakeholder: '813ae9c7-fb8a-4d60-b52d-d11853d518a0'
};

const wait = (ms) => new Promise(resolve => setTimeout(resolve, ms));

async function runScenario1() {
    console.log("Starting Scenario 1: Conflict of Interpretation");

    // 1. Lead creates Task "Main Stage UX Polish"
    console.log("-> Lead creating task...");
    const { data: task, error: taskError } = await supabase
        .from('tasks')
        .insert({
            title: 'Main Stage UX Polish',
            description: 'Please focus on the UX details for the main stage.',
            project_id: projectId,
            user_id: users.lead, // Owner
            status: 'todo',
            priority: 'high',
            visibility: 'team',
            assignee_ids: [users.designer, users.dev],
            created_at: Date.now(),
            updated_at: new Date().toISOString()
        })
        .select()
        .single();

    if (taskError) {
        console.error("Error creating task:", taskError);
        return;
    }
    console.log("Task created:", task.id);

    // 1b. Lead Comments
    console.log("-> Lead commenting...");
    await supabase.from('activity_logs').insert({
        task_id: task.id,
        user_id: users.lead,
        type: 'message',
        content: "@Persona Designer please focus on the 'wow' factor. @Persona Developer make it 'fast'.",
        created_at: new Date().toISOString() // Assuming schema handles this or it's auto
    });

    // 2. Designer Interacts
    console.log("-> Designer interpreting...");
    await wait(1000);
    // Update status to in_progress
    await supabase.from('tasks').update({
        status: 'in_progress',
        updated_at: new Date().toISOString()
    }).eq('id', task.id);

    // Designer comment
    await supabase.from('activity_logs').insert({
        task_id: task.id,
        user_id: users.designer,
        type: 'message', // or 'message' depending on schema, let's assume 'comment' or generic text log
        content: "This will require a complete SVG animation overhaul. Estimate: 5 days.",
        created_at: new Date().toISOString()
    });

    // 3. Developer Interacts
    console.log("-> Developer executing...");
    await wait(1000);
    // Developer comment
    await supabase.from('activity_logs').insert({
        task_id: task.id,
        user_id: users.dev,
        type: 'message',
        content: "I already optimized the CSS. It's fast now. Moving to Done.",
        created_at: new Date().toISOString()
    });

    // Update status to done
    await supabase.from('tasks').update({
        status: 'done',
        completed_at: Date.now(),
        updated_at: new Date().toISOString()
    }).eq('id', task.id);

    // 4. Executive Intervenes
    console.log("-> Executive intervening...");
    await wait(1000);
    await supabase.from('activity_logs').insert({
        task_id: task.id,
        user_id: users.exec,
        type: 'comment',
        content: "Why is this moving to done? I don't see the SVG overhaul mentioned by Designer.",
        created_at: new Date().toISOString()
    });

    console.log("Scenario 1 Complete.");
}

runScenario1().catch(console.error);
