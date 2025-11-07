# GitHub Secrets Setup for TripThreads

This guide explains how to set up GitHub secrets required for automated workflows.

## Required Secrets

### 1. Supabase Type Generation

For the automated Supabase types generation workflow (`.github/workflows/generate-types.yml`):

#### `SUPABASE_PROJECT_ID`

Your Supabase project reference ID.

**How to get it:**

1. Go to https://app.supabase.com
2. Select your TripThreads project
3. Go to **Settings** → **General**
4. Copy the **Reference ID**

#### `SUPABASE_ACCESS_TOKEN`

Personal access token for Supabase API.

**How to get it:**

1. Go to https://app.supabase.com/account/tokens
2. Click **"Generate new token"**
3. Give it a name: `GitHub Actions - TripThreads`
4. Copy the token (you won't see it again!)

### 2. Other Existing Secrets

These should already be configured:

- `NEXT_PUBLIC_SUPABASE_URL` - Your Supabase project URL
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` - Your Supabase anon/public key
- `CODECOV_TOKEN` - (Optional) For code coverage reports

## How to Add Secrets to GitHub

1. Go to your GitHub repository: https://github.com/colin-rod/tripthreads
2. Click **Settings** (repository settings, not your account)
3. In the left sidebar, click **Secrets and variables** → **Actions**
4. Click **New repository secret**
5. Enter the secret name (e.g., `SUPABASE_PROJECT_ID`)
6. Paste the secret value
7. Click **Add secret**
8. Repeat for each secret

## Verifying Setup

After adding the secrets:

1. Make a change to a migration file (or create a new one)
2. Push to `development` branch
3. Go to **Actions** tab in GitHub
4. Check if **"Generate Supabase Types"** workflow runs successfully
5. If successful, you should see a new commit with updated types

## Troubleshooting

### Workflow fails with "SUPABASE_PROJECT_ID not set"

Make sure you've added the secret with the exact name `SUPABASE_PROJECT_ID` (case-sensitive).

### Workflow fails with "Authentication failed"

Your `SUPABASE_ACCESS_TOKEN` may be invalid or expired. Generate a new one and update the secret.

### Types are not being generated

1. Check the workflow run logs in the Actions tab
2. Verify the secrets are set correctly
3. Make sure the migration file is in `supabase/migrations/` directory

## Security Notes

- **Never commit secrets to the repository**
- Access tokens can be revoked and regenerated if compromised
- Only repository admins can view/edit secrets
- Secrets are encrypted and only exposed to workflows during execution

## Contact

If you encounter issues with the automated type generation:

1. Check [SUPABASE_TYPES_GENERATION.md](./SUPABASE_TYPES_GENERATION.md) for detailed workflow documentation
2. Review workflow logs in GitHub Actions tab
3. Manually generate types locally: `npm run generate-types:remote`

---

**Last Updated**: 2025-11-07
