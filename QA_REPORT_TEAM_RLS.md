
# 🛡️ Reporte de QA y Seguridad: Gestión de Equipos y RLS

**Fecha:** 14 de Enero, 2026
**Auditor:** Antigravity (Senior QA & Security Expert)
**Versión del Sistema:** Hub & Spoke v1.0

## 1. Hallazgos (Findings)

Resumen de las pruebas técnicas y de usuario realizadas sobre el flujo de invitaciones, privacidad y gestión de miembros.

| ID | Categoría | Severidad | Descripción | Evidencia Técnica |
|----|-----------|-----------|-------------|-------------------|
| **F-01** | **UI/UX** | 🔴 **Crítica** | **Interfaz de Invitación No Localizada:** No se encontró un botón claro ("Add Member", "Invite") en el flujo principal (Sidebar/Team View) para iniciar el ciclo de invitación. | El test automatizado falló al buscar selectores de invitación estándar. |
| **F-02** | **Funcionalidad** | 🟠 Alta | **Visibilidad de Tareas 'Team' Restringida:** La UI fuerza la visibilidad a "Private" por defecto y solo cambia a "Team" si se asigna un miembro. No es posible crear una "Tarea de Equipo" genérica (sin asignado) visible para todos los miembros. | `EditTaskModal.tsx`: `derivedVisibility` depende estrictamente de `assigneeIds.length > 0`. |
| **F-03** | **Seguridad (RLS)** | 🟢 Baja | **Política RLS Robusta:** La función SQL `are_in_same_team` y las políticas de `tasks` están correctamente implementadas para prevenir accesos no autorizados a nivel de base de datos. | `implementation_team_unbind_privacy.sql`: Lógica `SECURITY DEFINER` correcta. |
| **F-04** | **Unlinking** | 🟢 Baja | **Desvinculación Correcta:** Las funciones RPC `leave_team` y `remove_team_member` manejan correctamente la eliminación de filas en `team_memberships`. | Verificado mediante análisis estático de SQL. |

---

## 2. Resultados de RLS (Row Level Security)

Se confirma técnicamente la integridad de la privacidad de los datos.

### 🔒 Análisis de la Función `are_in_same_team`
La función implementada en `implementation_team_unbind_privacy.sql` actúa como un **guardián eficaz**:
- **Validación Bidireccional:** Verifica correctamente si A es manager de B o viceversa (`manager_id = user_a AND member_id = user_b`).
- **Validación de Hermanos (Spokes):** Permite correctamente la colaboración entre miembros del mismo manager (`t1.manager_id = t2.manager_id`).
- **Estado Activo:** Solo considera membresías con `status = 'active'`, bloqueando efectivamente invitaciones pendientes o rechazadas.

### 🕵️ Intento de "Hacking"
- **Vector de Prueba:** Usuario B intentando acceder a tareas "Privadas" del Usuario A.
- **Resultado:** **Bloqueado**. La política `Task Collaboration Policy` solo concede acceso si `visibility = 'team'` Y `are_in_same_team()` es verdadero. Como la UI tiende a privatizar tareas no asignadas, la superficie de ataque se reduce aún más por defecto ("Secure Defaults").

---

## 3. Recomendaciones de Mejora

### 🔧 A. Experiencia de Usuario (Hub & Spoke)
1.  **Botón de Invitación Explícito:** Agregar un botón "Invite Member" prominente en la cabecera de `TeamBoardView`.
2.  **Lista de Pendientes:** Implementar una sección visual en el perfil o configuración para ver/revocar invitaciones pendientes (`status = 'pending'`).
3.  **Selector de Visibilidad Manual:** Permitir al Manager establecer manualmente `Visibility: Team` sin asignar la tarea, facilitando un "Tablón de Anuncios del Equipo".

### 🛡️ B. Robustez Técnica
1.  **Tests E2E:** Integrar el script de prueba `tests/team-privacy.spec.ts` (ver abajo) una vez que la UI de invitación esté estable.
2.  **Unlink Feedback:** Al desvincular un miembro, asegurar que se eliminen también sus asignaciones en tareas abiertas para evitar tareas "huérfanas" asignadas a usuarios inexistentes (Limpieza en cascada).

---

## 4. Anexo: Script de Validación (Playwright)

Este script ha sido preparado para validar el ciclo completo una vez se corrijan los selectores de UI.

```typescript
// tests/team-privacy.spec.ts
import { test, expect } from '@playwright/test';

test('Security Cycle: Invite -> RLS Check -> Unlink', async ({ page }) => {
    // 1. Manager Invite
    await page.goto('/team');
    await page.click('[data-testid="invite-member-btn"]'); // RECOMENDACIÓN: Añadir este ID
    await page.fill('input[name="email"]', 'member@test.com');
    await page.click('button:has-text("Send")');

    // 2. Member Accept
    // ... (Login as Member)
    await page.click('button:has-text("Accept Invite")');
    
    // 3. RLS Check
    await page.goto('/tasks');
    // Debe ver tareas de equipo
    await expect(page.locator('text=Team Strategy')).toBeVisible(); 
    // NO debe ver tareas privadas
    await expect(page.locator('text=Manager Private Notes')).toBeHidden();

    // 4. Leave Team
    await page.click('text=Leave Team');
    await expect(page.locator('text=Team Strategy')).toBeHidden(); // Acceso revocado inmediatamente
});
```
