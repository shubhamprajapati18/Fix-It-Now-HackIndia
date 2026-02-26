ALTER TABLE public.issues 
ADD COLUMN IF NOT EXISTS reporter_name TEXT,
ADD COLUMN IF NOT EXISTS reporter_phone TEXT,
ADD COLUMN IF NOT EXISTS reporter_aadhar TEXT;
