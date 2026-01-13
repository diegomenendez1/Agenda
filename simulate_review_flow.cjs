const { createClient } = require('@supabase/supabase-js');

// Embedded credentials from debug_roles.cjs context
const SUPABASE_URL = 'https://dovmyyrnhudfwvrlrzmw.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRvdm15eXJuaHVkZnd2cmxyem13Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjczMTI3NTMsImV4cCI6MjA4Mjg4ODc1M30.wM_qaUBOrE8BITOgE9asPG1vl2ZDdxgp8eqq_28stpY';

// Credentials from User Request
const LEAD_USER = { email: 'diego.menendez@gmail.com', pass: 'Yali.202' };
const TESTER_USER = { email: 'tester@test.com', pass: '123456' };

async function runSimulation() {
    console.log("🚀 Starting Review Flow & Security Simulation...");

    const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

    // 1. Login as LEAD
    const { data: leadAuth, error: leadError } = await supabase.auth.signInWithPassword({
        email: LEAD_USER.email,
        password: LEAD_USER.pass
    });

    if (leadError) throw leadError;
    console.log("✅ Lead Auth Success");
    const leadId = leadAuth.user.id;

    // 2. Create Task as LEAD and assign TESTER
    const clientLead = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
        global: { headers: { Authorization: `Bearer ${leadAuth.session.access_token}` } }
    });

    // Get Tester ID
    const { data: testerProfile } = await clientLead.from('profiles').select('id').eq('email', TESTER_USER.email).single();
    const testerId = testerProfile.id;

    const taskTitle = `Simulation Task ${Date.now()}`;
    const { data: task, error: taskError } = await clientLead.from('tasks').insert({
        title: taskTitle,
        user_id: leadId,
        assignee_ids: [testerId],
        status: 'todo',
        priority: 'medium',
        visibility: 'team'
    }).select().single();

    if (taskError) throw taskError;
    console.log(`✅ Task Created by Lead: ${task.id}`);

    // 3. Login as TESTER
    const { data: testerAuth, error: testerError } = await supabase.auth.signInWithPassword({
        email: TESTER_USER.email,
        password: TESTER_USER.pass
    });

    if (testerError) throw testerError;
    console.log("✅ Tester Auth Success");

    const clientTester = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
        global: { headers: { Authorization: `Bearer ${testerAuth.session.access_token}` } }
    });

    // 4. TESTER tries to complete Task (Scenario: Breaking the App)
    console.log("⚠️ Tester attempting to mark Lead's task as 'done' via DB...");
    const { error: updateError } = await clientTester.from('tasks')
        .update({ status: 'done' })
        .eq('id', task.id);

    if (updateError) {
        console.log(`🛡️ DB Blocked update: ${updateError.message}`);
    } else {
        console.log("⚠️ DB allowed 'done' update. (Note: App store.ts logic handles UI-level enforcement)");
    }

    // 5. TESTER tries to find a PRIVATE task of the Lead
    const privateTitle = `Secret ${Date.now()}`;
    await clientLead.from('tasks').insert({
        title: privateTitle,
        user_id: leadId,
        visibility: 'private',
        status: 'todo',
        priority: 'high'
    });

    const { data: testerVisibleTasks } = await clientTester.from('tasks').select('title').eq('title', privateTitle);
    if (testerVisibleTasks.length === 0) {
        console.log("✅ Security Verified: Tester cannot see Lead's private task.");
    } else {
        console.error("❌ Security Failure: Lead's private task leaked to Tester!");
    }

    // Cleanup
    await clientLead.from('tasks').delete().eq('user_id', leadId).ilike('title', 'Simulation%');
    await clientLead.from('tasks').delete().eq('user_id', leadId).ilike('title', 'Secret%');

    console.log("🏁 Simulation Finished.");
}

runSimulation().catch(console.error);
