
-- Drop the overly permissive policy
DROP POLICY IF EXISTS "external_queries_insert_public" ON external_queries;

-- Recreate with a tighter check: require phone OTP verification
CREATE POLICY "external_queries_insert_public"
ON external_queries
FOR INSERT TO anon, authenticated
WITH CHECK (
  phone_otp_verified = true
);
