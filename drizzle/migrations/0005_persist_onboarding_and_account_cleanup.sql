ALTER TABLE public.user_profiles ADD COLUMN IF NOT EXISTS has_completed_onboarding boolean NOT NULL DEFAULT false;
GRANT SELECT, INSERT, UPDATE ON public.user_profiles TO authenticated;
GRANT ALL ON public.user_profiles TO service_role;
CREATE OR REPLACE FUNCTION public.delete_account_data(target_user_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  DELETE FROM public.quotes WHERE user_id = target_user_id;
  DELETE FROM public.saved_clients WHERE user_id = target_user_id;
  DELETE FROM public.user_profiles WHERE user_id = target_user_id;
END;
$$;
REVOKE ALL ON FUNCTION public.delete_account_data(uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.delete_account_data(uuid) TO service_role;