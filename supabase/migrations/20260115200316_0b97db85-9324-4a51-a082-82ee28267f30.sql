-- Fix RLS policy on profiles table: Replace RESTRICTIVE policies with a single PERMISSIVE policy
-- This ensures proper data isolation: users can only see their own profile, admins can see all

-- 1. Drop existing RESTRICTIVE SELECT policies
DROP POLICY IF EXISTS "Admins podem ver todos os perfis" ON profiles;
DROP POLICY IF EXISTS "Usuários podem ver seu próprio perfil" ON profiles;

-- 2. Create a single PERMISSIVE SELECT policy for authenticated users
-- Allows access if: user is viewing their own profile OR user is an admin
CREATE POLICY "Usuarios podem ver perfil proprio ou admins veem todos"
ON profiles
FOR SELECT
TO authenticated
USING (
  auth.uid() = id 
  OR has_role(auth.uid(), 'admin'::app_role)
);