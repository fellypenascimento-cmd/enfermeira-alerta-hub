-- Add perfil_texto column to profiles table for custom profile names
ALTER TABLE public.profiles 
ADD COLUMN perfil_texto TEXT;