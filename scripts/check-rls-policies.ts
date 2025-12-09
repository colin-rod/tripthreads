import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

if (!supabaseServiceKey) {
  console.error('❌ SUPABASE_SERVICE_ROLE_KEY not set')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function checkRLSPolicies() {
  console.log('🔍 Checking RLS policies for trips table...\n')

  // Query pg_policies to see what policies exist
  const { data, error } = await supabase.rpc('exec_sql', {
    sql: `
      SELECT
        schemaname,
        tablename,
        policyname,
        permissive,
        roles,
        cmd,
        qual,
        with_check
      FROM pg_policies
      WHERE tablename = 'trips'
      ORDER BY policyname;
    `,
  })

  if (error) {
    console.error('❌ Error querying policies:', error.message)
    console.log('\n📝 Trying alternative method...\n')

    // Alternative: try to list using information_schema
    const { data: altData, error: altError } = await supabase
      .from('pg_policies')
      .select('*')
      .eq('tablename', 'trips')

    if (altError) {
      console.error('❌ Alternative method also failed:', altError.message)
      console.log('\n💡 Please check policies manually in Supabase SQL Editor with:\n')
      console.log("SELECT * FROM pg_policies WHERE tablename = 'trips';")
      return
    }

    console.log('✅ Policies found (alternative method):')
    console.log(JSON.stringify(altData, null, 2))
    return
  }

  if (!data || data.length === 0) {
    console.log('⚠️  No policies found for trips table')
    return
  }

  console.log(`✅ Found ${data.length} policies:\n`)
  console.log(JSON.stringify(data, null, 2))
}

checkRLSPolicies().catch(console.error)
