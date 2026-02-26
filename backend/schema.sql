-- 1. Municipalities Table
CREATE TABLE IF NOT EXISTS public.municipalities (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    ward_code TEXT UNIQUE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Toggle RLS
ALTER TABLE public.municipalities ENABLE ROW LEVEL SECURITY;
-- Allow read access to everyone
CREATE POLICY "Allow public read access on municipalities" ON public.municipalities FOR SELECT USING (true);

-- 2. Users Table (Extends the built-in auth.users)
CREATE TABLE IF NOT EXISTS public.users (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    role TEXT NOT NULL CHECK (role IN ('citizen', 'municipal_admin', 'master_admin')) DEFAULT 'citizen',
    full_name TEXT NOT NULL,
    phone_number TEXT,
    aadhar_status TEXT DEFAULT 'pending' CHECK (aadhar_status IN ('pending', 'verified', 'rejected')),
    municipality_id UUID REFERENCES public.municipalities(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Toggle RLS
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
-- Users can read their own profile
CREATE POLICY "Users can read own profile" ON public.users FOR SELECT USING (auth.uid() = id);
-- Master Admins can read all profiles (Requires a database function or Service Role to bypass, using simple policy here)
CREATE POLICY "Admins can read all profiles" ON public.users FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role IN ('master_admin', 'municipal_admin'))
);

-- 3. Issues Table
CREATE TABLE IF NOT EXISTS public.issues (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    description TEXT NOT NULL,
    location_lat DOUBLE PRECISION,
    location_lng DOUBLE PRECISION,
    address TEXT,
    image_url TEXT,
    status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'in_progress', 'resolved', 'rejected')),
    priority TEXT NOT NULL DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'critical')),
    reporter_id UUID NOT NULL REFERENCES public.users(id),
    assigned_municipality_id UUID REFERENCES public.municipalities(id),
    ai_category TEXT,
    ai_confidence DOUBLE PRECISION,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Toggle RLS
ALTER TABLE public.issues ENABLE ROW LEVEL SECURITY;
-- Anyone can see issues (public transparency)
CREATE POLICY "Allow public read access on issues" ON public.issues FOR SELECT USING (true);
-- Authenticated users can create issues
CREATE POLICY "Authenticated users can insert issues" ON public.issues FOR INSERT WITH CHECK (auth.uid() = reporter_id);
