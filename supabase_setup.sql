-- Clipper Tracker Supabase Database Setup

-- Enable uuid-ossp extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. Enums
CREATE TYPE user_role AS ENUM ('admin', 'clipper');
CREATE TYPE platform_type AS ENUM ('tiktok', 'instagram');
CREATE TYPE post_status AS ENUM ('pending', 'approved', 'rejected');

-- 2. Tables
CREATE TABLE clippers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    active BOOLEAN DEFAULT true
);

CREATE TABLE profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    role user_role NOT NULL DEFAULT 'clipper',
    clipper_id UUID REFERENCES clippers(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE accounts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    clipper_id UUID REFERENCES clippers(id) ON DELETE CASCADE,
    platform platform_type NOT NULL,
    account_label TEXT NOT NULL,
    account_url TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE styles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE global_settings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    daily_quota_per_account INTEGER NOT NULL DEFAULT 10,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE posts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    clipper_id UUID REFERENCES clippers(id) ON DELETE CASCADE,
    account_id UUID REFERENCES accounts(id) ON DELETE CASCADE,
    style_id UUID REFERENCES styles(id) ON DELETE RESTRICT,
    post_url TEXT NOT NULL,
    post_date DATE NOT NULL DEFAULT CURRENT_DATE,
    status post_status NOT NULL DEFAULT 'pending',
    review_note TEXT,
    reviewed_by TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. Row Level Security
ALTER TABLE clippers ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE styles ENABLE ROW LEVEL SECURITY;
ALTER TABLE global_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE posts ENABLE ROW LEVEL SECURITY;

-- Helper to check if current user is admin
CREATE OR REPLACE FUNCTION is_admin() RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'
  );
$$ LANGUAGE sql SECURITY DEFINER;

-- Profiles Policies
CREATE POLICY "Users can view own profile" ON profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Admins can view all profiles" ON profiles FOR SELECT USING (is_admin());
CREATE POLICY "Admins can manage profiles" ON profiles FOR ALL USING (is_admin());

-- Clippers Policies
CREATE POLICY "Clippers can view own clipper record" ON clippers FOR SELECT USING (
  id IN (SELECT clipper_id FROM profiles WHERE id = auth.uid())
);
CREATE POLICY "Admins can view all clippers" ON clippers FOR SELECT USING (is_admin());
CREATE POLICY "Admins can manage clippers" ON clippers FOR ALL USING (is_admin());

-- Accounts Policies
CREATE POLICY "Clippers can view own accounts" ON accounts FOR SELECT USING (
  clipper_id IN (SELECT clipper_id FROM profiles WHERE id = auth.uid())
);
CREATE POLICY "Admins can view all accounts" ON accounts FOR SELECT USING (is_admin());
CREATE POLICY "Admins can manage accounts" ON accounts FOR ALL USING (is_admin());

-- Styles & Settings Policies
CREATE POLICY "Everyone can read styles" ON styles FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Admins can manage styles" ON styles FOR ALL USING (is_admin());

CREATE POLICY "Everyone can read settings" ON global_settings FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Admins can manage settings" ON global_settings FOR ALL USING (is_admin());

-- Posts Policies
CREATE POLICY "Clippers can view own posts" ON posts FOR SELECT USING (
  clipper_id IN (SELECT clipper_id FROM profiles WHERE id = auth.uid())
);
CREATE POLICY "Clippers can insert own posts" ON posts FOR INSERT WITH CHECK (
  clipper_id IN (SELECT clipper_id FROM profiles WHERE id = auth.uid())
);
CREATE POLICY "Admins can view all posts" ON posts FOR SELECT USING (is_admin());
CREATE POLICY "Admins can manage posts" ON posts FOR ALL USING (is_admin());

-- 4. Set up Trigger for automatic Profile creation on signup (Optional, but good for manual insert)
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (id, role)
  VALUES (new.id, 'clipper');
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();


-- 5. Seed Data
INSERT INTO styles (name, active) VALUES ('Style A', true), ('Style B', true);
INSERT INTO global_settings (daily_quota_per_account) VALUES (10);

-- Example Clippers & Accounts (Commented out because UUIDs need to be linked to auth.users for real usage)
/*
WITH new_clipper1 AS (
    INSERT INTO clippers (name) VALUES ('Alex Smith') RETURNING id
)
INSERT INTO accounts (clipper_id, platform, account_label, account_url)
SELECT id, 'tiktok', 'TikTok Main', 'https://tiktok.com/@alexmain' FROM new_clipper1 UNION ALL
SELECT id, 'tiktok', 'TikTok Alt', 'https://tiktok.com/@alexalt' FROM new_clipper1 UNION ALL
SELECT id, 'instagram', 'Insta Main', 'https://instagram.com/alexmain' FROM new_clipper1;

WITH new_clipper2 AS (
    INSERT INTO clippers (name) VALUES ('Sarah Jenkins') RETURNING id
)
INSERT INTO accounts (clipper_id, platform, account_label, account_url)
SELECT id, 'tiktok', 'TikTok Main', 'https://tiktok.com/@sarahmain' FROM new_clipper2 UNION ALL
SELECT id, 'tiktok', 'TikTok Alt', 'https://tiktok.com/@sarahalt' FROM new_clipper2 UNION ALL
SELECT id, 'instagram', 'Insta Main', 'https://instagram.com/sarahmain' FROM new_clipper2;
*/
