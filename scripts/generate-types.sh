#!/bin/bash

# Generate TypeScript types from Supabase database schema
# Usage: npm run generate-types

set -e

echo "🔄 Generating TypeScript types from Supabase schema..."

# Check if Supabase CLI is installed
if ! command -v supabase &> /dev/null; then
    echo "❌ Supabase CLI not found. Install it with:"
    echo "   npm install -g supabase"
    exit 1
fi

# Check if Supabase is running locally
if ! supabase status &> /dev/null; then
    echo "⚠️  Supabase is not running locally. Starting..."
    supabase start
fi

# Generate types
supabase gen types typescript --local > packages/shared/types/database.ts

echo "✅ Types generated successfully at packages/shared/types/database.ts"
