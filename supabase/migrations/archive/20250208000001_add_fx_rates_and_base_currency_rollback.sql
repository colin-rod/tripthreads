-- ============================================================================
-- Rollback Migration: Remove FX rates table and base currency from trips
-- Description: Reverts the fx_rates table and base_currency column changes
-- Author: Claude Code
-- Date: 2025-02-08
-- Related: CRO-809 [EPIC] E7 - Shared Ledger & FX
-- ============================================================================

-- Drop fx_rates table (CASCADE drops all dependent objects)
DROP TABLE IF EXISTS public.fx_rates CASCADE;

-- Remove base_currency column from trips table
ALTER TABLE public.trips DROP COLUMN IF EXISTS base_currency;

-- ============================================================================
