# DIRECTIVA: GITHUB_SYNC_SOP

> **ID:** 20260211_GITHUB_SYNC
> **Script Asociado:** N/A (Manual/Direct CLI)
> **Última Actualización:** 2026-02-11
> **Estado:** ACTIVO

---

## 1. Objetivos y Alcance
*Automatizar la sincronización de cambios críticos con el repositorio remoto de GitHub.*
- **Objetivo Principal:** Asegurar que el trabajo local esté respaldado y sea accesible enviando commits a GitHub tras cambios significativos.
- **Criterio de Éxito:** Ejecución exitosa de `git push` sin conflictos.

## 2. Especificaciones de Entrada/Salida (I/O)

### Entradas (Inputs)
- **Archivos Fuente:** Todos los archivos modificados bajo control de versiones.
- **Mensaje de Commmit:** Descripción clara del cambio (siguiendo Conventional Commits).

### Salidas (Outputs)
- **Estado de Git:** Confirmación de `push` exitoso.

## 3. Flujo Lógico (Algoritmo)

1. **Estado:** Verificar archivos modificados con `git status`.
2. **Adición:** Agregar cambios con `git add .` (evitando archivos en `.gitignore`).
3. **Commit:** Realizar el commit con un mensaje descriptivo: `git commit -m "tipo: descripción"`.
4. **Push:** Enviar a la rama actual: `git push origin [branch]`.

## 4. Herramientas y Librerías
- **Git CLI**
- **GitHub Auth** (ya configurado en el sistema del usuario).

## 5. Restricciones y Casos Borde (Edge Cases)
- **Conflictos:** Si hay cambios remotos, realizar `git pull --rebase` antes del push.
- **Archivos Grandes:** No subir archivos pesados o binarios no necesarios.
- **Secretos:** NUNCA subir archivos `.env` o credenciales.

## 6. Protocolo de Errores y Aprendizajes (Memoria Viva)

| Fecha | Error Detectado | Causa Raíz | Solución/Parche Aplicado |
|-------|-----------------|------------|--------------------------|
| 11/02 | N/A | Inicialización | N/A |

## 8. Checklist de Pre-Ejecución
- [ ] Revisar cambios con `git status`.
- [ ] Verificar que no haya secretos expuestos.
- [ ] Build exitoso (npm run build).

## 9. Checklist Post-Ejecución
- [ ] Confirmar visualmente en GitHub (si es posible).
- [ ] Actualizar `task.md`.
