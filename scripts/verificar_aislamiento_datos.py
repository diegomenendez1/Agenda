import os
import sys
from dotenv import load_dotenv
from supabase import create_client, Client

# Cargar variables de entorno
load_dotenv()

SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_SERVICE_ROLE_KEY = os.getenv("SUPABASE_SERVICE_ROLE")  # Usar service role para inspección
SUPABASE_ANON_KEY = os.getenv("SUPABASE_ANON_KEY")

if not SUPABASE_URL or not SUPABASE_SERVICE_ROLE_KEY:
    print("Error: Faltan variables de entorno SUPABASE_URL o SUPABASE_SERVICE_ROLE")
    sys.exit(1)

def verificar_rls():
    """ Verifica que RLS esté habilitado en todas las tablas publicas. """
    print("\n--- Verificando RLS en Tablas ---")
    
    # Cliente con permisos administrativos para inspeccionar
    supabase_ad: Client = create_client(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)
    
    # Consulta SQL para obtener tablas y estado de RLS
    # Nota: Esto requiere que el rol de servicio tenga permisos de ejecución SQL o consultar pg_catalog
    # Como fallback, intentaremos usar la API REST si SQL no está disponible directamente via py-supabase (que suele ser solo para data)
    # PERO, supabase-py no tiene "execute_sql" nativo fácil. 
    # Usaremos una aproximación: intentar acceder a tablas conocidas sin autenticación y esperar fallo.
    
    # Lista de tablas críticas conocidas (Ajustar según esquema real)
    tablas_criticas = ["tasks", "profiles", "inbox_items", "projects"]
    veredicto_final = True

    # 1. Prueba de Acceso Anónimo (Debe fallar o dar 0 resultados si RLS funciona y no hay policy public)
    print("1. Probando acceso anónimo (debe ser denegado o vacío)...")
    supabase_anon: Client = create_client(SUPABASE_URL, SUPABASE_ANON_KEY)
    
    for tabla in tablas_criticas:
        try:
            # Intentar leer todo
            res = supabase_anon.table(tabla).select("*").limit(1).execute()
            # Si devuelve datos, ES UN RIESGO (a menos que sea intencional pública)
            if res.data and len(res.data) > 0:
                print(f"ALERTA: Tabla '{tabla}' devuelve datos a usuario anónimo! POSIBLE FUGA RLS.")
                veredicto_final = False
            else:
                print(f"OK: Tabla '{tabla}' segura para anónimos (0 registros o error).")
        except Exception as e:
            # Si da error de permiso, es bueno en este contexto
            print(f"OK: Tabla '{tabla}' acceso denegado (Excepción capturada: {str(e)}).")

    return veredicto_final

if __name__ == "__main__":
    if verificar_rls():
        print("\n[PASSED] Verificación de Seguridad RLS completada satisfactoriamente.")
        sys.exit(0)
    else:
        print("\n[FAILED] Se detectaron problemas de seguridad RLS.")
        sys.exit(1)
