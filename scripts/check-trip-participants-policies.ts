import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

if (!supabaseServiceKey) {
  console.error('❌ SUPABASE_SERVICE_ROLE_KEY not set')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function checkTripParticipantsPolicies() {
  console.log('🔍 Checking RLS policies for trip_participants table...\n')

  // Try direct query using from() since rpc might not exist
  const { data, error } = await supabase
    .from('pg_policies')
    .select('*')
    .eq('tablename', 'trip_participants')
    .order('policyname')

  if (error) {
    console.error('❌ Error querying policies:', error.message)
    console.log('\n💡 Please check policies manually in Supabase SQL Editor with:\n')
    console.log(
      "SELECT schemaname, tablename, policyname, cmd, qual, with_check FROM pg_policies WHERE tablename = 'trip_participants' ORDER BY policyname;"
    )
    return
  }

  if (!data || data.length === 0) {
    console.log('⚠️  No policies found for trip_participants table')
    console.log('\n❌ MISSING INSERT POLICY!')
    console.log('This is why trip creation is failing.')
    return
  }

  console.log(`✅ Found ${data.length} policies:\n`)
  data.forEach((policy: any) => {
    console.log(`📋 Policy: ${policy.policyname}`)
    console.log(`   Command: ${policy.cmd}`)
    console.log(`   Qual: ${policy.qual || 'N/A'}`)
    console.log(`   With Check: ${policy.with_check || 'N/A'}`)
    console.log('')
  })

  // Check specifically for INSERT policy
  const insertPolicy = data.find((p: any) => p.cmd === 'INSERT')
  if (!insertPolicy) {
    console.log('❌ MISSING INSERT POLICY!')
    console.log('This is why trip creation is failing.')
    console.log('\n💡 Need to add policy: "Trip owners can add participants"')
  } else {
    console.log(`✅ INSERT policy exists: ${insertPolicy.policyname}`)
  }
}

checkTripParticipantsPolicies().catch(console.error)
