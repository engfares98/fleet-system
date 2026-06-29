import { createClient } from '@supabase/supabase-js'

export async function POST(request) {
  try {
    const { email, password, role, full_name, permissions, requesterId } = await request.json()

    if (!email || !password) {
      return Response.json({ error: 'الإيميل وكلمة المرور مطلوبان' }, { status: 400 })
    }

    // Service role admin client (bypasses all RLS + email validation)
    const adminSupabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY,
      { auth: { autoRefreshToken: false, persistSession: false } }
    )

    // Verify the requester is an admin
    if (requesterId) {
      const { data: requesterRole } = await adminSupabase
        .from('user_roles')
        .select('role')
        .eq('user_id', requesterId)
        .single()
      if (requesterRole?.role !== 'admin') {
        return Response.json({ error: 'صلاحيات غير كافية' }, { status: 403 })
      }
    }

    // Create the user (skips email validation and confirmation by default)
    const { data, error } = await adminSupabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true, // skip confirmation requirement
      user_metadata: { full_name: full_name || null },
    })

    if (error) {
      return Response.json({ error: error.message }, { status: 400 })
    }

    const newUserId = data?.user?.id

    // Upsert into user_roles (handles auto-created rows by triggers)
    if (newUserId) {
      const { error: roleError } = await adminSupabase
        .from('user_roles')
        .upsert(
          {
            user_id: newUserId,
            role: role || 'viewer',
            full_name: full_name || null,
            is_active: true,
            permissions: permissions || {},
          },
          { onConflict: 'user_id' }
        )
      if (roleError) {
        return Response.json({ error: 'تم إنشاء الحساب لكن فشل حفظ الصلاحية: ' + roleError.message, userId: newUserId }, { status: 207 })
      }
    }

    return Response.json({ success: true, userId: newUserId, email })
  } catch (e) {
    return Response.json({ error: e.message || 'حدث خطأ غير متوقع' }, { status: 500 })
  }
}
