# Informe de Auditoría de Código - Agenda

**Fecha:** 3 de Febrero, 2026
**Estatura:** Crítica (Requiere cambios antes de producción)

## Resumen Ejecutivo
El proyecto es una aplicación React (Vite) funcional con backend Supabase. Implementa características avanzadas como gestión de tareas, colaboración en tiempo real y características de IA. Sin embargo, la arquitectura actual presenta riesgos de seguridad críticos y problemas de escalabilidad que deben resolverse antes de cualquier despliegue real o escalado de funcionalidad.

## Hallazgos Críticos 🔴

### 1. Seguridad: Exposición de API Keys y Proxy Inseguro
- **Archivo:** `src/core/aiTaskProcessing.ts`, `vite.config.ts`
- **Problema:** La clave de OpenAI (`VITE_OPENAI_API_KEY`) se carga en el cliente mediante `import.meta.env`. En un entorno de producción (SPA), esta clave será visible para cualquier usuario que inspeccione el código fuente.
- **Problema Adicional:** La configuración de proxy en `vite.config.ts` solo funciona en modo desarrollo (`npm run dev`). En producción, las llamadas a `/api/openai` fallarán (404) a menos que se configure un servidor intermedio idéntico, lo cual no es estándar para depliegues de SPAs estáticos.

### 2. Arquitectura: "God Object" en Gestión de Estado
- **Archivo:** `src/core/store.ts`
- **Tamaño:** ~2000 líneas, ~80KB.
- **Problema:** El store de Zustand maneja **TODA** la lógica de la aplicación: Auth, Tareas, Proyectos, Notificaciones, Hooks de Realtime, etc.
- **Riesgo:** Esto hace que el código sea extremadamente difícil de mantener, probar y depurar. Un error en una parte puede romper toda la aplicación. Viola el principio de separación de responsabilidades.

### 3. Base de Datos: Estrategia de Migración Fragmentada
- **Archivos:** Múltiples archivos `.sql` en la raíz (`fix_rls_security.sql`, `setup_teams.sql`, etc.) vs `supabase/migrations`.
- **Problema:** No hay una fuente de verdad clara para el esquema de la base de datos. Parece haber muchas correcciones ad-hoc ("parches") aplicadas manualmente.
- **Riesgo:** Dificultad para reproducir el entorno en producción o para nuevos desarrolladores. Riesgo de inconsistencias de datos y vulnerabilidades de seguridad (RLS) si no se aplican los scripts en el orden correcto.

## Hallazgos de Calidad de Código 🟠

### 1. Componentes de UI Gigantes
- **Ejemplo:** `src/features/CalendarView.tsx` (~30KB), `InboxView.tsx`.
- **Problema:** Los componentes de vista contienen mucha lógica de negocio mezclada con la presentación. Deberían dividirse en sub-componentes más pequeños y manejables.

### 2. Hardcoding y Magic Strings
- **Ejemplo:** `src/features/AuthView.tsx` usa URLs hardcoded (`https://ui-avatars.com...`) y estilos en línea que deberían estar en configuración o utilidades.

## Recomendaciones Inmediatas (Plan de Acción)

Antes de añadir nuevas funcionalidades, se **DEBE** realizar la siguiente refactorización:

1.  **Seguridad (Prioridad Alta):**
    -   Mover la lógica de llamada a OpenAI a una **Supabase Edge Function**.
    -   El cliente llamará a `supabase.functions.invoke('ai-task-processing')`.
    -   La API Key de OpenAI se guardará de forma segura en los Secrets de Supabase, **nunca** en el cliente.

2.  **Refactorización del Store (Prioridad Media/Alta):**
    -   Dividir `store.ts` en "slices" independientes (ej: `createTaskSlice`, `createAuthSlice`, `createProjectSlice`).
    -   Esto mejorará la legibilidad y mantenibilidad instantáneamente.

3.  **Limpieza de Base de Datos:**
    -   Consolidar todos los archivos `.sql` dispersos en una estructura de migraciones formal dentro de `supabase/migrations`.

4.  **Configuración de Producción:**
    -   Eliminar la dependencia del proxy de Vite para llamadas a API externas si no se va a usar un servidor Node intermedio en producción.

## Conclusión
El código base tiene una buena funcionalidad base ("MVP Potente"), pero su arquitectura es de "prototipo". Para convertirlo en un producto profesional y seguro, es necesario pagar la deuda técnica acumulada en la gestión de estado y seguridad de APIs.
