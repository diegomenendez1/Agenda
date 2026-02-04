# Plan de Refactorización: Modularización del Store Core

## Objetivo
Dividir el archivo monolítico `store.ts` (>1900 líneas) en módulos funcionales ("slices") utilizando el patrón de Slices de Zustand. Esto mejorará la mantenibilidad, legibilidad y facilitará pruebas unitarias futuras.

## Estructura Propuesta

La nueva estructura de archivos será:
```text
src/core/store/
├── index.ts              (Punto de entrada, combina los slices)
├── types.ts              (Interfaces unificadas del Store)
└── slices/
    ├── createAuthSlice.ts
    ├── createTaskSlice.ts
    ├── createProjectSlice.ts
    ├── createInboxSlice.ts
    ├── createNoteSlice.ts
    ├── createTeamSlice.ts
    ├── createNotificationSlice.ts
    ├── createActivitySlice.ts
    ├── createAISlice.ts
    └── createHabitSlice.ts
```

## Slices Definidos

### 1. Auth Slice
- **Estado:** `user`, `myWorkspaces`.
- **Acciones:** `initialize`, `switchWorkspace`, `renameWorkspace`, `updateUserProfile`, `fetchWorkspaces`.

### 2. Task Slice
- **Estado:** `tasks`.
- **Acciones:** `addTask`, `updateTask`, `updateStatus`, `assignTask`, `toggleTaskStatus`, `deleteTask`, `clearCompletedTasks`, `claimTask`, `unassignTask`.
- **Dependencias:** `logActivity`, `sendNotification` (desde otros slices).

### 3. Team Slice
- **Estado:** `team`, `activeInvitations`.
- **Acciones:** Gestión de invitaciones y miembros (`sendInvitation`, `leaveTeam`, etc.).

### 4. UI/Notification Slice
- **Estado:** `notifications`, `onlineUsers`.
- **Acciones:** Gestión de notificaciones y presencia.

### 5. Activity Slice
- **Estado:** `activities`.
- **Acciones:** `logActivity`, `updateActivity`, `fetchActivities`.

### 6. Otros Slices (Simple CRUD)
- **Inbox, Note, Project, Habit, AI.**

## Plan de Ejecución 

1.  **Crear Directorio:** Preparar `src/core/store/slices`.
2.  **Extraer Tipos:** Mover las interfaces de acciones de `store.ts` a un archivo de tipos o dividirlas por slice.
3.  **Migrar Slices Independientes:** Comenzar por los slices que tienen menos dependencias (`AISlice`, `HabitSlice`, `NoteSlice`).
4.  **Migrar Slices Nucleares:** Mover `AuthSlice` y `ActivitySlice` (usados por todos).
5.  **Migrar Slices Complejos:** Mover `TaskSlice` (lógica pesada).
6.  **Reensamblar:** Actualizar `src/core/store.ts` (o `index.ts`) para usar `create(...)` combinando los slices.
7.  **Verificación:** Asegurar que `useStore` sigue funcionando igual para los componentes existentes.

## Riesgos y Mitigación
-   **Riesgo:** Referencias circulares o pérdida de contexto `this` (Zustand usa `get()` así que esto está controlado).
-   **Mitigación:** Verificar cada función migrada para asegurar que usa `get()` correctamente para acceder a estados de otros slices (ej: `get().user`).
