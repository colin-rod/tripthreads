import { createClient } from '@supabase/supabase-js'
import { TEST_USERS } from '../apps/web/tests/__fixtures__/test-users'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

async function testTripInsert() {
  console.log('🧪 Testing trip insert with authenticated user...\n')

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
  console.log('📧 Email:', authData.user.email)
  console.log('🎫 Session token:', authData.session.access_token.substring(0, 20) + '...')

  // Use the same client (already authenticated via signInWithPassword)
  // Don't create a new client - the session is already set

  // Try to insert a trip
  console.log('\n🔨 Attempting to insert trip...')
  console.log('Owner ID:', TEST_USERS.alice.id)

  const trip = {
    name: `Test Trip ${Date.now()}`,
    description: 'Testing RLS policy',
    start_date: '2025-12-01',
    end_date: '2025-12-10',
    owner_id: TEST_USERS.alice.id,
  }

  const { data, error } = await supabase.from('trips').insert(trip).select().single()

  if (error) {
    console.error('\n❌ Insert failed:', error.message)
    console.error('Error code:', error.code)
    console.error('Error details:', error.details)
    console.error('Error hint:', error.hint)
    return
  }

  console.log('\n✅ Trip created successfully!')
  console.log('Trip ID:', data.id)
  console.log('Trip name:', data.name)

  // Clean up
  console.log('\n🧹 Cleaning up...')
  const { error: deleteError } = await supabase.from('trips').delete().eq('id', data.id)

  if (deleteError) {
    console.error('⚠️  Failed to delete trip:', deleteError.message)
  } else {
    console.log('✅ Trip deleted')
  }

  await supabase.auth.signOut()
  console.log('\n✅ Test complete!')
}

testTripInsert().catch(console.error)
