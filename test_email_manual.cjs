
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

    // 3. Disparar Email via Notificacion (Probando el nuevo Trigger)
    console.log('Insertando notificacion para disparar el trigger...');

    const { error: noticeError } = await supabase.from('notifications').insert({
        user_id: targetUser.id,
        organization_id: targetUser.organization_id,
        type: 'assignment',
        title: `Nueva Tarea: ${taskTitle}`,
        message: `Hola Diego, tienes una nueva tarea: ${taskTitle}. Revisa el sistema.`
    });

    if (noticeError) {
        console.error('Error insertando notificacion:', noticeError);
    } else {
        console.log('✅ Notificacion insertada. El trigger deberia estar enviando el email ahora.');
        console.log('Revisa los logs de la Edge Function en Supabase Dashboard.');
    }
}

assignTask();
