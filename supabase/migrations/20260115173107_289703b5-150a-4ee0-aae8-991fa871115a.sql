-- Fix INPUT_VALIDATION: Add server-side length constraints to chamados table
-- Using triggers instead of CHECK constraints for better compatibility

-- Create validation function for chamados
CREATE OR REPLACE FUNCTION public.validate_chamados_input()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  -- Validate descricao length (required, max 1000 chars)
  IF length(NEW.descricao) > 1000 THEN
    RAISE EXCEPTION 'Descrição deve ter no máximo 1000 caracteres';
  END IF;
  
  IF length(NEW.descricao) < 1 THEN
    RAISE EXCEPTION 'Descrição é obrigatória';
  END IF;
  
  -- Validate problema_texto length if provided (optional, max 1000 chars)
  IF NEW.problema_texto IS NOT NULL AND length(NEW.problema_texto) > 1000 THEN
    RAISE EXCEPTION 'Texto do problema deve ter no máximo 1000 caracteres';
  END IF;
  
  RETURN NEW;
END;
$$;

-- Create trigger for validation on INSERT and UPDATE
DROP TRIGGER IF EXISTS validate_chamados_input_trigger ON chamados;
CREATE TRIGGER validate_chamados_input_trigger
BEFORE INSERT OR UPDATE ON chamados
FOR EACH ROW
EXECUTE FUNCTION public.validate_chamados_input();

-- Fix MISSING_RLS: Add explicit DELETE policies to prevent deletion of audit trails

-- Policy to prevent deletion of chamados_historico (audit trail)
CREATE POLICY "Prevent deletion of audit trail"
ON chamados_historico
FOR DELETE
USING (false);

-- Policy to prevent deletion of chamados (tickets should never be deleted)
CREATE POLICY "Prevent deletion of chamados"
ON chamados
FOR DELETE
USING (false);

-- Policy to prevent deletion of estoque_movimentacoes (movement history)
CREATE POLICY "Prevent deletion of movement history"
ON estoque_movimentacoes
FOR DELETE
USING (false);