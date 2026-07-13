import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL  = import.meta.env.VITE_SUPABASE_URL
const SUPABASE_ANON = import.meta.env.VITE_SUPABASE_ANON_KEY

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON)

// ─── AUTH ────────────────────────────────────────────────────
export const signIn = (email, password) =>
  supabase.auth.signInWithPassword({ email, password })

export const signOut = () => supabase.auth.signOut()

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
  const { data } = supabase.storage.from('sijil-templates').getPublicUrl(path)
  return data.publicUrl
}

// ─── TEACHERS (bank data guru) ────────────────────────────────
export const getTeachers = () =>
  supabase.from('teachers').select('*').order('full_name')

export const addTeacher = (data) =>
  supabase.from('teachers').insert(data).select().single()

export const deleteTeacher = (id) =>
  supabase.from('teachers').delete().eq('id', id)

export const updateTeacher = (id, data) =>
  supabase.from('teachers').update(data).eq('id', id)

// ─── RECIPIENTS ──────────────────────────────────────────────
export const getRecipients = (programId) =>
  supabase.from('recipients').select('*').eq('program_id', programId).order('full_name')

export const addRecipient = (data) =>
  supabase.from('recipients').insert(data).select().single()

export const deleteRecipient = (id) =>
  supabase.from('recipients').delete().eq('id', id)

// Tambah ramai guru sekaligus dari senarai tick
export const bulkAddRecipients = (rows) =>
  supabase.from('recipients').insert(rows).select()

// ─── SEMAK IC (public) ────────────────────────────────────────
export const checkRecipient = (programId, ic) =>
  supabase.rpc('check_recipient', { p_program_id: programId, p_ic: ic })

export const markGenerated = (programId, ic) =>
  supabase.rpc('mark_cert_generated', { p_program_id: programId, p_ic: ic })
