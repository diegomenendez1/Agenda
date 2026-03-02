# Directiva: Habilitar Copiado de Texto en Tareas del Calendario

## Objetivo
Permitir que el usuario pueda seleccionar y copiar el texto de las tareas (títulos) directamente desde la vista de calendario.

## Contexto
Actualmente, los eventos del calendario tienen deshabilitada la selección de texto (`user-select: none`) para evitar interferencias con las funciones de arrastrar y soltar (Drag and Drop) y redimensionamiento. El usuario desea poder copiar la información de estas tareas sin tener que abrirlas.

## Entradas
- Archivo: `src/features/calendar/CalendarEvent.tsx`
- Estilos CSS involucrados: `user-select`, clases `select-none`.

## Lógica de Implementación
1.  **Copiado Automático al Click Derecho**: El manejador `onContextMenu` intercepta el click derecho, previene el menú del navegador (`preventDefault`) e inmediatamente escribe el título de la tarea en el portapapeles usando la API `navigator.clipboard.writeText`.
2.  **Notificación Visual**: Se dispara un `toast.success` de la librería `sonner` para confirmar al usuario que el texto se ha copiado, mostrando un fragmento del título.
3.  **Prioridad de Interacción**: Se han ajustado los `zIndex` y `pointer-events` en `CalendarEvent.tsx` y `KanbanBoard.tsx` para asegurar que el click derecho siempre sea capturado por la tarea y no por el fondo del contenedor.

## Restricciones y Decisiones
- **Sin Menú Visual**: Se decidió eliminar el menú contextual visual (que obligaba a un segundo click) para maximizar la velocidad de operación del usuario.
- **Conflictos con Drag & Drop**: La captura del click derecho no interfiere con el arrastre (click izquierdo pulsado), manteniendo ambas funcionalidades integrales.
- **Feedback Rápido**: La duración del toast se ha ajustado a 1500ms para no ser intrusivo.

## Salidas
- Código actualizado en `CalendarEvent.tsx` con soporte para click derecho -> copiar.

## Trampas Conocidas
- **Interferencia con Drag & Drop**: Al seleccionar texto, el navegador podría intentar arrastrar la selección de texto en lugar de disparar el evento `onDragStart` del componente. Si esto ocurre, se podría aplicar la selección solo a elementos específicos del título o usar un botón de "copiar" dedicado, pero la solicitud es "poder copiar el texto", por lo que habilitar la selección es el primer paso lógico.
