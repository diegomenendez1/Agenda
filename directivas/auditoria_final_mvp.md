# DIRECTIVA: AUDITORIA_FINAL_MVP

> **ID:** 2026-02-13-AUDIT-FINAL
> **Script Asociado:** `scripts/auditoria_maestra.py`
> **Última Actualización:** 2026-02-13
> **Estado:** ACTIVO

---

## 1. Objetivos y Alcance
- **Objetivo Principal:** Realizar una revisión automática e integral de la aplicación (Frontend, Backend, Seguridad) antes del despliegue a producción/MVP.
- **Criterio de Éxito:** Generar un reporte consolidado en `.tmp/reporte_auditoria_final.md` que indique claramente PASÓ/FALLÓ para cada categoría, sin errores críticos pendientes.

## 2. Especificaciones de Entrada/Salida (I/O)
### Entradas
- Código fuente actual en `src/`.
- Configuración de Supabase en `.env`.

### Salidas
- `scripts/auditoria_maestra.py`: Script orquestador.
- `.tmp/reporte_auditoria_final.json`: Datos crudos de los tests.
- `.tmp/reporte_auditoria_final.md`: Reporte legible para humanos y el Agente.

## 3. Flujo Lógico (Algoritmo de Auditoría)

1.  **Análisis Estático (Linting):** Ejecutar `npm run lint`. Cualquier warning es aceptable, cualquier error bloqueante es un FALLO.
2.  **Verificación de Tipos (Build):** Ejecutar `npm run build`. Si falla, la app no compila -> FALLO CRÍTICO.
3.  **Pruebas Unitarias:** Ejecutar `npm run test` (Vitest). Todos los tests deben pasar.
4.  **Auditoría de Seguridad:** Invocar el módulo `verificar_aislamiento_datos.py`.
    - Verificar RLS en todas las tablas sensibles.
    - Verificar políticas de almacenamiento (Storage) si aplica.
5.  **Smoke Test (UX Automatizada):**
    - Usar Playwright para levantar la app.
    - Verificar renderizado de Home.
    - Verificar navegación básica.
6.  **Generación de Reporte:** Consolidar todos los resultados en un archivo Markdown final.

## 4. Herramientas y Librerías
- **Python:** `subprocess` (para comandos npm), `json`, `os`.
- **Node:** `npm`, `vitest`, `playwright`.

## 5. Restricciones y Casos Borde
- **Tiempo de Ejecución:** Si el build tarda más de 5 minutos, abortar.
- **Entorno Limpio:** Asegurar que no haya procesos de Vite/Node huerfanos bloqueando puertos antes del test de Playwright.

## 6. Protocolo de Errores y Aprendizajes (Memoria Viva)

| Fecha | Error Detectado | Causa Raíz | Solución/Parche Aplicado |
|-------|-----------------|------------|--------------------------|
|       |                 |            |                          |

## 7. Checklist Pre-Ejecución
- [ ] `.env` configurado correctamente.
- [ ] Dependencias instaladas (`npm install`).

## 8. Checklist Post-Ejecución
- [ ] Revisar `.tmp/reporte_auditoria_final.md`
- [ ] Corregir cualquier error marcado como CRÍTICO.
