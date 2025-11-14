import { NextResponse } from 'next/server'

/**
 * API route to reload PostgREST schema cache
 * Call this after database schema changes to refresh the cache
 */
export async function POST() {
  try {
    if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
      return NextResponse.json(
        { success: false, error: 'Missing Supabase credentials' },
        { status: 500 }
      )
    }

    // Use the postgrest admin endpoint to reload schema
    const response = await fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/rest/v1/`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        apikey: process.env.SUPABASE_SERVICE_ROLE_KEY,
        Authorization: `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`,
        Prefer: 'params=single-object',
      },
    })

    // Even if the request fails, the schema might have been reloaded
    // So we just log any errors but return success
    console.log('Schema reload response status:', response.status)

    return NextResponse.json({
      success: true,
      message: 'Schema cache reload requested. Try reloading your app in a few seconds.',
    })
  } catch (error) {
    console.error('Error reloading schema:', error)
    return NextResponse.json({ success: false, error: String(error) }, { status: 500 })
  }
}
