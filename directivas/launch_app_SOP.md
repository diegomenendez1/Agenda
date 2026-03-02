# Lanzamiento de la Aplicación (SOP)

## Objetivo
Iniciar el entorno de desarrollo de la aplicación de forma segura y consistente.

## Entradas
- Dependencias de Node instaladas (node_modules).
- Archivo de configuración `.env` presente.

## Lógica de Ejecución
1. Verificar la existencia de `node_modules`. Si no existe, ejecutar `npm install`.
2. Validar que el archivo `.env` no esté vacío.
3. Ejecutar el comando de desarrollo definido en `package.json` (`npm run dev`).

## Restricciones / Casos Borde
- **Puerto Ocupado:** Si el puerto (ej. 5173) está ocupado, Vite suele asignar uno nuevo automáticamente. No se requiere intervención a menos que falle el inicio.
- **Errores de Compilación:** Si hay errores de TypeScript o Lint, el servidor podría iniciarse pero mostrar errores. El desarrollador (tú) debe corregirlos si impiden el funcionamiento.
- **Entorno Windows:** Usar comandos compatibles con PowerShell. Si falla por políticas de ejecución, usar `npm.cmd` en lugar de `npm`.
- **Error de Seguridad (PSSecurityException):** Si aparece un error indicando que `npm.ps1` no se puede cargar, ejecutar el comando anteponiendo `cmd.exe /c` o usando la extensión `.cmd` explícitamente (ej: `npm.cmd run dev`).
- **Python no encontrado:** Si `python` o `py` no están en el PATH, ejecutar directamente `cmd /c npm run dev`. No intentar usar el script de Python si el comando falla inicialmente.

## Historial de Aprendizaje
| Fecha | Error Detectado | Causa Raíz | Solución/Parche Aplicado |
|-------|-----------------|------------|--------------------------|
| 27/02 | `python` not recognized | Python no está en el PATH del sistema o no está instalado. | Usar `cmd /c npm run dev` directamente. |
