ALTER TABLE public.user_profiles ADD COLUMN IF NOT EXISTS default_currency text NOT NULL DEFAULT 'USD';
ALTER TABLE public.quotes ADD COLUMN IF NOT EXISTS currency text NOT NULL DEFAULT 'USD';