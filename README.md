# Clipper Tracker

An internal management dashboard for tracking and reviewing short-form content produced by video clippers.

## Features
- **Admin Dashboard**: Overview of daily progress, approve/reject workflow, progress tracking per clipper.
- **Clipper Dashboard**: Simple bulk submission of TikTok/Instagram links with style tagging.
- **Light Theme**: Clean, professional aesthetic using SF Pro (with fallbacks) and a modern blue accent.

## Setup Instructions

### 1. Supabase Backend Setup
1. Create a new project in [Supabase](https://supabase.com).
2. Go to the **SQL Editor** in your Supabase dashboard.
3. Open the `supabase_setup.sql` file provided in this repository and run the entire script. This will create all tables, enums, RLS policies, and seed data.
4. Next, go to **Authentication -> Users** and create two users (one for testing Admin, one for testing Clipper).
5. Open the `profiles` table in the Table Editor, and manually set the `role` for your Admin user to `admin`.
6. (Optional) Create a `clippers` row and `accounts` rows in your database for your test Clipper user, and link the `profiles.clipper_id` to that new clipper row.

### 2. Frontend Setup
1. Rename `.env.example` to `.env.local`.
2. Find your **Project URL** and **anon public key** in your Supabase project settings (Settings -> API).
3. Paste them into `.env.local`:
   ```
   VITE_SUPABASE_URL=your_project_url
   VITE_SUPABASE_ANON_KEY=your_anon_key
   ```
4. Install dependencies:
   ```bash
   npm install
   ```
5. Run the development server:
   ```bash
   npm run dev
   ```

### 3. Usage
- Go to `http://localhost:5173`.
- Log in with the Admin credentials to view the Admin Dashboard.
- Log in with the Clipper credentials to view the Clipper Dashboard.
