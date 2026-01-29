@echo off
echo ===================================================
echo   CONFIGURANDO SISTEMA DE EMAILS (AGENDA APP)
echo ===================================================
echo.
echo 1. Configurando clave de Resend en Supabase...
call npx supabase secrets set RESEND_API_KEY=re_BKU6Pjk1_L4aU72V7WVKcCjJmc2WP5kKd --project-ref dovmyyrnhudfwvrlrzmw
if %ERRORLEVEL% NEQ 0 (
    echo.
    echo [ERROR] No se pudo configurar el secreto. Es probable que necesites hacer login.
    echo Ejecuta: npx supabase login
    pause
    exit /b %ERRORLEVEL%
)

echo.
echo 2. Desplegando funcion 'send-email'...
call npx supabase functions deploy send-email --project-ref dovmyyrnhudfwvrlrzmw --no-verify-jwt
if %ERRORLEVEL% NEQ 0 (
    echo.
    echo [ERROR] Fallo el despliegue.
    pause
    exit /b %ERRORLEVEL%
)

echo.
echo ===================================================
echo   ECO: DESPLIEGUE EXITOSO
echo   Ahora las tareas enviaran emails automaticamente.
echo ===================================================
pause
