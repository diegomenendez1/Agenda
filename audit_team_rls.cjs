const { createClient } = require('@supabase/supabase-js');

// Config check (using values from verified simulation files)
const supabaseUrl = 'https://dovmyyrnhudfwvrlrzmw.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRvdm15eXJuaHVkZnd2cmxyem13Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjczMTI3NTMsImV4cCI6MjA4Mjg4ODc1M30.wM_qaUBOrE8BITOgE9asPG1vl2ZDdxgp8eqq_28stpY';

// Test Credentials
const userA = { email: 'tester@test.com', pass: '123456' };
const userB = { email: 'Diegomenendez1@gmail.com', pass: 'Yali.202' };

async function runAudit() {
    console.log("🔒 [AUDIT START] - Team Security & RLS Verification");
    console.log("---------------------------------------------------");

    // 1. Authenticate Users
    console.log("🔑 Authenticating Users...");

    // Client for User A
    const clientA = createClient(supabaseUrl, supabaseKey, { auth: { persistSession: false } });
    const { data: { session: sessionA }, error: errA } = await clientA.auth.signInWithPassword({
        email: userA.email,
        password: userA.pass
    });
    if (errA) {
        console.error("❌ Failed to login User A:", errA.message);
        return;
    }
    console.log(`✅ User A (${userA.email}) Logged in. ID: ${sessionA.user.id}`);

    // Client for User B
    const clientB = createClient(supabaseUrl, supabaseKey, { auth: { persistSession: false } });
    const { data: { session: sessionB }, error: errB } = await clientB.auth.signInWithPassword({
        email: userB.email,
        password: userB.pass
    });
    if (errB) {
        console.error("❌ Failed to login User B:", errB.message);
        return;
    }
    console.log(`✅ User B (${userB.email}) Logged in. ID: ${sessionB.user.id}`);


    // 2. Verify Roles
    console.log("\n🕵️  Verifying Roles...");
    const { data: profileA } = await clientA.from('profiles').select('role').single();
    const { data: profileB } = await clientB.from('profiles').select('role').single();

    console.log(`   User A Role: ${profileA.role}`);
    console.log(`   User B Role: ${profileB.role}`);

    // We expect User B to be Owner/Admin and User A to be Member/User
    // If User A is 'user', they might not have invite permissions depending on our policy (Manager+).
    // Policy says: role IN ('owner', 'admin', 'manager', 'lead')

    // 3. Scenario: User B (Owner) Sends Invitation
    console.log("\n🧪 Test: Owner sends invitation (Should Succeed)");
    const testEmail = `audit_test_${Date.now()}@example.com`;

    // We need a team ID. Let's fetch one from User B's perspective
    // Or just insert if we know the policy allows knowing the ID via RLS
    const { data: teamsB } = await clientB.from('teams').select('id, name').limit(1);
    if (!teamsB || teamsB.length === 0) {
        console.error("❌ No teams found for User B even though they are owner. Seeding might be needed.");
        // Try to create one if owner
        if (profileB.role === 'owner') {
            // Create team
        }
        return;
    }
    const targetTeamId = teamsB[0].id;
    console.log(`   Target Team: ${teamsB[0].name} (${targetTeamId})`);

    const { data: invite, error: inviteError } = await clientB
        .from('team_invitations')
        .insert({
            team_id: targetTeamId,
            email: testEmail,
            role: 'member',
            invited_by: sessionB.user.id
        })
        .select()
        .single();

    if (inviteError) {
        console.error("❌ Owner Invite Failed:", inviteError.message);
    } else {
        console.log("✅ Owner Invite Created Successfully. ID:", invite.id);
    }


    // 4. Scenario: User A (Member) Tries to View Invites (Access Control)
    console.log("\n🧪 Test: Member views invitations (Should see NONE or ONLY own if invited)");

    // Check if User A is actually a member of this team to even have "team_members" check pass? 
    // Policy: "View invitations for my team" -> EXISTS(team_members ... role in exec/lead) OR invited_by OR email=me

    const { data: invitesViewedByA, error: viewErrorA } = await clientA
        .from('team_invitations')
        .select('*');

    if (viewErrorA) {
        console.log("   view error:", viewErrorA.message);
    } else {
        const canSee = invitesViewedByA.find(i => i.id === invite?.id);
        if (canSee) {
            // If User A is just a 'user'/'member', they should NOT see it unless they created it (impossible) or are the target
            if (profileA.role === 'owner' || profileA.role === 'admin') {
                console.log("   ℹ️ User A is Admin/Owner, so visibility is expected.");
            } else {
                console.error("❌ SECURITY FAIL: User A (Member) can see Owner's invitation:", canSee);
            }
        } else {
            console.log("✅ SECURITY PASS: User A cannot see the invitation.");
        }
    }

    // 5. Scenario: User A Tries to Create Invite (Should Fail)
    if (profileA.role !== 'owner' && profileA.role !== 'admin' && profileA.role !== 'manager') {
        console.log("\n🧪 Test: Member attempts to create invitation (Should Fail)");
        const { error: maliceError } = await clientA
            .from('team_invitations')
            .insert({
                team_id: targetTeamId,
                email: 'malicious_invite@hack.com',
                role: 'cfo' // Try to assign high role
            });

        if (maliceError) {
            console.log("✅ SECURITY PASS: Creation blocked:", maliceError.message);
        } else {
            console.error("❌ SECURITY FAIL: Member was able to create an invitation!");
        }
    }

    // 6. Edge Case: Duplicate Invitation
    console.log("\n🧪 Test: Owner sends DUPLICATE invitation (Should Fail/Error)");
    if (invite) {
        const { error: dupError } = await clientB
            .from('team_invitations')
            .insert({
                team_id: targetTeamId,
                email: testEmail, // Same email
                role: 'member',
                invited_by: sessionB.user.id
            });

        if (dupError && (dupError.code === '23505' || dupError.message.includes('unique'))) {
            console.log("✅ INTEGRITY PASS: Duplicate prevented (Unique Constraint).");
        } else {
            console.error("❌ INTEGRITY FAIL: Duplicate NOT prevented or unexpected error:", dupError?.message || "No error");
        }
    }

    // 7. Cleanup (Revoke)
    console.log("\n🧹 Cleanup: Revoking test invite...");
    if (invite) {
        const { error: revokeError } = await clientB
            .from('team_invitations')
            .delete() // effectively revoking by deleting for this test, or usually update status='revoked'
            .eq('id', invite.id);

        if (!revokeError) console.log("✅ Cleanup Successful.");
    }

    console.log("\n---------------------------------------------------");
    console.log("🔒 [AUDIT COMPLETE]");
}

runAudit().catch(err => console.error("Fatal Script Error:", err));
