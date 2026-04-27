import { initializeApp } from 'firebase/app'
import {
  getAuth,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut as firebaseSignOut,
  onAuthStateChanged,
} from 'firebase/auth'
import {
  getFirestore,
  collection,
  doc,
  getDoc,
  getDocs,
  addDoc,
  setDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  limit,
  serverTimestamp,
  onSnapshot,
} from 'firebase/firestore'
import {
  getDatabase,
  ref,
  push,
  onValue,
  off,
  serverTimestamp as rtServerTimestamp,
} from 'firebase/database'

const firebaseConfig = {
  apiKey: 'AIzaSyAqXWpvvkrYans8-iXCMApCAmIO3b2ruLs',
  authDomain: 'ryadom-1a705.firebaseapp.com',
  databaseURL: 'https://ryadom-1a705-default-rtdb.europe-west1.firebasedatabase.app',
  projectId: 'ryadom-1a705',
  storageBucket: 'ryadom-1a705.firebasestorage.app',
  messagingSenderId: '1081784996268',
  appId: '1:1081784996268:web:e0c432526ab8364c0f6a09',
}

const app  = initializeApp(firebaseConfig)
export const auth = getAuth(app)
export const db   = getFirestore(app)
export const rtdb = getDatabase(app)

// ── Helpers ───────────────────────────────────────────────
function distanceM(lat1, lon1, lat2, lon2) {
  const R = 6371000
  const dLat = (lat2 - lat1) * Math.PI / 180
  const dLon = (lon2 - lon1) * Math.PI / 180
  const a = Math.sin(dLat/2)**2 +
    Math.cos(lat1*Math.PI/180)*Math.cos(lat2*Math.PI/180)*Math.sin(dLon/2)**2
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a))
}

// ── Auth ──────────────────────────────────────────────────
export async function checkUsername(username) {
  const q = query(collection(db, 'profiles'), where('username', '==', username))
  const snap = await getDocs(q)
  return snap.empty
}

export async function signUp(username, password, displayName) {
  const email = `${username}@ryadom.app`
  const cred = await createUserWithEmailAndPassword(auth, email, password)
  await setDoc(doc(db, 'profiles', cred.user.uid), {
    username,
    display_name: displayName,
    bio: '',
    city: '',
    avatar_url: null,
    is_admin: false,
    is_banned: false,
    is_business: false,
    events_count: 0,
    created_at: serverTimestamp(),
  })
  return cred.user
}

export async function signIn(username, password) {
  const email = `${username}@ryadom.app`
  const cred = await signInWithEmailAndPassword(auth, email, password)
  return cred.user
}

export async function signOut() {
  await firebaseSignOut(auth)
}

export { onAuthStateChanged }

// ── Profile ───────────────────────────────────────────────
export async function getProfile(userId) {
  const snap = await getDoc(doc(db, 'profiles', userId))
  if (!snap.exists()) return null
  return { id: snap.id, ...snap.data() }
}

export async function updateProfile(userId, updates) {
  await updateDoc(doc(db, 'profiles', userId), updates)
}

// ── Events ────────────────────────────────────────────────
export async function fetchNearbyEvents(lat, lon, radiusMeters = 100000) {
  const now = new Date()
  const q = query(
    collection(db, 'events'),
    where('expires_at', '>', now),
    orderBy('expires_at'),
    limit(200)
  )
  const snap = await getDocs(q)
  const events = []
  snap.forEach(d => {
    const ev = { id: d.id, ...d.data() }
    // Convert Firestore Timestamp to ISO string
    if (ev.expires_at?.toDate) ev.expires_at = ev.expires_at.toDate().toISOString()
    if (ev.created_at?.toDate) ev.created_at = ev.created_at.toDate().toISOString()
    const dist = distanceM(lat, lon, ev.lat, ev.lon)
    if (dist <= radiusMeters) events.push({ ...ev, dist })
  })
  return events.sort((a, b) => a.dist - b.dist)
}

export async function createEvent({ title, category, lat, lon, durationHours, creatorId, chatEnabled = true, photos = [], creatorIsBusiness = false }) {
  const expiresAt = new Date(Date.now() + durationHours * 60 * 60 * 1000)
  const ref = await addDoc(collection(db, 'events'), {
    title, category, lat, lon,
    expires_at: expiresAt,
    creator_id: creatorId,
    chat_enabled: chatEnabled,
    photos,
    creator_is_business: creatorIsBusiness,
    video_url: null,
    created_at: serverTimestamp(),
  })
  return {
    id: ref.id, title, category, lat, lon,
    expires_at: expiresAt.toISOString(),
    creator_id: creatorId,
    chat_enabled: chatEnabled,
    photos,
    creator_is_business: creatorIsBusiness,
    video_url: null,
  }
}

export async function updateEvent(eventId, updates) {
  await updateDoc(doc(db, 'events', eventId), updates)
}

export async function deleteEvent(eventId) {
  await deleteDoc(doc(db, 'events', eventId))
}

export async function fetchMyEvents(creatorId) {
  const q = query(collection(db, 'events'), where('creator_id', '==', creatorId), orderBy('created_at', 'desc'))
  const snap = await getDocs(q)
  return snap.docs.map(d => {
    const ev = { id: d.id, ...d.data() }
    if (ev.expires_at?.toDate) ev.expires_at = ev.expires_at.toDate().toISOString()
    if (ev.created_at?.toDate) ev.created_at = ev.created_at.toDate().toISOString()
    return ev
  })
}

// ── Chat (Realtime Database) ──────────────────────────────
export async function fetchMessages(eventId) {
  return new Promise((resolve) => {
    const msgRef = ref(rtdb, `messages/${eventId}`)
    onValue(msgRef, snap => {
      const msgs = []
      snap.forEach(child => {
        msgs.push({ id: child.key, ...child.val() })
      })
      resolve(msgs)
    }, { onlyOnce: true })
  })
}

export async function sendMessage({ eventId, content, creatorId }) {
  await push(ref(rtdb, `messages/${eventId}`), {
    event_id: eventId,
    content,
    creator_id: creatorId,
    created_at: Date.now(),
  })
}

export function subscribeToMessages(eventId, callback) {
  const msgRef = ref(rtdb, `messages/${eventId}`)
  onValue(msgRef, snap => {
    const msgs = []
    snap.forEach(child => {
      msgs.push({ id: child.key, ...child.val() })
    })
    callback(msgs)
  })
  return () => off(msgRef)
}

// ── Photos (base64 in Firestore) ──────────────────────────
export async function uploadEventPhoto(file, eventId, index) {
  return new Promise((resolve) => {
    const reader = new FileReader()
    reader.onload = e => resolve(e.target.result)
    reader.readAsDataURL(file)
  })
}

export async function updateEventPhotos(eventId, photoUrls) {
  await updateDoc(doc(db, 'events', eventId), { photos: photoUrls })
}

export async function uploadEventVideo(file, eventId) {
  return new Promise((resolve) => {
    const reader = new FileReader()
    reader.onload = e => resolve(e.target.result)
    reader.readAsDataURL(file)
  })
}

export async function updateEventVideo(eventId, videoUrl) {
  await updateDoc(doc(db, 'events', eventId), { video_url: videoUrl })
}

// ── Reviews ───────────────────────────────────────────────
export async function fetchReviews(targetId) {
  const q = query(collection(db, 'reviews'), where('target_id', '==', targetId), orderBy('created_at', 'desc'))
  const snap = await getDocs(q)
  return snap.docs.map(d => ({ id: d.id, ...d.data() }))
}

export async function submitReview({ reviewerId, targetId, eventId, rating, comment }) {
  const q = query(collection(db, 'reviews'),
    where('reviewer_id', '==', reviewerId),
    where('event_id', '==', eventId))
  const existing = await getDocs(q)
  if (!existing.empty) {
    await updateDoc(doc(db, 'reviews', existing.docs[0].id), { rating, comment: comment.trim() })
  } else {
    await addDoc(collection(db, 'reviews'), {
      reviewer_id: reviewerId, target_id: targetId,
      event_id: eventId, rating, comment: comment.trim(),
      created_at: serverTimestamp(),
    })
  }
}

// ── Reactions ─────────────────────────────────────────────
export async function fetchReactions(eventId) {
  const q = query(collection(db, 'reactions'), where('event_id', '==', eventId))
  const snap = await getDocs(q)
  return snap.docs.map(d => ({ id: d.id, ...d.data() }))
}

export async function toggleReaction(eventId, userId, type) {
  const q = query(collection(db, 'reactions'),
    where('event_id', '==', eventId),
    where('user_id', '==', userId),
    where('type', '==', type))
  const snap = await getDocs(q)
  if (!snap.empty) {
    await deleteDoc(doc(db, 'reactions', snap.docs[0].id))
    return false
  } else {
    await addDoc(collection(db, 'reactions'), { event_id: eventId, user_id: userId, type, created_at: serverTimestamp() })
    return true
  }
}

// ── Reports ───────────────────────────────────────────────
export async function submitReport(eventId, reporterId, reason) {
  await addDoc(collection(db, 'reports'), {
    event_id: eventId, reporter_id: reporterId, reason,
    created_at: serverTimestamp(),
  })
}

// ── Announcements ─────────────────────────────────────────
export async function fetchAnnouncements(userId) {
  const now = new Date()
  const q = query(collection(db, 'announcements'),
    where('expires_at', '>', now),
    orderBy('expires_at'), limit(10))
  const snap = await getDocs(q)
  const all = snap.docs.map(d => ({ id: d.id, ...d.data() }))
  return all.find(a => !a.target_user_id || a.target_user_id === userId) ?? null
}

// ── Realtime events subscription ─────────────────────────
export function subscribeToEvents(callback) {
  return onSnapshot(
    query(collection(db, 'events'), where('expires_at', '>', new Date()), orderBy('expires_at')),
    snap => {
      snap.docChanges().forEach(change => {
        const ev = { id: change.doc.id, ...change.doc.data() }
        if (ev.expires_at?.toDate) ev.expires_at = ev.expires_at.toDate().toISOString()
        if (ev.created_at?.toDate) ev.created_at = ev.created_at.toDate().toISOString()
        callback(change.type, ev)
      })
    }
  )
}

// ── Feedback ──────────────────────────────────────────────
export async function saveFeedback(data) {
  await addDoc(collection(db, 'feedback'), { ...data, created_at: serverTimestamp() })
}

// ── Admin ─────────────────────────────────────────────────
export async function adminDeleteEvent(eventId) {
  await deleteDoc(doc(db, 'events', eventId))
}
