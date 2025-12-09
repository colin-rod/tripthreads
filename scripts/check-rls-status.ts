import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function checkRLSStatus() {
  console.log('🔍 Checking RLS status for trips table...\n')

  // Try using service role to bypass RLS and query pg_tables
  const { data, error } = await supabase.rpc('exec_sql', {
    sql: `
      SELECT
        schemaname,
        tablename,
        rowsecurity,
        (SELECT COUNT(*) FROM pg_policies WHERE tablename = 'trips') as policy_count
      FROM pg_tables
      WHERE tablename = 'trips';
    `,
  })

  if (error) {
    console.log('⚠️  RPC not available, trying direct service role query...\n')

    // Try direct insert with service role (bypasses RLS)
    const { data: tripData, error: tripError } = await supabase
      .from('trips')
      .insert({
        name: 'Service Role Test Trip',
        description: 'Testing with service role',
        start_date: '2025-12-01',
        end_date: '2025-12-10',
        owner_id: 'cd1ac94d-54b7-4a4c-96ab-7c3eaf6da184', // Alice's ID
      })
      .select()
      .single()

    if (tripError) {
      console.error('❌ Even service role failed:', tripError.message)
      console.error('This suggests a database constraint or trigger issue')
      return
    }

    console.log('✅ Service role can insert (RLS is enabled but bypassed)')
    console.log('Trip ID:', tripData.id)

    // Clean up
    await supabase.from('trips').delete().eq('id', tripData.id)
    console.log('✅ Cleaned up test trip')

    console.log(
      '\n💡 RLS is enabled and service role works, but authenticated users cannot insert.'
    )
    console.log('This suggests the RLS policies are too restrictive.')
    return
  }

  console.log('✅ RLS Status:')
  console.log(JSON.stringify(data, null, 2))
}

checkRLSStatus().catch(console.error)
