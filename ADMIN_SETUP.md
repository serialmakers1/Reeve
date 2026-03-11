# Creating an Admin Account

1. Go to Supabase Dashboard → Authentication → Users → Add User
2. Enter the admin's email and a temporary password
3. Go to Supabase Dashboard → SQL Editor and run:

```sql
UPDATE users SET
  role = 'admin',
  onboarding_completed = true,
  full_name = 'Admin Name',
  updated_at = now()
WHERE email = 'admin@example.com';
```

4. The admin can now log in at /login using their email OTP
5. They will be redirected to /admin/owners after login
