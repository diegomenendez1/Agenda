# Auditoría de Código - Fase 2: Calidad y Deuda Técnica
**Fecha:** 3 de Febrero, 2026
**Estatura:** Importante (Deuda Técnica Media-Alta)

Tras estabilizar el núcleo (Store y Seguridad), esta segunda fase se centra en la calidad del código, rendimiento de UI y mantenibilidad a largo plazo.

## 🔴 Hallazgos Críticos de Calidad

### 1. Abuso de `any` (Tipado Débil)
Se detectaron **39 instancias** de uso explícito de `any`. Esto anula las garantías de seguridad de TypeScript.

*   **Puntos Calientes:**
    *   `src/features/CalendarView.tsx`: Lógica de clustering (`clusters: any[][]`). Si la estructura de datos cambia, el calendario colapsará en tiempo de ejecución sin avisar al compilador.
    *   `src/feature/KPIView.tsx`: Componentes internos sin tipar.
    *   `src/core/store/slices/*`: Mapeo de respuestas de Supabase (`data.map((i: any) => ...)`). Deberían usar los tipos generados de la DB.

### 2. Componentes "Monolíticos" de UI
Varios componentes exceden la responsabilidad única, mezclando lógica de negocio compleja con presentación.

*   **`CalendarView.tsx` (~600 líneas, 30KB):**
    *   Contiene lógica matemática compleja para posicionar eventos superpuestos (`getPositionedTasks`).
    *   **Riesgo:** Cualquier cambio en el diseño requiere navegar por cientos de líneas de lógica de fechas.
    *   **Solución:** Extraer `useCalendarLayout` (hook lógico) y `CalendarEvent` (componente visual).
*   **`TaskListView.tsx` y `InboxView.tsx`:**
    *   Tamaño considerable (>20KB). Candidatos a división.

### 3. Higiene de Código en Producción
*   **Logs de Depuración:** Se encontraron **26 `console.log`** en el código base, incluyendo logs detallados en `App.tsx` y `EditTaskModal.tsx`.
    *   **Riesgo:** Información sensible o ruido en la consola del navegador del usuario final.
    *   **Solución:** Implementar un `Logger` centralizado que se silencie en producción.

## 🟡 Hallazgos de Base de Datos

*   **Migraciones:** Aunque existe `supabase/migrations`, los nombres de archivo son inconsistentes (`debug_trigger.sql`, `force_test_func.sql`).
*   **Recomendación:** Consolidar el esquema actual en una migración base (`0000_initial_schema.sql`) y aplicar una nomenclatura estricta para futuros cambios.

## 📋 Plan de Acción Recomendado (Priorizado)

1.  **Refactorización de UI (Alto Impacto):**
    *   Dividir `CalendarView.tsx` en `CalendarGrid`, `CalendarHeader` y el hook `useCalendarLayout`.
    *   Extraer componentes internos de `KPIView.tsx` (`StatCard`, `TabButton`) a `src/components/analytics/ui`.

2.  **Limpieza de Tipos (Seguridad):**
    *   Reemplazar `any` en los Slices del Store con tipos estricos (`Task`, `Project`, etc.).
    *   Definir interfaces para las respuestas de RPC de Supabase.

3.  **Sanitización:**
    *   Eliminar todos los `console.log` o reemplazarlos por `Logger.debug()`.

¿Por dónde te gustaría empezar? Personalmente sugiero **Refactorizar CalendarView** ya que es el componente más complejo y propenso a errores.
