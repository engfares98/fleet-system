import { createClient } from '@supabase/supabase-js'

export async function POST(request) {
  try {
    const { userId, requesterId } = await request.json()
    if (!userId) return Response.json({ error: 'معرّف المستخدم مطلوب' }, { status: 400 })

    const adminSupabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY,
      { auth: { autoRefreshToken: false, persistSession: false } }
    )

    // Verify requester is admin
    if (requesterId) {
      const { data: requesterRole } = await adminSupabase
        .from('user_roles')
        .select('role')
        .eq('user_id', requesterId)
        .single()
      if (requesterRole?.role !== 'admin') {
        return Response.json({ error: 'صلاحيات غير كافية' }, { status: 403 })
      }
      if (requesterId === userId) {
        return Response.json({ error: 'لا يمكنك حذف حسابك' }, { status: 400 })
      }
    }

    // Delete from user_roles first
    await adminSupabase.from('user_roles').delete().eq('user_id', userId)

    // Delete the auth user (cascades to all related data)
    const { error } = await adminSupabase.auth.admin.deleteUser(userId)
    if (error) return Response.json({ error: error.message }, { status: 400 })

    return Response.json({ success: true })
  } catch (e) {
    return Response.json({ error: e.message || 'حدث خطأ' }, { status: 500 })
  }
}
