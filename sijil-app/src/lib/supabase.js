import { createClient } from '@supabase/supabase-js'

// Nilai ini diisi dalam Cloudflare Pages > Settings > Environment Variables
const SUPABASE_URL  = import.meta.env.VITE_SUPABASE_URL
const SUPABASE_ANON = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!SUPABASE_URL || !SUPABASE_ANON) {
  console.error(
    'Supabase URL atau Anon Key tiada.\n' +
    'Salin .env.example ke .env dan isi nilai dari Supabase Dashboard.'
  )
}

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON)

// ─── AUTH ────────────────────────────────────────────────────
export const signIn = (email, password) =>
  supabase.auth.signInWithPassword({ email, password })

export const signOut = () => supabase.auth.signOut()

export const getSession = () => supabase.auth.getSession()

// ─── PROGRAMS ────────────────────────────────────────────────
export const getPrograms = () =>
  supabase.from('programs').select('*').order('created_at', { ascending: false })

export const createProgram = (data) =>
  supabase.from('programs').insert(data).select().single()

export const updateProgram = (id, data) =>
  supabase.from('programs').update(data).eq('id', id).select().single()

export const deleteProgram = (id) =>
  supabase.from('programs').delete().eq('id', id)

// ─── TEMPLATE UPLOAD ─────────────────────────────────────────
export const uploadTemplate = async (file, programId) => {
  const ext  = file.name.split('.').pop()
  const path = `${programId}/template.${ext}`

  const { error } = await supabase.storage
    .from('sijil-templates')
    .upload(path, file, { upsert: true })

  if (error) throw error

  const { data } = supabase.storage
    .from('sijil-templates')
    .getPublicUrl(path)

  return data.publicUrl
}

// ─── RECIPIENTS ──────────────────────────────────────────────
export const getRecipients = (programId) =>
  supabase
    .from('recipients')
    .select('*')
    .eq('program_id', programId)
    .order('full_name')

export const addRecipient = (data) =>
  supabase.from('recipients').insert(data).select().single()

export const deleteRecipient = (id) =>
  supabase.from('recipients').delete().eq('id', id)

// Muat naik ramai peserta sekaligus (dari CSV)
export const bulkAddRecipients = (rows) =>
  supabase.from('recipients').insert(rows)

// ─── SEMAK IC (public — tanpa auth) ──────────────────────────
export const checkRecipient = (programId, ic) =>
  supabase.rpc('check_recipient', {
    p_program_id: programId,
    p_ic:         ic,
  })

export const markGenerated = (programId, ic) =>
  supabase.rpc('mark_cert_generated', {
    p_program_id: programId,
    p_ic:         ic,
  })
