import { createClient } from '@supabase/supabase-js'
import { TEST_USERS } from '../apps/web/tests/__fixtures__/test-users'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

async function testAuthUid() {
  console.log('🧪 Testing auth.uid() function...\n')

  // Create a client and sign in as alice
  const supabase = createClient(supabaseUrl, supabaseAnonKey)

  const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
    email: TEST_USERS.alice.email,
    password: TEST_USERS.alice.password,
  })

  if (authError || !authData.session) {
    console.error('❌ Authentication failed:', authError?.message)
    return
  }

  console.log('✅ Authenticated as:', authData.user.id)

  // Create an authenticated client
  const authedClient = createClient(supabaseUrl, supabaseAnonKey, {
    global: {
      headers: {
        Authorization: `Bearer ${authData.session.access_token}`,
      },
    },
  })

  // Try to call auth.uid() directly via RPC or query
  console.log('\n🔍 Checking what auth.uid() returns in Postgres context...')

  // Test by querying the profiles table (which should use auth.uid() in RLS)
  const { data: profileData, error: profileError } = await authedClient
    .from('profiles')
    .select('id, email')
    .eq('id', authData.user.id)
    .single()

  if (profileError) {
    console.error('❌ Profile query failed:', profileError.message)
  } else {
    console.log('✅ Can query own profile:', profileData)
  }

  // Try to select from trips (should use is_trip_participant which calls auth.uid())
  console.log('\n🔍 Testing trip SELECT (uses is_trip_participant with auth.uid())...')
  const { data: trips, error: tripsError } = await authedClient
    .from('trips')
    .select('id, name')
    .limit(1)

  if (tripsError) {
    console.error('❌ Trips query failed:', tripsError.message)
  } else {
    console.log(`✅ Can query trips: found ${trips?.length || 0} trips`)
  }

  await supabase.auth.signOut()
  console.log('\n✅ Test complete!')
}

testAuthUid().catch(console.error)
