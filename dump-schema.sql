-- ============================================================================
-- Schema Dump Script for TripThreads Production Database
-- ============================================================================
-- INSTRUCTIONS:
-- Run each section separately in Supabase Dashboard > SQL Editor
-- Copy each output and combine them in order into:
-- supabase/migrations/20251201000000_baseline_schema.sql
-- ============================================================================

-- ============================================================================
-- SECTION 1: Extensions
-- ============================================================================
SELECT 'CREATE EXTENSION IF NOT EXISTS "' || extname || '" WITH SCHEMA ' ||
       COALESCE('"' || nspname || '"', 'public') || ';' AS "-- Extensions"
FROM pg_extension e
LEFT JOIN pg_namespace n ON e.extnamespace = n.oid
WHERE extname IN ('uuid-ossp', 'pg_net', 'pg_stat_statements', 'pgcrypto')
ORDER BY extname;

-- ============================================================================
-- SECTION 2: Tables
-- ============================================================================
SELECT
  'CREATE TABLE IF NOT EXISTS public.' || c.table_name || ' (' || E'\n' ||
  string_agg(
    '    ' || c.column_name || ' ' ||
    CASE
      WHEN c.data_type = 'USER-DEFINED' THEN c.udt_name
      WHEN c.data_type = 'ARRAY' THEN REPLACE(c.udt_name, '_', '') || '[]'
      WHEN c.data_type = 'character varying' THEN
        CASE WHEN c.character_maximum_length IS NOT NULL
          THEN 'varchar(' || c.character_maximum_length || ')'
          ELSE 'varchar'
        END
      WHEN c.data_type = 'character' THEN
        CASE WHEN c.character_maximum_length IS NOT NULL
          THEN 'char(' || c.character_maximum_length || ')'
          ELSE 'char'
        END
      WHEN c.data_type = 'numeric' THEN
        CASE WHEN c.numeric_precision IS NOT NULL AND c.numeric_scale IS NOT NULL
          THEN 'numeric(' || c.numeric_precision || ',' || c.numeric_scale || ')'
          ELSE 'numeric'
        END
      ELSE c.data_type
    END ||
    CASE WHEN c.is_nullable = 'NO' THEN ' NOT NULL' ELSE '' END ||
    CASE
      WHEN c.column_default IS NOT NULL THEN ' DEFAULT ' || c.column_default
      ELSE ''
    END,
    ',' || E'\n'
    ORDER BY c.ordinal_position
  ) || E'\n' || ');' AS "-- Tables"
FROM information_schema.columns c
WHERE c.table_schema = 'public'
  AND c.table_name IN (
    SELECT tablename FROM pg_tables WHERE schemaname = 'public'
  )
GROUP BY c.table_name
ORDER BY
  CASE c.table_name
    WHEN 'profiles' THEN 1
    WHEN 'trips' THEN 2
    WHEN 'trip_participants' THEN 3
    WHEN 'trip_invites' THEN 4
    WHEN 'access_requests' THEN 5
    WHEN 'itinerary_items' THEN 6
    WHEN 'expenses' THEN 7
    WHEN 'expense_participants' THEN 8
    WHEN 'settlements' THEN 9
    WHEN 'fx_rates' THEN 10
    WHEN 'chat_messages' THEN 11
    WHEN 'message_reactions' THEN 12
    WHEN 'notification_logs' THEN 13
    ELSE 99
  END,
  c.table_name;

-- ============================================================================
-- SECTION 3: Primary Keys
-- ============================================================================
SELECT
  'ALTER TABLE ONLY public.' || tc.table_name ||
  ' ADD CONSTRAINT ' || tc.constraint_name ||
  ' PRIMARY KEY (' || string_agg(kcu.column_name, ', ' ORDER BY kcu.ordinal_position) || ');' AS "-- Primary Keys"
FROM information_schema.table_constraints tc
JOIN information_schema.key_column_usage kcu
  ON tc.constraint_name = kcu.constraint_name
  AND tc.table_schema = kcu.table_schema
WHERE tc.constraint_type = 'PRIMARY KEY'
  AND tc.table_schema = 'public'
GROUP BY tc.table_name, tc.constraint_name
ORDER BY tc.table_name;

-- ============================================================================
-- SECTION 4: Foreign Keys
-- ============================================================================
SELECT
  'ALTER TABLE ONLY public.' || tc.table_name ||
  ' ADD CONSTRAINT ' || tc.constraint_name ||
  ' FOREIGN KEY (' || kcu.column_name || ')' ||
  ' REFERENCES public.' || ccu.table_name || '(' || ccu.column_name || ')' ||
  CASE rc.delete_rule
    WHEN 'CASCADE' THEN ' ON DELETE CASCADE'
    WHEN 'SET NULL' THEN ' ON DELETE SET NULL'
    WHEN 'SET DEFAULT' THEN ' ON DELETE SET DEFAULT'
    WHEN 'RESTRICT' THEN ' ON DELETE RESTRICT'
    ELSE ''
  END || ';' AS "-- Foreign Keys"
FROM information_schema.table_constraints tc
JOIN information_schema.key_column_usage kcu
  ON tc.constraint_name = kcu.constraint_name
  AND tc.table_schema = kcu.table_schema
JOIN information_schema.constraint_column_usage ccu
  ON ccu.constraint_name = tc.constraint_name
  AND ccu.table_schema = tc.table_schema
JOIN information_schema.referential_constraints rc
  ON tc.constraint_name = rc.constraint_name
  AND tc.table_schema = rc.constraint_schema
WHERE tc.constraint_type = 'FOREIGN KEY'
  AND tc.table_schema = 'public'
ORDER BY tc.table_name, tc.constraint_name;

-- ============================================================================
-- SECTION 5: Indexes
-- ============================================================================
SELECT indexdef || ';' AS "-- Indexes"
FROM pg_indexes
WHERE schemaname = 'public'
  AND indexname NOT LIKE '%_pkey'
ORDER BY tablename, indexname;

-- ============================================================================
-- SECTION 6: Functions
-- ============================================================================
SELECT pg_get_functiondef(p.oid) || ';' AS "-- Functions"
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE n.nspname = 'public'
ORDER BY p.proname;

-- ============================================================================
-- SECTION 7: Triggers
-- ============================================================================
SELECT pg_get_triggerdef(t.oid) || ';' AS "-- Triggers"
FROM pg_trigger t
JOIN pg_class c ON t.tgrelid = c.oid
JOIN pg_namespace n ON c.relnamespace = n.oid
WHERE n.nspname = 'public'
  AND NOT t.tgisinternal
ORDER BY c.relname, t.tgname;

-- ============================================================================
-- SECTION 8: RLS Enable
-- ============================================================================
SELECT 'ALTER TABLE public.' || tablename || ' ENABLE ROW LEVEL SECURITY;' AS "-- RLS Enable"
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY tablename;

-- ============================================================================
-- SECTION 9: RLS Policies
-- ============================================================================
SELECT
  'CREATE POLICY ' || pol.polname ||
  ' ON public.' || c.relname ||
  CASE pol.polcmd
    WHEN 'r' THEN ' FOR SELECT'
    WHEN 'a' THEN ' FOR INSERT'
    WHEN 'w' THEN ' FOR UPDATE'
    WHEN 'd' THEN ' FOR DELETE'
    WHEN '*' THEN ' FOR ALL'
    ELSE ''
  END ||
  ' TO ' || COALESCE(
    (SELECT string_agg(pg_catalog.quote_ident(rolname), ', ')
     FROM pg_roles
     WHERE oid = ANY(pol.polroles)),
    'public'
  ) ||
  CASE WHEN pol.polpermissive THEN ' USING (' ELSE ' WITH CHECK (' END ||
  pg_get_expr(pol.polqual, pol.polrelid) || ');' AS "-- RLS Policies"
FROM pg_policy pol
JOIN pg_class c ON pol.polrelid = c.oid
JOIN pg_namespace n ON c.relnamespace = n.oid
WHERE n.nspname = 'public'
ORDER BY c.relname, pol.polname;

-- ============================================================================
-- SECTION 10: Table Comments
-- ============================================================================
SELECT
  'COMMENT ON TABLE public.' || c.relname ||
  ' IS ' || quote_literal(d.description) || ';' AS "-- Table Comments"
FROM pg_class c
JOIN pg_namespace n ON c.relnamespace = n.oid
JOIN pg_description d ON c.oid = d.objoid AND d.objsubid = 0
WHERE n.nspname = 'public'
  AND c.relkind = 'r'
ORDER BY c.relname;

-- ============================================================================
-- SECTION 11: Column Comments
-- ============================================================================
SELECT
  'COMMENT ON COLUMN public.' || c.relname || '.' || a.attname ||
  ' IS ' || quote_literal(d.description) || ';' AS "-- Column Comments"
FROM pg_class c
JOIN pg_namespace n ON c.relnamespace = n.oid
JOIN pg_attribute a ON c.oid = a.attrelid
JOIN pg_description d ON c.oid = d.objoid AND a.attnum = d.objsubid
WHERE n.nspname = 'public'
  AND c.relkind = 'r'
  AND a.attnum > 0
  AND NOT a.attisdropped
ORDER BY c.relname, a.attnum;

-- ============================================================================
-- END
-- ============================================================================
-- After running all sections above, combine the outputs in this order:
-- 1. Add migration header (see plan file)
-- 2. Extensions
-- 3. Tables
-- 4. Primary Keys
-- 5. Foreign Keys
-- 6. Indexes
-- 7. Functions
-- 8. Triggers
-- 9. RLS Enable
-- 10. RLS Policies
-- 11. Table Comments (if any)
-- 12. Column Comments (if any)
-- ============================================================================
