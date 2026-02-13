import type { DriveStep } from "driver.js";

export const tourSteps: DriveStep[] = [
    {
        popover: {
            title: '¡Bienvenido a Agenda!',
            description: 'Tu nuevo centro de control para la productividad. ¿Empezamos?',
            side: "over",
            align: 'center'
        }
    },
    {
        element: '#nav-dashboard',
        popover: {
            title: 'Panel Principal',
            description: 'Tu visión global: indicadores clave, actividad reciente y tus tareas prioritarias.',
            side: "right",
            align: 'start'
        },
        onHighlightStarted: (el) => { if (el) (el as HTMLElement).click(); }
    },
    {
        element: '#dashboard-view',
        popover: {
            title: 'Analiza tu Día',
            description: 'Aquí verás un resumen inteligente de lo que requiere tu atención inmediata.',
            side: "top",
            align: 'center'
        }
    },
    {
        element: '#nav-inbox',
        popover: {
            title: 'Captura Rápida',
            description: 'La clave de la productividad es sacar las ideas de tu cabeza. Usa el Inbox para capturar todo sin fricción.',
            side: "right",
            align: 'start'
        },
        onHighlightStarted: (el) => { if (el) (el as HTMLElement).click(); }
    },
    {
        element: '#first-inbox-item',
        popover: {
            title: 'Procesamiento',
            description: 'Haz clic en una captura para procesarla. Vamos a ver cómo funciona la herramienta de procesamiento...',
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
            title: 'Herramienta de Procesado',
            description: 'Aquí ocurre la magia. Nuestra IA analiza el texto y te sugiere títulos, fechas y prioridades. Puedes convertir una captura en una tarea estructurada con un solo clic.',
            side: "over",
            align: 'center'
        }
    },
    {
        element: '#nav-tasks',
        popover: {
            title: 'Gestor de Tareas',
            description: 'Donde la planificación se convierte en ejecución.',
            side: "right",
            align: 'start'
        },
        onHighlightStarted: (el) => {
            // Close modal if open before moving to tasks
            const closeBtn = document.querySelector('#process-item-modal button') as HTMLElement;
            if (closeBtn) closeBtn.click();
            if (el) (el as HTMLElement).click();
        }
    },
    {
        element: '#smart-sort-btn',
        popover: {
            title: 'Smart Sort (IA)',
            description: 'Nuestra IA analiza dependencias y plazos para ordenarte el tablero de forma óptima.',
            side: "bottom",
            align: 'center'
        }
    },
    {
        element: '#tasks-view',
        popover: {
            title: 'Flujo de Trabajo',
            description: `
                Mueve tus tareas entre columnas para reflejar su estado actual. ¡Es tan simple como arrastrar!
                <div class="kanban-demo-container">
                    <div class="kanban-demo-col">TODO</div>
                    <div class="kanban-demo-col">IN PROGRESS</div>
                    <div class="kanban-demo-card"></div>
                    <div class="kanban-demo-hand"></div>
                </div>
            `,
            side: "top",
            align: 'center'
        }
    },
    {
        element: '#nav-my-team',
        popover: {
            title: 'Equipo',
            description: 'Colabora, delega y supervisa la carga de trabajo de tu organización.',
            side: "right",
            align: 'start'
        },
        onHighlightStarted: (el) => { if (el) (el as HTMLElement).click(); }
    },
    {
        element: '#nav-calendar',
        popover: {
            title: 'Calendario',
            description: 'Bloquea tiempo para lo que realmente importa.',
            side: "right",
            align: 'start'
        },
        onHighlightStarted: (el) => { if (el) (el as HTMLElement).click(); }
    },
    {
        element: '#help-tour-btn',
        popover: {
            title: '¿Dudas?',
            description: 'Reinicia este tour en cualquier momento desde aquí. ¡Buena suerte!',
            side: "top",
            align: 'center'
        }
    },
    {
        popover: {
            title: '¡Agenda Dominada!',
            description: 'Estás listo para llevar tu productividad al siguiente nivel.',
            side: "over",
            align: 'center'
        },
        onHighlightStarted: (el) => { window.location.hash = '/'; }
    }
];
