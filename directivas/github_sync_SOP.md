# Sincronización con GitHub (SOP)

## Objetivo
Mantener el repositorio remoto actualizado con cambios críticos de forma automática y determinista.

## Entradas
- Mensaje de commit descriptivo.
- Archivos modificados o nuevos.

## Lógica de Ejecución
1. Verificar el estado del repositorio local (`git status`).
2. Añadir los cambios al área de preparación (`git add .`).
3. Realizar un commit con el mensaje proporcionado (`git commit -m "[Mensaje]"`).
4. Empujar los cambios a la rama principal (`git push origin main`).

## Restricciones / Casos Borde
- **Error de Conexión:** Si el `push` falla por red, reintentar una vez y, si persiste, notificar al usuario.
- **Conflictos:** No intentar resolver conflictos automáticamente. Si hay un conflicto al hacer `pull` o `push`, detener la ejecución y pedir intervención manual.
- **Token/Credenciales:** Se asume que el entorno tiene acceso configurado (SSH o credenciales cacheadas). Si falla por autenticación, no reintentar.
- **Cambios Críticos:** Se consideran cambios críticos los siguientes:
    - Finalización de una tarea en `task.md`.
    - Creación de una nueva funcionalidad principal.
    - Corrección de bugs críticos tras validación.
    - Actualización importante de directivas.

## Instrucciones para el Script
- El script debe usar `subprocess` para ejecutar los comandos de git.
- Debe capturar errores y registrarlos en la directiva si es un error nuevo o recurrente.
