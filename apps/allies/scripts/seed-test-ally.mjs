// Run with: node scripts/seed-test-ally.mjs
// Creates a dummy ally user for testing the Allies dashboard.
// If the 'allies' table doesn't exist yet, run supabase-migrations.sql first.

import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = 'https://krnnifoypyilajatsmva.supabase.co'
const SERVICE_ROLE_KEY =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imtybm5pZm95cHlpbGFqYXRzbXZhIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2Nzk2NDk4OCwiZXhwIjoyMDgzNTQwOTg4fQ.2omaVK498rGfAmThou04IHKWgxA8JZSxP61PtWS8e1M'

// Service-role client — bypasses RLS
const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
  db: { schema: 'public' },
  global: {
    headers: {
      // This header tells PostgREST to bypass RLS for this request
      Prefer: 'return=representation',
    },
  },
})

const TEST_EMAIL = 'testally@1nri.store'
const TEST_PASSWORD = 'Ally1234!'

async function insertAlly(userId) {
  // Use the raw REST API with service role to bypass any RLS issues
  const res = await fetch(`${SUPABASE_URL}/rest/v1/allies`, {
    method: 'POST',
    headers: {
      apikey: SERVICE_ROLE_KEY,
      Authorization: `Bearer ${SERVICE_ROLE_KEY}`,
      'Content-Type': 'application/json',
      Prefer: 'return=representation',
      // Tells PostgREST to act as service role (bypasses RLS)
      'X-Client-Info': 'service_role',
    },
    body: JSON.stringify({
      user_id: userId,
      full_name: 'Kwame Asante',
      email: TEST_EMAIL,
      phone: '+233 24 000 0001',
      location: 'Ashesi University',
      location_type: 'campus',
      commission_rate: 0.15,
      is_active: true,
    }),
  })

  if (!res.ok) {
    const body = await res.text()
    throw new Error(`${res.status}: ${body}`)
  }
  return res.json()
}

async function seed() {
  // 1. Check for existing test ally
  const { data: existing, error: checkErr } = await supabase
    .from('allies')
    .select('id, email')
    .eq('email', TEST_EMAIL)
    .maybeSingle()

  if (checkErr && checkErr.code !== 'PGRST116') {
    console.error('❌ Could not query allies table:', checkErr.message)
    console.log('\n⚠️  The migration likely has not been run yet.')
    console.log('   Please paste supabase-migrations.sql into the Supabase SQL editor,')
    console.log('   then re-run this script.')
    process.exit(1)
  }

  if (existing) {
    console.log('ℹ️  Test ally already exists — no changes made.')
    printCredentials()
    return
  }

  // 2. Create auth user
  console.log('👤 Creating auth user...')
  const { data: authData, error: authError } =
    await supabase.auth.admin.createUser({
      email: TEST_EMAIL,
      password: TEST_PASSWORD,
      email_confirm: true,
      user_metadata: { full_name: 'Kwame Asante' },
    })

  if (authError || !authData?.user) {
    console.error('❌ Auth error:', authError?.message)
    process.exit(1)
  }
  console.log(`   User ID: ${authData.user.id}`)

  // 3. Insert ally row via REST (service role bypasses RLS)
  console.log('📋 Inserting ally profile...')
  try {
    await insertAlly(authData.user.id)
  } catch (err) {
    console.error('❌ Insert failed:', err.message)
    await supabase.auth.admin.deleteUser(authData.user.id)
    console.log('   Auth user rolled back.')
    process.exit(1)
  }

  console.log('')
  console.log('✅ Test ally created successfully!')
  printCredentials()
}

function printCredentials() {
  console.log('─────────────────────────────────')
  console.log('   Name:     Kwame Asante')
  console.log('   Location: Ashesi University  (campus)')
  console.log('   Rate:     15%')
  console.log(`   Email:    ${TEST_EMAIL}`)
  console.log(`   Password: ${TEST_PASSWORD}`)
  console.log('   Login at: http://localhost:3002')
  console.log('─────────────────────────────────')
}

seed().catch((err) => {
  console.error('Unexpected error:', err)
  process.exit(1)
})
