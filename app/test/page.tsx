import { createServiceRoleClient } from '@/lib/supabase/server'

export default async function TestPage() {
  const supabase = await createServiceRoleClient()
  
  const { data: users, error } = await supabase
    .from('users')
    .select('id, email, first_name, last_name, role, organization_id')
  
  return (
    <div style={{ padding: 40, fontFamily: 'monospace' }}>
      <h1>Test DB Connection</h1>
      {error && <p style={{ color: 'red' }}>Error: {JSON.stringify(error)}</p>}
      {users && (
        <pre>{JSON.stringify(users, null, 2)}</pre>
      )}
      {users?.length === 0 && <p>No users found in public.users</p>}
    </div>
  )
}
