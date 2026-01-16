-- check_rpc.sql
SELECT pg_get_functiondef('public.invite_user_direct'::regproc);
