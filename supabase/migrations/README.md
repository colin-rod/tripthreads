# Database Migrations

## Current Status

- **Active Migrations:** All new migrations created after Dec 1, 2025
- **Archived:** `archive/` (All Phase 1-2 migrations including baseline schema)
- **Production Schema:** Built from original migrations (pre-baseline)

**Note:** The baseline schema (`20251201000000_baseline_schema.sql`) has been archived because production was built with the original migrations. New migrations apply incrementally to the existing production schema.

## Migration Workflow

### Creating New Migrations

**1. Create migration file:**

```bash
TIMESTAMP=$(date -u +"%Y%m%d%H%M%S")
touch supabase/migrations/${TIMESTAMP}_add_feature.sql
# Example: 20251205120000_add_trip_templates.sql
```

**2. Write migration SQL:**

```sql
-- ============================================================================
-- Migration: Add trip templates
-- Date: 2025-12-05
-- ============================================================================

CREATE TABLE public.trip_templates (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  -- ...
);

ALTER TABLE public.trip_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can see public templates"
  ON public.trip_templates FOR SELECT
  TO authenticated
  USING (true);

COMMENT ON TABLE public.trip_templates IS 'Pre-made trip templates for quick setup';
```

**3. Test locally:**

```bash
supabase db push      # Applies to local DB
npm test              # Verify no breakage
```

**4. Generate types:**

```bash
npm run generate-types
```

**5. Commit:**

```bash
git add supabase/migrations/${TIMESTAMP}_*.sql
git add packages/core/src/types/database.ts
git commit -m "feat(db): add trip templates"
```

**6. Apply to production:**

```bash
# Option 1: CLI (recommended for standard migrations)
supabase link --project-ref tbwbaydyyjokrsjtgerh  # If not already linked
supabase db push --linked

# Option 2: Dashboard (recommended for urgent fixes or single commands)
# - Open: https://supabase.com/dashboard/project/tbwbaydyyjokrsjtgerh/sql
# - Copy SQL from migration file
# - Paste in SQL Editor
# - Review carefully
# - Execute
```

**When to use each option:**

- **CLI (`db push`):** Standard workflow for migrations that build on existing schema
- **Dashboard (SQL Editor):** Quick fixes, single SQL statements, or when CLI fails due to migration history conflicts

### Pre-Push Checklist

**MUST verify before `supabase db push --linked`:**

- [ ] Migration tested locally (`supabase db reset` works)
- [ ] All tests pass (`npm test`)
- [ ] TypeScript compiles (no type errors)
- [ ] RLS policies tested with different user roles
- [ ] SECURITY DEFINER functions have `SET search_path = public` (or `public, net, pg_temp` for edge function triggers)
- [ ] Indexes exist for all foreign keys
- [ ] Migration is idempotent (uses `IF NOT EXISTS`, `IF EXISTS`)
- [ ] No destructive operations without backup plan
- [ ] Team notified if breaking change

**Post-push verification:**

- [ ] Production responds (Supabase Dashboard healthy)
- [ ] Web app loads (no 500 errors)
- [ ] Test critical flows (login, create trip, add expense)
- [ ] Check Sentry for new errors

### Emergency Rollback

If migration breaks production:

**1. Apply rollback migration** (if created):

```bash
supabase db push --linked -f ${TIMESTAMP}_*_rollback.sql
```

**2. Manual undo** (if no rollback):

- Write SQL to reverse changes
- Apply via Supabase Dashboard SQL Editor

**3. Nuclear option:**

- Supabase Dashboard → Database → Backups → Restore
- WARNING: Loses all data since backup

## Additional Resources

- **Full Documentation:** [../../docs/DATABASE.md](../../docs/DATABASE.md)
- **Project Guide:** [../../CLAUDE.md](../../CLAUDE.md)
- **Archive Details:** [archive/README.md](archive/README.md)
