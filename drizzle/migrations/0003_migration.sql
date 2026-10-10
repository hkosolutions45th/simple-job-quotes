ALTER TABLE public.user_profiles
  ADD COLUMN IF NOT EXISTS business_email text,
  ADD COLUMN IF NOT EXISTS street_address text,
  ADD COLUMN IF NOT EXISTS city text,
  ADD COLUMN IF NOT EXISTS postal_code text,
  ADD COLUMN IF NOT EXISTS tax_rate numeric;

CREATE TABLE public.saved_clients (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  name text NOT NULL,
  email text NOT NULL DEFAULT '',
  phone text NOT NULL DEFAULT '',
  address text NOT NULL DEFAULT '',
  city text NOT NULL DEFAULT '',
  postal_code text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX saved_clients_user_idx ON public.saved_clients(user_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.saved_clients TO authenticated;
GRANT ALL ON public.saved_clients TO service_role;
ALTER TABLE public.saved_clients ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users read own clients" ON public.saved_clients FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users insert own clients" ON public.saved_clients FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users update own clients" ON public.saved_clients FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users delete own clients" ON public.saved_clients FOR DELETE TO authenticated USING (auth.uid() = user_id);