import { createHash } from 'node:crypto'
import type { DocumentData, Firestore } from 'firebase-admin/firestore'

export function projectPartnerProfile(profile: DocumentData, id: string, partnershipId: string) {
  const hasAvatar = typeof profile.avatar_url === 'string' && !!profile.avatar_url
  return {
    id,
    partnership_id: partnershipId,
    name: profile.name ?? '',
    has_avatar: hasAvatar,
    avatar_updated_at: hasAvatar
      ? profile.avatar_updated_at ?? createHash('sha256').update(profile.avatar_url).digest('hex')
      : null,
    avatar_color: profile.avatar_color ?? null,
    current_mood: profile.current_mood ?? null,
    mood_note: profile.mood_note ?? '',
    mood_updated_at: profile.mood_updated_at ?? null,
    love_note: profile.love_note ?? '',
    last_seen_at: profile.last_seen_at ?? null,
    gender: profile.gender ?? null,
    grammatical_gender: profile.grammatical_gender ?? null,
    points: profile.points ?? 0
  }
}

export async function refreshPartnerProfile(db: Firestore, id: string) {
  return db.runTransaction(async tx => {
    const source = (await tx.get(db.collection('profiles').doc(id))).data()
    const destination = db.collection('partner_profiles').doc(id)
    const pid = source?.partnership_id
    if (!source || typeof pid !== 'string' || !pid || pid.includes('/')) {
      tx.delete(destination)
      return
    }
    const pair = (await tx.get(db.collection('partnerships').doc(pid))).data()
    if (!pair || ![pair.partner1_id, pair.partner2_id].includes(id)) {
      tx.delete(destination)
      return
    }
    tx.set(destination, projectPartnerProfile(source, id, pid))
  })
}
