INSERT INTO public.user_roles (user_id, role)
VALUES ('c5993958-c7f3-466a-95fd-b9a353ae6dca', 'sellify_admin')
ON CONFLICT (user_id, role) DO NOTHING;
