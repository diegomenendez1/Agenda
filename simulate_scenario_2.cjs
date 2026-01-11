
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

async function runScenario2() {
    console.log("Starting Scenario 2: Automation vs. Human Friction");

    // Authenticate as Developer
    console.log("-> Authenticating as Developer...");
    const { data: devAuth, error: devAuthError } = await supabase.auth.signInWithPassword({
        email: 'dev@test.com',
        password: 'SocialTest.2026'
    });
    if (devAuthError) { console.error("Auth Dev Error", devAuthError); return; }

    // 1. Developer records "Voice Memo" (Inbox Item)
    console.log("-> Developer adding to Inbox...");
    const { data: inboxItem, error: inboxError } = await supabase
        .from('inbox_items')
        .insert({
            text: "Finished the API for the launch. Please projectize this as 'API Integration' and assign to Lead for review.",
            user_id: users.dev,
            source: 'voice',
            created_at: Date.now()
        })
        .select()
        .single();

    if (inboxError) {
        console.error("Error inserting inbox item:", inboxError);
        return;
    }
    console.log("Inbox Item created:", inboxItem.id);

    // 2. System (AI) Processes it
    // Note: System actions usually run as service_role. Since we don't have it, we'll continue as Developer 
    // or assume the AI runs as the user who triggered it, OR we sign out and use anon if the policy allows.
    // Ideally, we'd have the service role key. 
    // For this test, let's assume the Developer creates the task (as if they accepted the AI suggestion).

    console.log("-> System (AI/Dev) converting to Task...");
    await wait(1000);

    // Create the task
    const { data: task, error: taskError } = await supabase
        .from('tasks')
        .insert({
            title: 'API Integration',
            description: 'Finished the API for the launch.',
            project_id: projectId,
            user_id: users.dev,
            status: 'todo',
            priority: 'medium',
            visibility: 'team',
            assignee_ids: [users.lead],
            source: 'ai_processed',
            created_at: Date.now(),
            updated_at: new Date().toISOString()
        })
        .select()
        .single();

    if (taskError) {
        console.error("Error creating AI task:", taskError);
        return;
    }

    // Mark inbox item processed/deleted
    await supabase.from('inbox_items').delete().eq('id', inboxItem.id);
    console.log("AI Task created:", task.id);

    // Sign out Developer
    await supabase.auth.signOut();

    // Authenticate as Lead
    console.log("-> Authenticating as Lead...");
    const { data: leadAuth, error: leadAuthError } = await supabase.auth.signInWithPassword({
        email: 'lead@test.com',
        password: 'SocialTest.2026'
    });
    if (leadAuthError) { console.error("Auth Lead Error", leadAuthError); return; }

    // 3. Lead Reviews and Rejects
    console.log("-> Lead reviewing and rejecting...");
    await wait(1500);

    // Lead comments
    const { error: logError } = await supabase.from('activity_logs').insert({
        task_id: task.id,
        user_id: users.lead,
        type: 'message',
        content: "Insufficient documentation. Please refer to @Persona Executive's guidelines.",
        created_at: new Date().toISOString()
    });
    if (logError) console.error("Error inserting Activity Log:", logError);

    // Lead moves to backlog (Rejection flow)
    await supabase.from('tasks').update({
        status: 'backlog',
        updated_at: new Date().toISOString()
    }).eq('id', task.id);

    console.log("Scenario 2 Complete.");
}

runScenario2().catch(console.error);
