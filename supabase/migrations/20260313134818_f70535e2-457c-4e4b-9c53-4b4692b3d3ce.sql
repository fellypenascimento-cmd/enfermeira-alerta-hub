ALTER TABLE public.profiles ADD COLUMN username text;
CREATE UNIQUE INDEX profiles_username_unique ON public.profiles (username) WHERE username IS NOT NULL;