# DIRECTIVA: MVP_SIMPLIFICATION_SOP

> **ID:** 2026-02-12-MVP-SIMPLEX
> **Estado:** ACTIVO
> **Objetivo:** Garantizar que la App sea utilizable por usuarios sin experiencia previa, reduciendo la carga cognitiva inicial.

## 1. Filosofía de Simplificación "Zero-Learning-Curve"
- **Principio:** "No me hagas pensar". Cada pantalla debe tener una sola acción primaria obvia.
- **Ocultamiento Progresivo:** Las funcionalidades avanzadas (IA, filtros complejos, configuraciones profundas) deben estar ocultas o en un segundo nivel hasta que el usuario las necesite expresamente.

## 2. Áreas de Foco

### A. Navegación (Sidebar)
- **Problema Actual:** Demasiadas opciones visibles de inicio (Dashboard, Inbox, Tasks, Team, Calendar, Analytics, Notes).
- **Solución:** Simplificar el menú lateral para usuarios nuevos.
    - Ocultar `Analytics` (KPIs) y `My Team` inicialmente si el usuario está solo.
    - Renombrar `My Tasks` a algo más directo si es confuso, o mantenerlo pero asegurar que la vista por defecto sea simple.

### B. Inbox & Captura
- **Problema Actual:** El Inbox tiene modos de selección masiva, edición en línea compleja y modales de IA con múltiples opciones.
- **Solución:**
    - El input de captura (`SmartInput`) debe ser el protagonista absoluto.
    - Reducir la prominencia de botones secundarios.
    - El modal de procesamiento (`ProcessItemModal`) debe guiar la acción, no solo ofrecer opciones. "Review Only" y "Auto Process" están bien, pero los textos deben ser menos técnicos.

### C. Terminología (Copywriting)
- **Problema Actual:** Términos como "Backlog", "Triaje", "Procesamiento IA" pueden asustar a usuarios no técnicos.
- **Solución:**
    - Revisar `i18n.ts` para usar lenguaje más natural.
    - Ejemplo: En lugar de "Process Item", usar "Organizar" o "¿Qué quieres hacer?".

## 3. Lista de Verificación de Simplificación (Do's & Don'ts)

| Componente | DO (Hacer) | DON'T (Evitar) |
| :--- | :--- | :--- |
| **Botones** | Texto claro + Icono ("Crear Tarea") | Solo Iconos crípticos sin tooltip |
| **Empty States** | Explicar qué hacer a continuación ("Escribe tu primera idea arriba") | Solo decir "No hay datos" |
| **Feedback** | Toasts claros ("Tarea guardada") | Logs de error técnicos visibles |
| **Onboarding** | Preguntar solo el nombre del Workspace | Pedir configuración compleja de horarios al inicio |

## 4. Plan de Acción Inmediato
1.  **Refinar Sidebar:** Ocultar ítems irrelevantes para equipos de 1 persona o cuentas nuevas.
2.  **Simplificar ProcessModal:** Hacer que la opción "Manual" sea más accesible o clara si la IA falla o intimida.
3.  **Revisión de Textos:** Auditar `es` en `i18n.ts` para suavizar el tono técnico.
