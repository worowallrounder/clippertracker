-- ====================================================================
-- RUN THIS IN YOUR SUPABASE SQL EDITOR
-- This cleans up test data (leaving admin accounts safe) and sets up the
-- trigger so clippers are automatically created and can link their accounts.
-- ====================================================================

-- 1. Clean up test data (ONLY clippers, accounts, and posts. Admin profiles are NOT deleted)
TRUNCATE public.posts, public.accounts, public.clippers CASCADE;

-- 2. Modify the signup trigger to automatically create a Clipper record
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
DECLARE
  new_clipper_id UUID;
  clipper_name TEXT;
BEGIN
  -- Determine default display name from email
  clipper_name := split_part(new.email, '@', 1);
  IF clipper_name IS NULL OR clipper_name = '' THEN
    clipper_name := 'New Clipper';
  END IF;

  -- Create a clipper record for the new user
  INSERT INTO public.clippers (name)
  VALUES (clipper_name)
  RETURNING id INTO new_clipper_id;

  -- Create the user profile linked to the clipper
  INSERT INTO public.profiles (id, role, clipper_id)
  VALUES (new.id, 'clipper', new_clipper_id);

  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. Backfill any existing clipper profiles that don't have a clipper record
DO $$
DECLARE
  prof RECORD;
  new_clip_id UUID;
  clip_name TEXT;
BEGIN
  FOR prof IN 
    SELECT p.id, u.email 
    FROM public.profiles p 
    JOIN auth.users u ON p.id = u.id 
    WHERE p.role = 'clipper' AND p.clipper_id IS NULL
  LOOP
    clip_name := split_part(prof.email, '@', 1);
    IF clip_name IS NULL OR clip_name = '' THEN
      clip_name := 'New Clipper';
    END IF;
    
    INSERT INTO public.clippers (name)
    VALUES (clip_name)
    RETURNING id INTO new_clip_id;

    UPDATE public.profiles
    SET clipper_id = new_clip_id
    WHERE id = prof.id;
  END LOOP;
END $$;

-- 4. Update RLS policies to allow Clippers to update their name and insert accounts
DROP POLICY IF EXISTS "Clippers can update own clipper record" ON public.clippers;
CREATE POLICY "Clippers can update own clipper record" ON public.clippers 
  FOR UPDATE 
  USING (id IN (SELECT clipper_id FROM public.profiles WHERE id = auth.uid()))
  WITH CHECK (id IN (SELECT clipper_id FROM public.profiles WHERE id = auth.uid()));

DROP POLICY IF EXISTS "Clippers can insert own accounts" ON public.accounts;
CREATE POLICY "Clippers can insert own accounts" ON public.accounts 
  FOR INSERT 
  WITH CHECK (clipper_id IN (SELECT clipper_id FROM public.profiles WHERE id = auth.uid()));
