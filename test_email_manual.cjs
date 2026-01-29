
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function assignTask() {
    console.log('--- Buscando usuario diegomenendez1 ---');

    // 1. Buscar el ID del usuario por partial match o email
    // Asumimos que 'diegomenendez1' es parte del email o nombre
    const { data: users, error: userError } = await supabase
        .from('profiles')
        .select('*')
        .ilike('email', '%diegomenendez1%')
        .limit(1);

    if (userError || !users || users.length === 0) {
        console.error('User not found:', userError);
        return;
    }

    const targetUser = users[0];
    console.log(`Usuario encontrado: ${targetUser.email} (${targetUser.id})`);

    // 2. Crear Tarea
    const taskId = crypto.randomUUID();
    const taskTitle = "Prueba de Email Automático 🚀";

    const { error: taskError } = await supabase.from('tasks').insert({
        id: taskId,
        title: taskTitle,
        description: "Esta es una tarea de prueba generada para validar el envío de correos.",
        status: 'todo',
        user_id: targetUser.id, // Asignada al owner
        organization_id: targetUser.organization_id,
        assignee_ids: [targetUser.id], // Auto-assigned
        visibility: 'private'
    });

    if (taskError) {
        console.error('Error creando tarea:', taskError);
        return;
    }

    console.log('Tarea creada con exito en BD.');

    // 3. Disparar Email Manualmente (Simulando lo que hace la App)
    console.log('Enviando email de prueba via RPC...');

    const { data, error: emailError } = await supabase.rpc('send_email_via_resend', {
        to_email: targetUser.email,
        subject: `Nueva Tarea: ${taskTitle}`,
        html_body: `<p>Hola Diego,</p><p>Esta es una prueba de fuego.</p><p><strong>${taskTitle}</strong></p><p>Si lees esto, el sistema funciona.</p>`
    });

    if (emailError) {
        console.error('Error enviando email:', emailError);
    } else {
        console.log('✅ Email enviado correctamente (según Postgres).');
        console.log('Respuesta:', data);
    }
}

assignTask();
