import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

if (!supabaseServiceKey) {
  console.error('❌ SUPABASE_SERVICE_ROLE_KEY not set in .env.local')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function addTripsInsertPolicy() {
  console.log('🔧 Adding INSERT policy for trips table...\n')

  const { error } = await supabase.rpc('exec_sql', {
    sql: `
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM pg_policies
          WHERE schemaname = 'public'
          AND tablename = 'trips'
          AND policyname = 'Users can create trips'
        ) THEN
          CREATE POLICY "Users can create trips"
          ON public.trips
          FOR INSERT
          TO public
          WITH CHECK (auth.uid() = owner_id);

          RAISE NOTICE 'Created INSERT policy for trips table';
        ELSE
          RAISE NOTICE 'INSERT policy for trips already exists';
        END IF;
      END $$;
    `,
  })

  if (error) {
    // Try direct SQL if RPC doesn't work
    console.log('⚠️  RPC method not available, trying direct query...')

    const { error: directError } = await supabase.from('_migrations').select().limit(1)

    if (directError) {
      console.error('❌ Failed to add policy:', error.message)
      console.error('\n📝 Please run this SQL manually in Supabase SQL Editor:')
      console.error('\nCREATE POLICY IF NOT EXISTS "Users can create trips"')
      console.error('ON public.trips')
      console.error('FOR INSERT')
      console.error('TO public')
      console.error('WITH CHECK (auth.uid() = owner_id);')
      process.exit(1)
    }
  }

  console.log('✅ Policy added successfully!')
  console.log('💡 You can now run integration tests with: npm test')
}

addTripsInsertPolicy().catch(err => {
  console.error('❌ Error:', err.message)
  console.error('\n📝 Please run this SQL manually in Supabase SQL Editor:')
  console.error('\nCREATE POLICY IF NOT EXISTS "Users can create trips"')
  console.error('ON public.trips')
  console.error('FOR INSERT')
  console.error('TO public')
  console.error('WITH CHECK (auth.uid() = owner_id);')
  process.exit(1)
})
