CREATE TABLE IF NOT EXISTS public.revenue_targets (
    year INT PRIMARY KEY,
    target NUMERIC NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Turn on row level security
ALTER TABLE public.revenue_targets ENABLE ROW LEVEL SECURITY;

-- Allow authenticated users (like admins) to interact with it
CREATE POLICY "Allow authenticated full access to revenue_targets" 
ON public.revenue_targets 
FOR ALL 
TO authenticated 
USING (true) 
WITH CHECK (true);
