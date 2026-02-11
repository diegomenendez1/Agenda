# DIRECTIVA: ENVIRONMENT_INITIALIZATION_SOP

> **ID:** 2026-02-11
> **Script Asociado:** `npm install` (Ejecución directa via shell)
> **Última Actualización:** 2026-02-11
> **Estado:** ACTIVO

---

## 1. Objetivos y Alcance
- **Objetivo Principal:** Configurar el entorno de desarrollo local instalando todas las dependencias necesarias para el proyecto AGENDA.
- **Criterio de éxito:** Todas las dependencias listadas en `package.json` están instaladas correctamente y el proyecto puede compilarse (o el comando de instalación termina sin errores).

## 2. Especificaciones de Entrada/Salida (I/O)

### Entradas (Inputs)
- **Archivos Fuente:**
  - `package.json`: Archivo con la lista de dependencias de Node.js.
  - `package-lock.json`: Archivo con versiones exactas de las dependencias.

### Salidas (Outputs)
- **Artefactos Generados:**
  - `node_modules/`: Carpeta con las dependencias instaladas.
- **Retorno de Consola:** Mensaje de éxito de `npm install`.

## 3. Flujo Lógico (Algoritmo)

1. **Validación de Archivos:** Verificar la existencia de `package.json`.
2. **Ejecución de Instalación:** Ejecutar `npm install` para instalar las dependencias de Node.js.
3. **Verificación:** Confirmar que no hubo errores durante la instalación.

## 4. Herramientas y Librerías
- **Node.js**: Entorno de ejecución.
- **npm**: Gestor de paquetes.

## 5. Restricciones y Casos Borde (Edge Cases)
- **Versión de Node.js:** Si la versión de Node.js no es compatible, la instalación podría fallar.
- **Acceso a Red:** Se requiere conexión a internet para descargar paquetes.
- **Permisos:** Se requieren permisos de escritura en el directorio del proyecto.

## 6. Protocolo de Errores y Aprendizajes (Memoria Viva)

| Fecha | Error Detectado | Causa Raíz | Solución/Parche Aplicado |
|-------|-----------------|------------|--------------------------|
| 2026-02-11 | UnauthorizedAccess (npm.ps1) | PowerShell execution policies disabled on the system. | Usar `cmd /c npm install` en su lugar. |

## 7. Ejemplos de Uso

```bash
# Instalación de dependencias
npm install
```

## 8. Checklist de Pre-Ejecución
- [x] Existe `package.json`
- [ ] Conexión a internet verificada

## 9. Checklist Post-Ejecución
- [ ] Carpeta `node_modules` existe
- [ ] Ningún error reportado por npm
