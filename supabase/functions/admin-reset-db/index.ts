import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { autoRefreshToken: false, persistSession: false }
    })

    console.log('=== RESET DB: Starting ===')

    // 1. Delete all data in correct order (respecting foreign keys)
    const tables = [
      'estoque_movimentacoes',
      'estoque_lotacoes',
      'estoque_itens',
      'chamados_historico',
      'chamados',
      'push_subscriptions',
      'admin_notification_preferences',
      'user_roles',
      'profiles',
      'salas',
      'unidades',
      'problemas',
      'produtos',
    ]

    for (const table of tables) {
      const { error } = await supabaseAdmin.from(table).delete().neq('id', '00000000-0000-0000-0000-000000000000')
      if (error) {
        console.error(`Error deleting from ${table}:`, error.message)
      } else {
        console.log(`Cleared table: ${table}`)
      }
    }

    // 2. Delete all auth users
    const { data: authUsers, error: listError } = await supabaseAdmin.auth.admin.listUsers({ perPage: 1000 })
    if (listError) {
      console.error('Error listing users:', listError.message)
    } else {
      for (const user of authUsers.users) {
        const { error: delErr } = await supabaseAdmin.auth.admin.deleteUser(user.id)
        if (delErr) {
          console.error(`Error deleting auth user ${user.id}:`, delErr.message)
        } else {
          console.log(`Deleted auth user: ${user.email}`)
        }
      }
    }

    // 3. Create admin user
    const { data: newUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
      email: 'cpd@ubs.internal',
      password: '123456',
      email_confirm: true,
      user_metadata: { nome: 'Administrador CPD' }
    })

    if (createError || !newUser.user) {
      console.error('Error creating admin user:', createError?.message)
      return new Response(JSON.stringify({ error: 'Failed to create admin user', details: createError?.message }), {
        status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    console.log('Created admin user:', newUser.user.id)

    // 4. Update profile with username
    const { error: profileError } = await supabaseAdmin
      .from('profiles')
      .update({ username: 'cpd', nome: 'Administrador CPD' })
      .eq('id', newUser.user.id)

    if (profileError) console.error('Profile update error:', profileError.message)

    // 5. Insert admin role
    const { error: roleError } = await supabaseAdmin
      .from('user_roles')
      .insert({ user_id: newUser.user.id, role: 'admin' })

    if (roleError) console.error('Role insert error:', roleError.message)

    // 6. Create CPD unit
    const { error: unidadeError } = await supabaseAdmin
      .from('unidades')
      .insert({ nome: 'CPD', endereco: 'Centro de controle e distribuição de equipamentos' })

    if (unidadeError) console.error('Unidade insert error:', unidadeError.message)

    console.log('=== RESET DB: Complete ===')

    return new Response(JSON.stringify({ 
      success: true, 
      message: 'Database reset complete',
      admin_user_id: newUser.user.id
    }), {
      status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })

  } catch (error) {
    console.error('Unexpected error:', error)
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }
})
