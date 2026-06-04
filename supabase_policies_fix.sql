-- =====================================================
-- RUN THIS IN YOUR SUPABASE SQL EDITOR
-- This adds the missing policies for the onboarding flow.
-- =====================================================

-- Allow the trigger function to insert profiles for new users
CREATE POLICY "Allow trigger to insert profiles"
  ON profiles FOR INSERT
  WITH CHECK (true);

-- Allow admins to update any profile (needed to link clipper_id)
CREATE POLICY "Admins can update profiles"
  ON profiles FOR UPDATE
  USING (is_admin())
  WITH CHECK (is_admin());

-- Allow clippers to insert their own posts
-- (The existing INSERT policy uses WITH CHECK but let's make sure it works)
-- If you get a "policy already exists" error for any of these, that's fine — just skip it.
