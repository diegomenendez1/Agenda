import { useStore } from './store';

// Translation Dictionaries
const DICTIONARY = {
    es: {
        // Navigation (Sidebar)
        nav: {
            inbox: 'Bandeja de Entrada',
            my_tasks: 'Mi Trabajo',
            my_team: 'Equipo',
            calendar: 'Calendario',
            analytics: 'Insights',
            notes: 'Notas',
            search: 'Buscar...',
            switch_workspace: 'Cambiar Espacio',
            logout: 'Cerrar Sesión',
            leave_team: 'Salir del Equipo'
        },
        // Task Status (Kanban)
        status: {
            backlog: 'Backlog / Entrantes',
            todo: 'Por Hacer',
            in_progress: 'En Progreso',
            review: 'Revisión',
            done: 'Hecho'
        },
        // Common Actions
        actions: {
            save: 'Guardar Cambios',
            cancel: 'Cancelar',
            delete: 'Eliminar',
            edit: 'Editar',
            create: 'Crear',
            accept: 'Aceptar',
            reject: 'Rechazar',
            start: 'Iniciar Tarea',
            waiting: 'Esperando Equipo',
            skip: 'Saltar e Iniciar',
            clear_done: 'Limpiar Completadas'
        },
        // Table View
        table: {
            column_title: 'Nombre de Tarea',
            column_assignees: 'Asignados',
            column_priority: 'Prioridad',
            column_due_date: 'Fecha Límite',
            empty_state: 'No hay tareas con estos filtros.'
        },
        settings: {
            title: 'Configuración de Cuenta',
            subtitle: 'Gestiona tu información personal y preferencias.',
            personal_info: 'Información Personal',
            full_name: 'Nombre Completo',
            email: 'Correo Electrónico',
            language_region: 'Idioma y Región',
            app_language: 'Idioma de la App',
            ai_note: 'La IA generará tareas en este idioma.',
            ai_context_title: 'Contexto del Asistente IA',
            ai_context_desc: 'Define el enfoque de tu equipo, tu rol o instrucciones específicas...',
            calendar_prefs: 'Preferencias de Calendario',
            working_start: 'Inicio Jornada',
            working_end: 'Fin Jornada',
            working_days: 'Días Laborales',
            calendar_note: 'Estos horarios serán usados por la IA para agendar tus tareas.',
            save: 'Guardar Cambios',
            invitations: 'Invitaciones de Equipo',
            join: 'Unirse a',
            invited_by: 'Invitado por',
            accept: 'Aceptar',
            decline: 'Rechazar'
        },
        priority: {
            critical: 'Crítica',
            high: 'Alta',
            medium: 'Media',
            low: 'Baja'
        },
        // Modals & Forms
        modal: {
            process_title: 'Procesar Elemento',
            edit_task: 'Editar Tarea',
            create_task: 'Crear Nueva Tarea',
            accept_process: 'Aceptar y Procesar',
            title_placeholder: 'Título de la tarea...',
            desc_placeholder: 'Añadir descripción o contexto...',
            ai_processing: 'IA Procesando...',
            auto_fill: 'Auto-Completar con IA',
            review_only: 'Recordar Revisar',
            review_sub: 'Crear 1 tarea simple',
            extract_actions: 'Extraer Acciones',
            extract_sub: 'Detectar sub-tareas con IA',
            select_tasks: 'Seleccionar Tareas',
            ai_found: 'IA encontró tareas potenciales',
            turn_thought: 'Convierte este pensamiento en acción',
            original_input: 'Entrada Original',
            how_process: '¿Cómo quieres procesar esto?',
            manual_switch: 'Cambiar a Manual',
            confirm_create: 'Confirmar y Crear',
            confirmed: '¡Confirmado!',
            create_n_tasks: 'Crear Tareas',
            use_original: 'Usar Original',
            no_desc: 'Sin descripción.',
            shared_with_team: 'Compartido',
            private_task: 'Privada',
            find_member: 'Buscar...',
            return_revision: 'Devolver para Revisión',
            approve_complete: 'Aprobar y Completar',
            submit_review: 'Enviar a Revisión',
            confirm_todo: 'Confirmar y Por Hacer',
            saved: '¡Guardado!',
            delete_confirm: '¿Eliminar esta tarea?',
            leave_confirm: '¿Salir de esta tarea?',
            view_only: 'Solo lectura • Solo el dueño o líderes pueden editar.',
            labels: {
                title: 'TÍTULO',
                desc: 'DESCRIPCIÓN / CONTEXTO',
                status: 'ESTADO',
                due_date: 'FECHA Y REPETICIÓN',
                share: 'COMPARTIR / DELEGAR',
                priority: 'PRIORIDAD'
            }
        },
        // Daily Digest
        daily_digest: {
            good_morning: 'Buenos días',
            greeting_default: 'Hola',
            intro_text: 'Aquí está tu enfoque para hoy.',
            missed_deadlines: 'PLAZOS VENCIDOS',
            missed_deadlines_sub: 'Plazos Vencidos',
            needs_attention: 'NECESITA ATENCIÓN',
            stalled_tasks: 'Tareas Estancadas',
            blocked: '¿Bloqueado?',
            todays_focus: 'ENFOQUE RECOMENDADO',
            focus_sub: 'Basado en prioridad y fechas',
            no_urgent: 'Sin tareas urgentes. ¡Disfruta tu día! ☕',
            go_to_inbox: 'Ir al Inbox',
            review: 'Revisar'
        }
    },
    en: {
        nav: {
            inbox: 'Inbox',
            my_tasks: 'My Work',
            my_team: 'Team',
            calendar: 'Calendar',
            analytics: 'Insights',
            notes: 'Notes',
            search: 'Search...',
            switch_workspace: 'Switch Workspace',
            logout: 'Sign Out',
            leave_team: 'Leave Team'
        },
        status: {
            backlog: 'Backlog / Incoming',
            todo: 'To Do',
            in_progress: 'In Progress',
            review: 'Review',
            done: 'Done'
        },
        actions: {
            save: 'Save Changes',
            cancel: 'Cancel',
            delete: 'Delete',
            edit: 'Edit',
            create: 'Create',
            accept: 'Accept',
            reject: 'Reject',
            start: 'Start Task',
            waiting: 'Waiting for Team',
            skip: 'Skip & Start',
            clear_done: 'Clear Done'
        },
        table: {
            column_title: 'Task Name',
            column_assignees: 'Assignees',
            column_priority: 'Priority',
            column_due_date: 'Due Date',
            empty_state: 'No tasks match your filters.'
        },
        settings: {
            title: 'Account Settings',
            subtitle: 'Manage your personal information and application preferences.',
            personal_info: 'Personal Information',
            full_name: 'Full Name',
            email: 'Email Address',
            language_region: 'Language & Region',
            app_language: 'App Language',
            ai_note: 'AI will generate tasks in this language.',
            ai_context_title: 'AI Assistant Context',
            ai_context_desc: 'Define your teams focus, your role, or any specific instructions...',
            calendar_prefs: 'Calendar Preferences',
            working_start: 'Working Day Start',
            working_end: 'Working Day End',
            working_days: 'Working Days',
            calendar_note: 'These hours and days will be used by the AI to intelligently schedule your tasks.',
            save: 'Save Changes',
            invitations: 'Team Invitations',
            join: 'Join',
            invited_by: 'Invited by',
            accept: 'Accept',
            decline: 'Decline'
        },
        priority: {
            critical: 'Critical',
            high: 'High',
            medium: 'Medium',
            low: 'Low'
        },
        modal: {
            process_title: 'Process Item',
            edit_task: 'Edit Task',
            create_task: 'Create New Task',
            accept_process: 'Accept & Process Item',
            title_placeholder: 'Task Title...',
            desc_placeholder: 'Add description or context...',
            ai_processing: 'AI Processing...',
            auto_fill: 'Auto-Fill with AI',
            review_only: 'Remember to Review',
            review_sub: 'Create 1 simple task',
            extract_actions: 'Extract Actions',
            extract_sub: 'Detect sub-tasks with AI',
            select_tasks: 'Select Tasks',
            ai_found: 'AI found potential tasks',
            turn_thought: 'Turn this thought into an actionable task',
            original_input: 'Original Input',
            how_process: 'How do you want to process this?',
            manual_switch: 'Switch to Manual',
            confirm_create: 'Confirm & Create',
            confirmed: 'Confirmed!',
            create_n_tasks: 'Create Tasks',
            use_original: 'Use Original',
            no_desc: 'No description provided.',
            shared_with_team: 'Shared with Team',
            private_task: 'Private Task',
            find_member: 'Find member...',
            return_revision: 'Return for Revision',
            approve_complete: 'Approve & Complete',
            submit_review: 'Submit for Review',
            confirm_todo: 'Confirm & To Do',
            saved: 'Saved!',
            delete_confirm: 'Delete this task?',
            leave_confirm: 'Leave this task?',
            view_only: 'View only mode • Only the task owner or heads can edit details.',
            labels: {
                title: 'TITLE',
                desc: 'DESCRIPTION / CONTEXT',
                status: 'STATUS',
                due_date: 'DUE DATE & REPEAT',
                share: 'SHARE / DELEGATE',
                priority: 'PRIORITY'
            }
        },
        daily_digest: {
            good_morning: 'Good Morning',
            greeting_default: 'Friend',
            intro_text: 'Here is your focus for today.',
            missed_deadlines: 'MISSED DEADLINES',
            missed_deadlines_sub: 'Missed Deadlines',
            needs_attention: 'NEEDS ATTENTION',
            stalled_tasks: 'Stalled Tasks',
            blocked: 'Blocked?',
            todays_focus: 'RECOMMENDED FOCUS',
            focus_sub: 'Based on priority & deadlines',
            no_urgent: 'No urgent tasks. Enjoy your day! ☕',
            go_to_inbox: 'Go to Inbox',
            review: 'Review'
        }
    }
};

/**
 * Custom Hook for Internationalization
 * Uses the global user preference specifically.
 */
export function useTranslation() {
    const { user } = useStore();
    // Default to Spanish if not set
    const lang = user?.preferences?.appLanguage || 'es';

    // Safety check: if dictionary doesn't have the language, fallback to 'es'
    const t = DICTIONARY[lang] || DICTIONARY['es'];

    return { t, lang };
}
