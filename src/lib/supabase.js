import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY
const proxyUrl = import.meta.env.VITE_SUPABASE_PROXY_URL

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('Supabase env vars missing. Copy .env.example → .env and fill in values.')
}

export const supabase = createClient(proxyUrl || supabaseUrl, supabaseAnonKey)

export async function fetchNearbyEvents(lat, lon, radiusMeters = 5000) {
  const { data, error } = await supabase.rpc('get_nearby_events', {
    user_lat: lat,
    user_lon: lon,
    radius_meters: radiusMeters,
  })
  if (error) throw error
  return data ?? []
}

export async function createEvent({ title, category, lat, lon, durationHours, creatorId, chatEnabled = true, photos = [], creatorIsBusiness = false }) {
  const expiresAt = new Date(Date.now() + durationHours * 60 * 60 * 1000).toISOString()
  const { data, error } = await supabase
    .from('events')
    .insert([{ title, category, lat, lon, expires_at: expiresAt, creator_id: creatorId, chat_enabled: chatEnabled, photos, creator_is_business: creatorIsBusiness }])
    .select()
    .single()
  if (error) { console.error('createEvent error:', error); throw error }
  return data
}

export async function uploadEventPhoto(file, eventId, index) {
  const ext = file.name?.split('.').pop() || 'jpg'
  const path = `${eventId}/${index}.${ext}`
  const { error } = await supabase.storage.from('event-photos').upload(path, file, { upsert: true })
  if (error) throw error
  const { data } = supabase.storage.from('event-photos').getPublicUrl(path)
  return data.publicUrl
}

export async function updateEventPhotos(eventId, photoUrls) {
  const { error } = await supabase.from('events').update({ photos: photoUrls }).eq('id', eventId)
  if (error) throw error
}

export async function fetchMessages(eventId) {
  const { data, error } = await supabase
    .from('messages')
    .select('*')
    .eq('event_id', eventId)
    .order('created_at', { ascending: true })
    .limit(100)
  if (error) { console.error('fetchMessages error:', error); return [] }
  return data ?? []
}

export async function sendMessage({ eventId, content, creatorId }) {
  const { error } = await supabase.from('messages').insert([{
    event_id: eventId,
    content,
    creator_id: creatorId,
  }])
  if (error) throw error
}

// ── Auth ──────────────────────────────────────────────────────
export async function checkUsername(username) {
  const { data } = await supabase.from('profiles').select('id').eq('username', username).maybeSingle()
  return !data
}

export async function signUp(username, password, displayName) {
  const email = `${username}@ryadom.app`
  const { data, error } = await supabase.auth.signUp({ email, password })
  if (error) throw error
  if (!data.user) throw new Error('Ошибка регистрации')
  const { error: profileErr } = await supabase.from('profiles').insert([{
    id: data.user.id, username, display_name: displayName,
  }])
  if (profileErr) throw profileErr
  return data.user
}

export async function signIn(username, password) {
  const email = `${username}@ryadom.app`
  const { data, error } = await supabase.auth.signInWithPassword({ email, password })
  if (error) throw error
  return data.user
}

export async function signOut() {
  await supabase.auth.signOut()
}

// ── Profile ───────────────────────────────────────────────────
export async function getProfile(userId) {
  const { data } = await supabase.from('profiles').select('*').eq('id', userId).single()
  return data ?? null
}

export async function updateProfile(userId, updates) {
  const { error } = await supabase.from('profiles').update(updates).eq('id', userId)
  if (error) throw error
}

export async function fetchMyEvents(creatorId) {
  const { data } = await supabase
    .from('events').select('*')
    .eq('creator_id', creatorId)
    .order('created_at', { ascending: false })
  return data ?? []
}

export async function deleteEvent(eventId) {
  const { error } = await supabase.from('events').delete().eq('id', eventId)
  if (error) throw error
}

export async function updateEvent(eventId, updates) {
  const { error } = await supabase.from('events').update(updates).eq('id', eventId)
  if (error) throw error
}

export async function fetchReviews(targetId) {
  const { data, error } = await supabase
    .from('reviews')
    .select('*')
    .eq('target_id', targetId)
    .order('created_at', { ascending: false })
    .limit(50)
  if (error) { console.error('fetchReviews error:', error); return [] }
  return data ?? []
}

export async function submitReview({ reviewerId, targetId, eventId, rating, comment }) {
  const { error } = await supabase.from('reviews').upsert([{
    reviewer_id: reviewerId,
    target_id: targetId,
    event_id: eventId,
    rating,
    comment: comment.trim(),
  }], { onConflict: 'reviewer_id,event_id' })
  if (error) throw error
}
