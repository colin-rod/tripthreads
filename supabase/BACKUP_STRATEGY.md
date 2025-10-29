# Database Backup Strategy

This document outlines the backup and disaster recovery strategy for TripThreads Supabase database.

## Backup Methods

### 1. Automatic Supabase Backups (Built-in)

**What:** Supabase automatically creates daily backups for Pro tier projects.

**Coverage:**

- Database schema and data
- Point-in-time recovery (PITR) for last 7 days
- Full backups retained for 30 days

**How to Access:**

1. Go to Supabase Dashboard → Database → Backups
2. View available restore points
3. Initiate restore if needed

**Limitations:**

- Free tier: No automatic backups
- Requires Pro tier ($25/month per project)

### 2. Manual SQL Dumps (Primary for Free Tier)

**Frequency:** Daily (automated via cron/GitHub Actions)

**Command:**

```bash
# Full database dump
pg_dump $DATABASE_URL > backups/tripthreads_$(date +%Y%m%d).sql

# Compressed dump
pg_dump $DATABASE_URL | gzip > backups/tripthreads_$(date +%Y%m%d).sql.gz

# Schema only
pg_dump $DATABASE_URL --schema-only > backups/schema_$(date +%Y%m%d).sql

# Data only
pg_dump $DATABASE_URL --data-only > backups/data_$(date +%Y%m%d).sql
```

**Storage:** AWS S3 / Google Cloud Storage / GitHub (for schema only)

### 3. Migration History (Schema Versioning)

**What:** Git tracks all schema changes via migration files

**Location:** `supabase/migrations/`

**Benefits:**

- Complete history of schema evolution
- Easy rollback to previous versions
- Schema can be recreated from scratch
- Version controlled

## Backup Schedule

### Production

| Type               | Frequency | Retention     | Priority |
| ------------------ | --------- | ------------- | -------- |
| Supabase Auto      | Daily     | 30 days       | High     |
| Manual SQL Dump    | Daily     | 90 days       | High     |
| Schema Migrations  | On change | Forever (Git) | Critical |
| Weekly Full Backup | Weekly    | 1 year        | Medium   |

### Staging

| Type              | Frequency | Retention     | Priority |
| ----------------- | --------- | ------------- | -------- |
| Manual SQL Dump   | Weekly    | 30 days       | Low      |
| Schema Migrations | On change | Forever (Git) | Critical |

### Local Development

| Type              | Frequency            | Retention           | Priority |
| ----------------- | -------------------- | ------------------- | -------- |
| Schema Migrations | On change            | Forever (Git)       | Critical |
| Manual Dump       | Before major changes | Until change tested | Low      |

## Automated Backup Setup

### Option 1: GitHub Actions (Recommended)

Create `.github/workflows/database-backup.yml`:

```yaml
name: Database Backup

on:
  schedule:
    # Run daily at 2 AM UTC
    - cron: '0 2 * * *'
  workflow_dispatch: # Allow manual trigger

jobs:
  backup:
    runs-on: ubuntu-latest
    steps:
      - name: Checkout
        uses: actions/checkout@v4

      - name: Install PostgreSQL Client
        run: sudo apt-get install -y postgresql-client

      - name: Create Backup
        env:
          DATABASE_URL: ${{ secrets.SUPABASE_DB_URL }}
        run: |
          mkdir -p backups
          pg_dump $DATABASE_URL | gzip > backups/tripthreads_$(date +%Y%m%d_%H%M%S).sql.gz

      - name: Upload to S3
        env:
          AWS_ACCESS_KEY_ID: ${{ secrets.AWS_ACCESS_KEY_ID }}
          AWS_SECRET_ACCESS_KEY: ${{ secrets.AWS_SECRET_ACCESS_KEY }}
        run: |
          aws s3 cp backups/ s3://tripthreads-backups/production/ --recursive

      - name: Clean old local backups
        run: rm -rf backups/
```

### Option 2: Cron Job (Server-based)

Create `scripts/backup-database.sh`:

```bash
#!/bin/bash

# TripThreads Database Backup Script
# Add to cron: 0 2 * * * /path/to/backup-database.sh

set -e

# Configuration
BACKUP_DIR="/var/backups/tripthreads"
DATABASE_URL="your-connection-string"
RETENTION_DAYS=90
S3_BUCKET="s3://tripthreads-backups"

# Create backup directory
mkdir -p $BACKUP_DIR

# Generate filename
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
FILENAME="tripthreads_${TIMESTAMP}.sql.gz"

# Create backup
echo "Creating backup: $FILENAME"
pg_dump $DATABASE_URL | gzip > $BACKUP_DIR/$FILENAME

# Upload to S3
echo "Uploading to S3..."
aws s3 cp $BACKUP_DIR/$FILENAME $S3_BUCKET/production/

# Clean old backups (local)
echo "Cleaning old local backups..."
find $BACKUP_DIR -name "tripthreads_*.sql.gz" -mtime +$RETENTION_DAYS -delete

# Verify backup
echo "Verifying backup..."
gunzip -t $BACKUP_DIR/$FILENAME

echo "Backup completed successfully!"
```

## Restore Procedures

### Restore from Supabase Auto-Backup

1. **Via Dashboard:**
   - Go to Database → Backups
   - Select restore point
   - Click "Restore"
   - Confirm (creates new project)

2. **Via CLI:**
   ```bash
   supabase db restore --project-ref your-project-ref --timestamp 2025-01-29T00:00:00Z
   ```

### Restore from SQL Dump

**Full Restore:**

```bash
# 1. Drop existing database (BE CAREFUL!)
dropdb tripthreads

# 2. Create new database
createdb tripthreads

# 3. Restore from backup
psql $DATABASE_URL < backups/tripthreads_20250129.sql

# Or from compressed backup
gunzip -c backups/tripthreads_20250129.sql.gz | psql $DATABASE_URL
```

**Selective Restore (specific tables):**

```bash
# Extract specific table from dump
pg_restore -t trips -d $DATABASE_URL backups/tripthreads_20250129.sql

# Or restore only data (keep schema)
psql $DATABASE_URL < backups/data_20250129.sql
```

### Restore from Migration History

**Rebuild from scratch:**

```bash
# 1. Reset database
supabase db reset

# 2. This will:
#    - Drop all tables
#    - Re-run all migrations in order
#    - Apply seed data (if seed.sql exists)

# 3. Verify schema
psql $DATABASE_URL -c "\dt public.*"
```

## Disaster Recovery Scenarios

### Scenario 1: Accidental Data Deletion

**Severity:** High
**Recovery Time Objective (RTO):** < 1 hour
**Recovery Point Objective (RPO):** < 24 hours

**Steps:**

1. Stop all write operations (disable app if necessary)
2. Restore from most recent backup
3. Verify data integrity
4. Re-enable app
5. Investigate cause and prevent recurrence

### Scenario 2: Corrupted Database

**Severity:** Critical
**RTO:** < 2 hours
**RPO:** < 24 hours

**Steps:**

1. Switch to backup Supabase project (if available)
2. Restore from backup to new database
3. Update connection strings
4. Run integrity checks
5. Resume operations

### Scenario 3: Schema Migration Failure

**Severity:** Medium
**RTO:** < 30 minutes
**RPO:** 0 (schema changes only)

**Steps:**

1. Apply rollback migration
2. Fix migration script
3. Test locally with `supabase db reset`
4. Re-apply corrected migration

### Scenario 4: Complete Data Loss

**Severity:** Critical
**RTO:** < 4 hours
**RPO:** < 24 hours

**Steps:**

1. Create new Supabase project
2. Apply all migrations from Git
3. Restore data from latest backup
4. Verify data integrity
5. Update DNS/connection strings
6. Resume operations

## Testing Backup & Restore

### Monthly Backup Test

```bash
# 1. Create test database
createdb tripthreads_test

# 2. Restore latest backup
psql postgres://localhost/tripthreads_test < backups/latest.sql

# 3. Verify row counts match
psql postgres://localhost/tripthreads_test -c "
  SELECT
    'users' as table_name, COUNT(*) as row_count FROM users
  UNION ALL
  SELECT 'trips', COUNT(*) FROM trips
  UNION ALL
  SELECT 'trip_participants', COUNT(*) FROM trip_participants
"

# 4. Run integrity checks
psql postgres://localhost/tripthreads_test -c "
  SELECT * FROM trips WHERE owner_id NOT IN (SELECT id FROM users);
"

# 5. Clean up
dropdb tripthreads_test
```

### Rollback Migration Test

```bash
# 1. Apply migration
supabase db push

# 2. Test rollback
psql $DATABASE_URL < supabase/migrations/..._rollback.sql

# 3. Re-apply migration
supabase db push

# 4. Verify data integrity
```

## Monitoring & Alerts

### Metrics to Monitor

- **Backup success rate:** Should be 100%
- **Backup file size:** Track growth over time
- **Backup duration:** Alert if takes > 30 minutes
- **Storage usage:** Alert if > 80% capacity
- **Failed restores:** Alert immediately

### Alert Configuration

**Slack Webhook Example:**

```bash
#!/bin/bash
# Add to backup script

if [ $? -eq 0 ]; then
  curl -X POST $SLACK_WEBHOOK -d '{"text":"✅ Database backup succeeded"}'
else
  curl -X POST $SLACK_WEBHOOK -d '{"text":"❌ Database backup FAILED!"}'
fi
```

## Security

### Backup Encryption

**At Rest:**

- Use encrypted S3 buckets
- Enable server-side encryption (AES-256)

**In Transit:**

- Use HTTPS for S3 uploads
- Use SSL for database connections

### Access Control

**Who can restore:**

- Production: Only DevOps lead + CTO
- Staging: All developers
- Local: All developers

**Backup Storage Access:**

- Production backups: Admin only
- Use IAM roles/policies
- Enable audit logging

## Cost Optimization

### Storage Costs

| Storage Type    | Cost (per month) | Retention | Notes               |
| --------------- | ---------------- | --------- | ------------------- |
| Supabase Auto   | Included in Pro  | 30 days   | Most convenient     |
| AWS S3 Standard | ~$0.023/GB       | 90 days   | Use lifecycle rules |
| S3 Glacier      | ~$0.004/GB       | 1 year+   | For long-term       |

### Optimization Tips

1. **Compress backups** - Use gzip for 5-10x reduction
2. **Lifecycle policies** - Auto-move to Glacier after 90 days
3. **Incremental backups** - Only changed data (advanced)
4. **Delete old backups** - Keep only what's needed

## Compliance

### GDPR Requirements

- **Right to erasure:** Ensure backups can be updated to remove user data
- **Data retention:** Delete backups older than required retention period
- **Data portability:** Users can request their data from backups

### Implementation

```sql
-- Script to remove user from all backups
-- Run after user deletion request

DELETE FROM users WHERE id = 'user-uuid';
DELETE FROM trip_participants WHERE user_id = 'user-uuid';
-- Update any other tables with user references
```

## Checklist

### Setup Checklist

- [ ] Supabase Pro tier enabled (if budget allows)
- [ ] GitHub Actions backup workflow configured
- [ ] S3 bucket created with encryption
- [ ] IAM policies configured
- [ ] Backup alerts configured
- [ ] Restore procedure tested
- [ ] Team trained on restore process
- [ ] Backup strategy documented (this file)

### Monthly Maintenance

- [ ] Test restore from latest backup
- [ ] Verify backup file integrity
- [ ] Check storage usage
- [ ] Review and clean old backups
- [ ] Update documentation if needed

## Resources

- [Supabase Backup Docs](https://supabase.com/docs/guides/platform/backups)
- [pg_dump Documentation](https://www.postgresql.org/docs/current/app-pgdump.html)
- [AWS S3 Best Practices](https://docs.aws.amazon.com/AmazonS3/latest/userguide/backup-for-s3.html)

## Support

If you encounter issues with backups or restores:

1. Check Supabase status page: https://status.supabase.com
2. Review backup logs
3. Contact Supabase support (for Pro tier)
4. Create incident in Linear for tracking
