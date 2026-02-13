import type { DriveStep } from "driver.js";

export const tourSteps: DriveStep[] = [
    {
        popover: {
            title: '¡Bienvenido a Agenda!',
            description: 'Tu nuevo centro de control de alto rendimiento. Diseñado para que nada se escape y todo se ejecute. ¿Empezamos?',
            side: "over",
            align: 'center'
        }
    },
    {
        element: '#nav-dashboard',
        popover: {
            title: 'Tu Panel de Mando',
            description: 'Aquí es donde vive tu enfoque. Verás tus métricas clave y lo que requiere tu atención inmediata.',
            side: "right",
            align: 'start'
        },
        onHighlightStarted: (el) => { if (el) (el as HTMLElement).click(); }
    },
    {
        element: '#dashboard-view',
        popover: {
            title: 'Visión de 360°',
            description: 'Un resumen inteligente. Menos ruido, más claridad sobre tus objetivos del día.',
            side: "top",
            align: 'center'
        }
    },
    {
        element: '#nav-inbox',
        popover: {
            title: 'Captura sin Fricciones',
            description: 'El Inbox es tu descarga mental instantánea. Escribe ideas rápidas o pega textos largos para procesar después.',
            side: "right",
            align: 'start'
        },
        onHighlightStarted: (el) => { if (el) (el as HTMLElement).click(); }
    },
    {
        element: '#first-inbox-item',
        popover: {
            title: 'El Poder de la IA',
            description: 'Procesar es transformar ideas en acciones. Nuestra IA extraerá tareas, fechas y prioridades por ti.',
            side: "top",
            align: 'center'
        },
        onHighlightStarted: (el) => {
            if (el) (el as HTMLElement).click();
        }
    },
    {
        element: '#process-item-modal',
        popover: {
            title: 'Procesador Inteligente',
            description: 'Analiza, categoriza y delega en segundos. De un solo párrafo puedes extraer un plan de acción completo.',
            side: "over",
            align: 'center'
        }
    },
    {
        element: '#nav-tasks',
        popover: {
            title: 'Gestor de Ejecución',
            description: 'Donde los planes se convierten en realidad. Tu tablero Kanban visual para dominar el flujo.',
            side: "right",
            align: 'start'
        },
        onHighlightStarted: (el) => {
            const closeBtn = document.querySelector('#process-item-modal button') as HTMLElement;
            if (closeBtn) closeBtn.click();
            if (el) (el as HTMLElement).click();
        }
    },
    {
        element: '#smart-sort-btn',
        popover: {
            title: 'Smart Sort (Orden Inteligente)',
            description: 'Deja que la IA calcule por ti el orden óptimo basado en plazos, importancia y dependencias.',
            side: "bottom",
            align: 'center'
        }
    },
    {
        element: '#tasks-view',
        popover: {
            title: 'Flujo Visual',
            description: 'Arrastra y suelta tareas para actualizar su progreso. Intuitivo, rápido y eficiente.',
            side: "top",
            align: 'center'
        }
    },
    {
        element: '#nav-my-team',
        popover: {
            title: 'Colaboración en Vivo',
            description: 'Supervisa el rendimiento de tu equipo y delega responsabilidades con un solo clic.',
            side: "right",
            align: 'start'
        },
        onHighlightStarted: (el) => { if (el) (el as HTMLElement).click(); }
    },
    {
        element: '#nav-calendar',
        popover: {
            title: 'Enfoque Temporal',
            description: 'Bloquea tiempo de calidad para tus tareas críticas. Una agenda visual para una mente tranquila.',
            side: "right",
            align: 'start'
        },
        onHighlightStarted: (el) => { if (el) (el as HTMLElement).click(); }
    },
    {
        element: '#help-tour-btn',
        popover: {
            title: 'Asistencia Continua',
            description: '¿Necesitas un repaso? Reinicia este tour siempre que quieras desde aquí.',
            side: "top",
            align: 'center'
        }
    },
    {
        popover: {
            title: '¡Agenda Dominada!',
            description: 'Estás listo para alcanzar el máximo rendimiento. ¡A por ello!',
            side: "over",
            align: 'center'
        },
        onHighlightStarted: (el) => { window.location.hash = '/'; }
    }
];
