# Protocolo de Métricas y Dashboard

## Objetivo
Garantizar que el Dashboard muestre datos precisos, en tiempo real y preserve métricas históricas independientemente del estado de las tareas individuales.

## Principios
1.  **Integridad de Datos**: Las métricas históricas (ej. "tareas completadas la semana pasada") no deben disminuir si una tarea se elimina o se archiva.
2.  **Tiempo Real**: El Dashboard debe reflejar cambios realizados por otros usuarios o en otras sesiones sin necesidad de recargar (F5).
3.  **Rendimiento**: No cargar todo el historial de tareas en la memoria del cliente solo para calcular métricas.

## Estrategia de Implementación
1.  **Persistencia**:
    - No eliminar físicamente ("Hard Delete") las tareas completadas si se necesitan para estadísticas. Usar "Soft Delete" (columna `archived` o `deleted_at`).
    - Alternativamente, usar una tabla `daily_metrics` o `activity_logs` desacoplada del ciclo de vida de la tarea (asegurar que no tenga `ON DELETE CASCADE`).

2.  **Visualización**:
    - **Estado Actual**: Usar el store de Zustand (`tasks`) para contadores en tiempo real de tareas activas.
    - **Histórico**: Consultar `activity_logs` o tabla de métricas dedicada para gráficas y totales históricos.

3.  **Conectividad**:
    - Implementar suscripciones de Supabase Realtime en vistas clave (`DashboardView`).
    - Suscribirse a cambios en `activity_logs` para actualizar el feed de actividad al instante.

## Restricciones
- No iterar sobre `tasks` para calcular métricas históricas pesadas en el frontend.
- Evitar consultas masivas (`select *`) a `activity_logs` sin paginación o límites.
