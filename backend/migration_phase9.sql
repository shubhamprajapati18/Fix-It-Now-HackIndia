ALTER TABLE public.users 
ADD COLUMN IF NOT EXISTS district_code TEXT;

ALTER TABLE public.issues 
ADD COLUMN IF NOT EXISTS district_code TEXT;
