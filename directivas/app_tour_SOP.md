# DIRECTIVA: APP_TOUR_SOP

> **ID:** 2026-02-13-TOUR
> **Script Asociado:** `scripts/implement_tour.py` (TBD)
> **Última Actualización:** 2026-02-13
> **Estado:** BORRADOR

---

## 1. Objetivos y Alcance
- **Objetivo Principal:** Crear un tour guiado interactivo que explique el funcionamiento de la app a nuevos usuarios.
- **Restricción Clave:** "No molesto". Debe ser descartable y fácil de ignorar si el usuario ya sabe usar la app.
- **Alcance:**
    - Navegación principal (Sidebar).
    - Vistas clave: Dashboard, Inbox (Captura Rápida/Emails), Tareas, Calendario.
    - Funcionalidades globales: Command Palette, Captura Inteligente.

## 2. Especificaciones Técnicas
- **Librería:** `driver.js` (Ligera, framework-agnostic, moderna).
- **Persistencia:** `localStorage` (key: `app_tour_completed`).
- **Trigger:**
    - Automático: Al cargar la app si el usuario no ha completado el tour.
    - Manual: Botón de ayuda (`#help-tour-btn`) en el Sidebar.

## 3. Visualización y Pasos (Propuesta)
1.  **Bienvenida**: Modal central. "Bienvenido a Agenda. ¿Te damos un tour rápido?" (Botones: "Empezar", "Saltar").
2.  **Sidebar**: Resaltar el Sidebar (`#sidebar`). "Aquí tienes acceso a toda la navegación."
3.  **Inbox / Captura Rápida**: Resaltar el icono de Inbox. "Tu bandeja de entrada unificada. Puedes escribir ideas rápidas o incluso pegar emails enteros."
4.  **Procesamiento IA**: Mostrar cómo la IA extrae tareas de textos largos (ej. emails). "Nuestra IA analiza el contenido y te sugiere acciones estructuradas."
5.  **Dashboard Widgets**: Resaltar Widgets (`.dashboard-grid`). "Resumen inteligente de tus actividades."
6.  **Calendario/Tareas**: Resaltar accesos directos.
7.  **Command Palette**: Resaltar el search bar. "Acceso rápido con Cmd+K."
8.  **Final**: "¡Listo para trabajar!"

## 4. Implementación
- Crear servicio `TourService` (o hook `useTour`) que encapsule `driver.js`.
- Definir pasos en `src/config/tourConfig.ts`.
- Integrar en `App.tsx` o `DashboardView.tsx`.

## 5. Restricciones
- **Responsive**: Verificar comportamiento en móvil.
- **Estilos**: Usar estilos que coincidan con el tema de la app (Tailwind).
- **Control de Estado**: Usar `zustand` o `localStorage` para controlar si se muestra.

## 6. Protocolo de Errores y Aprendizajes (Memoria Viva)

| Fecha | Error Detectado | Causa Raíz | Solución/Parche Aplicado |
|-------|-----------------|------------|--------------------------|
| 2026-02-13 | Uncaught SyntaxError: ... export named 'DriveStep' | Vite/ESM no encuentra exportaciones de tipos en runtime. | Usar `import type { DriveStep }` en lugar de `import`. |
| 2026-02-13 | Type '"center"' is not assignable to Side | El tipo `Side` solo acepta orientaciones físicas. | Usar `side: "over"` para efectos de centrado sobre elementos. |

## 7. Plan de Ejecución
