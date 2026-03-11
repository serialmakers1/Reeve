-- Grant necessary privileges on properties table to authenticated role
GRANT SELECT, INSERT, UPDATE ON TABLE public.properties TO authenticated;

-- Anon only needs SELECT for public listed properties
GRANT SELECT ON TABLE public.properties TO anon;