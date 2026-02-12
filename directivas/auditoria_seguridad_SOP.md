# DIRECTIVA: AUDITORIA_SEGURIDAD_SOP

> **ID:** 2026-02-12
> **Script Asociado:** `scripts/verificar_aislamiento_datos.py`
> **Última Actualización:** 2026-02-12
> **Estado:** ACTIVO

---

## 1. Objetivos y Alcance
*Describe aquí QUÉ debe lograr esta tarea y POR QUÉ.*
- **Objetivo Principal:** Verificar que las políticas de Seguridad de Nivel de Fila (RLS) en Supabase estén correctamente configuradas para evitar que un usuario acceda a datos de otro.
- **Criterio de Éxito:** Todas las tablas con datos sensibles tienen RLS activo y las políticas restringen el acceso basándose en el ID del usuario autenticado (`auth.uid()`). No se detectan fugas de información en las pruebas automatizadas.

## 2. Especificaciones de Entrada/Salida (I/O)

### Entradas (Inputs)
- **Variables de Envorno (.env):**
  - `SUPABASE_URL`: URL del proyecto.
  - `SUPABASE_SERVICE_ROLE_KEY`: Para inspección administrativa.
  - `SUPABASE_ANON_KEY`: Para simular acceso de usuario.

### Salidas (Outputs)
- **Artefactos Generados:**
  - `C:\Users\Diego Menendez\OneDrive - Europartners\Desktop\Antigravity\AGENDA\.tmp\reporte_seguridad.json`: Resultados detallados de la auditoría.
- **Retorno de Consola:** Resumen de tablas vulnerables o confirmación de seguridad.

## 3. Flujo Lógico (Algoritmo)

1. **Inspección de Esquema:** Listar todas las tablas en el esquema `public`.
2. **Verificación de RLS:** Comprobar si RLS está habilitado para cada tabla.
3. **Análisis de Políticas:** Extraer y documentar las políticas SQL asociadas a cada tabla.
4. **Simulación de Ataque (Opcional/Script):** Intentar acceder a registros que no pertenecen al usuario actual usando una clave `anon` y verificando que el resultado sea vacío o denegado.
5. **Generación de Reporte:** Consolidar hallazgos y proponer parches SQL si es necesario.

## 4. Herramientas y Librerías
- **Librerías Python:** `supabase`, `python-dotenv`.
- **MCP Tools:** `mcp_supabase-mcp-server_execute_sql`, `mcp_supabase-mcp-server_get_advisors`.

## 5. Restricciones y Casos Borde (Edge Cases)
- **Tablas sin owner_id**: Algunas tablas pueden ser catálogos públicos. Estas deben identificarse como excepciones intencionales.
- **Vistas**: Las vistas heredan la seguridad de las tablas base, pero deben revisarse para asegurar que no expongan columnas sensibles innecesariamente.
- **Recursión en Profiles**: Al definir políticas en `profiles` que dependen de la organización del usuario (leída desde `profiles`), se genera un bucle infinito. **Solución:** Usar una función `SECURITY DEFINER` para leer el ID de la organización.

## 6. Protocolo de Errores y Aprendizajes (Memoria Viva)

| Fecha | Error Detectado | Causa Raíz | Solución/Parche Aplicado |
|-------|-----------------|------------|--------------------------|
| 12/02 | Recursión Infinita en RLS | Política de `profiles` consultaba `profiles` | Crear función `get_my_org_id()` como `SECURITY DEFINER` para romper el ciclo. |

## 7. Ejemplos de Uso

```bash
python scripts/verificar_aislamiento_datos.py
```

## 8. Checklist de Pre-Ejecución
- [ ] Variables de entorno configuradas en `.env`
- [ ] RLS habilitado en tablas críticas

## 9. Checklist Post-Ejecución
- [ ] Reporte generado en `.tmp/`
- [ ] RLS corregido en tablas vulnerables (si aplica)
