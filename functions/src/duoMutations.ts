import type { Firestore, Transaction, DocumentSnapshot, DocumentData } from 'firebase-admin/firestore'
import { documentId, DuoDataError, requirePartnership, type PartnershipAccess } from './partnershipAccess'

function ownedDocument(snapshot: DocumentSnapshot, access: PartnershipAccess): DocumentData & { id: string } {
  const data = snapshot.data()
  if (!data || data.partnership_id !== access.partnershipId || data.deleted_at) {
    throw new DuoDataError(404, 'Element niedostępny.')
  }
  return { ...data, id: snapshot.id }
}

function nonnegativePoints(value: unknown) {
  return typeof value === 'number' && Number.isSafeInteger(value) ? Math.max(0, value) : 0
}

function taskPoints(value: unknown) {
  return Math.min(100, Math.max(1, nonnegativePoints(value)))
}

function desiredState(value: unknown) {
  if (typeof value !== 'boolean') throw new DuoDataError(400, 'Nieprawidłowy status.')
  return value
}

async function deleteTask(tx: Transaction, db: Firestore, access: PartnershipAccess, id: string, now: string) {
  const ref = db.collection('tasks').doc(id)
  const task = (await tx.get(ref)).data()
  if (!task || task.partnership_id !== access.partnershipId) {
    throw new DuoDataError(404, 'Element niedostępny.')
  }
  // Keep the awarded points, pet XP and source record for completed tasks.
  if (!task.deleted_at) tx.update(ref, { deleted_at: now })
  return { success: true }
}

async function setTaskCompleted(tx: Transaction, db: Firestore, access: PartnershipAccess, id: string, completed: boolean, now: string) {
  const ref = db.collection('tasks').doc(id)
  const task = ownedDocument(await tx.get(ref), access)
  const sameState = Boolean(task.is_completed) === completed
  if (sameState) return { task, points: nonnegativePoints(access.profile.points), petXp: nonnegativePoints(access.partnership.pet_xp) }

  const members = [access.partnership.partner1_id, access.partnership.partner2_id]
  const previousScorer = members.includes(task.completed_by) ? task.completed_by : null
  const scorer = completed ? access.profileId : previousScorer
  const scorerRef = scorer ? db.collection('profiles').doc(scorer) : null
  const scorerData = scorer === access.profileId ? access.profile : scorerRef ? (await tx.get(scorerRef)).data() : null
  const awarded = completed ? taskPoints(task.points) : Math.min(100, nonnegativePoints(task.points_awarded))
  const delta = completed ? awarded : -awarded
  const currentPoints = nonnegativePoints(access.profile.points)
  const petXp = Math.max(0, nonnegativePoints(access.partnership.pet_xp) + delta)
  const updates = {
    is_completed: completed,
    completed_by: completed ? access.profileId : null,
    completed_at: completed ? now : null,
    points_awarded: completed ? awarded : 0
  }

  if (scorerRef && scorerData?.partnership_id === access.partnershipId) {
    tx.update(scorerRef, { points: Math.max(0, nonnegativePoints(scorerData.points) + delta) })
  }
  tx.update(access.partnershipRef, { pet_xp: petXp })
  tx.update(ref, updates)
  return { task: { ...task, ...updates }, points: scorer === access.profileId ? Math.max(0, currentPoints + delta) : currentPoints, petXp }
}

async function setMilestoneCompleted(tx: Transaction, db: Firestore, access: PartnershipAccess, id: string, completed: boolean, now: string) {
  const ref = db.collection('milestones').doc(id)
  const milestone = ownedDocument(await tx.get(ref), access)
  if (Boolean(milestone.is_completed) === completed) return { milestone }

  if (completed) {
    const members: string[] = [access.partnership.partner1_id, access.partnership.partner2_id]
    const eligible = milestone.assigned_to ? members.filter(id => id === milestone.assigned_to) : members
    const profiles = await Promise.all(eligible.map(id =>
      id === access.profileId ? access.profile : tx.get(db.collection('profiles').doc(id)).then(snap => snap.data())
    ))
    const total = profiles.reduce((sum, profile) => sum + (profile?.partnership_id === access.partnershipId ? nonnegativePoints(profile.points) : 0), 0)
    if (eligible.length === 0 || !Number.isFinite(milestone.target_points) || milestone.target_points < 10 || total < milestone.target_points) {
      throw new DuoDataError(409, 'Za mało punktów do odebrania nagrody.')
    }
  }

  const updates = { is_completed: completed, completed_at: completed ? now : null }
  tx.update(ref, updates)
  return { milestone: { ...milestone, ...updates } }
}

const MAX_CENTS = 99_999_999_900

function cents(value: unknown) {
  if (typeof value !== 'number' || !Number.isFinite(value)) throw new DuoDataError(400, 'Podaj poprawną kwotę.')
  const amount = Math.round(value * 100)
  if (Math.abs(amount) > MAX_CENTS) throw new DuoDataError(400, 'Kwota przekracza limit skarbonki.')
  return amount
}

function balanceFields(previous: Record<string, any>, balance: number, target: number, now: string) {
  if (balance < 0 || balance > MAX_CENTS) throw new DuoDataError(409, 'Operacja przekracza dostępne środki lub limit skarbonki.')
  const completed = balance >= target
  return {
    current_amount: balance / 100,
    is_completed: completed,
    completed_at: completed ? previous.completed_at || now : null,
    updated_at: now
  }
}

function goalMetadata(body: Record<string, any>, previous: Record<string, any> = {}) {
  const title = body.title === undefined ? previous.title : typeof body.title === 'string' ? body.title.trim().replace(/\s+/g, ' ').slice(0, 100) : ''
  if (!title) throw new DuoDataError(400, 'Podaj nazwę skarbonki.')
  const target = cents(body.target_amount ?? previous.target_amount)
  if (target < 100) throw new DuoDataError(400, 'Cel musi wynosić co najmniej 1.')
  const category = body.category ?? previous.category ?? 'travel'
  const currency = previous.currency ?? body.currency ?? 'PLN'
  const targetDate = body.target_date !== undefined ? body.target_date : previous.target_date ?? null
  const icon = body.icon ?? previous.icon ?? 'airplane'
  const color = body.color ?? previous.color ?? '#0284c7'
  return {
    title,
    target_amount: target / 100,
    category: ['travel', 'home', 'gadget', 'date', 'emergency', 'other'].includes(category) ? category : 'travel',
    currency: ['PLN', 'EUR', 'USD', 'GBP'].includes(currency) ? currency : 'PLN',
    target_date: typeof targetDate === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(targetDate) ? targetDate : null,
    icon: ['airplane', 'home', 'gadget', 'date', 'shield', 'sparkles', 'car', 'gift'].includes(icon) ? icon : 'airplane',
    color: typeof color === 'string' && /^#[a-f\d]{6}$/i.test(color) ? color : '#0284c7'
  }
}

async function existingBalance(tx: Transaction, db: Firestore, goal: Record<string, any>) {
  const entries = await tx.get(db.collection('savings_contributions').where('goal_id', '==', goal.id))
  const balance = entries.docs
    .filter(doc => doc.data().partnership_id === goal.partnership_id)
    .reduce((sum, doc) => sum + cents(doc.data().amount), 0)
  return balance
}

function contribution(access: PartnershipAccess, id: string, goalId: string, amount: number, note: unknown, now: string) {
  return {
    id, goal_id: goalId, partnership_id: access.partnershipId, user_id: access.profileId,
    amount: amount / 100,
    note: typeof note === 'string' ? note.trim().slice(0, 150) || null : null,
    created_at: now
  }
}

async function createSavingsGoal(tx: Transaction, db: Firestore, access: PartnershipAccess, id: string, body: Record<string, any>, now: string) {
  const ref = db.collection('savings_goals').doc(id)
  const snapshot = await tx.get(ref)
  if (snapshot.exists) {
    const goal = ownedDocument(snapshot, access)
    if (goal.created_by !== access.profileId) throw new DuoDataError(409, 'Identyfikator skarbonki jest już używany.')
    const entry = (await tx.get(db.collection('savings_contributions').doc(id))).data()
    return { goal, contribution: entry?.goal_id === id && entry.partnership_id === access.partnershipId ? entry : null }
  }
  const metadata = goalMetadata(body)
  const initial = cents(body.initial_deposit ?? 0)
  if (initial < 0 || initial > cents(metadata.target_amount)) throw new DuoDataError(400, 'Nieprawidłowa wpłata początkowa.')
  const goal = {
    ...metadata, ...balanceFields({}, initial, cents(metadata.target_amount), now),
    id, partnership_id: access.partnershipId, created_by: access.profileId, created_at: now
  }
  const entry = initial > 0 ? contribution(access, id, id, initial, 'Wpłata początkowa', now) : null
  tx.create(ref, goal)
  if (entry) tx.create(db.collection('savings_contributions').doc(entry.id), entry)
  return { goal, contribution: entry }
}

async function changeSavingsGoal(tx: Transaction, db: Firestore, access: PartnershipAccess, id: string, action: string, body: Record<string, any>, now: string) {
  const ref = db.collection('savings_goals').doc(id)
  const snap = await tx.get(ref)
  if (action === 'savings/delete' && snap.data()?.partnership_id === access.partnershipId && snap.data()?.deleted_at) return { success: true }
  const goal = ownedDocument(snap, access)
  if (action === 'savings/delete') {
    tx.update(ref, { deleted_at: now })
    return { success: true }
  }
  const metadata = goalMetadata(body, goal)
  const balance = await existingBalance(tx, db, goal)
  const updates = { ...metadata, ...balanceFields(goal, Math.max(0, balance), cents(metadata.target_amount), now) }
  tx.update(ref, updates)
  return { goal: { ...goal, ...updates } }
}

async function changeContribution(tx: Transaction, db: Firestore, access: PartnershipAccess, id: string, adding: boolean, body: Record<string, any>, now: string) {
  const ref = db.collection('savings_contributions').doc(id)
  const snap = await tx.get(ref)
  const old = snap.exists ? ownedDocument(snap, access) : null
  if (old && old.user_id !== access.profileId && old.user_id !== access.profile.auth_user_id) {
    throw new DuoDataError(403, 'Tylko autor może usunąć swój wpis.')
  }
  if (!adding && !old) return { success: true }

  const goalId = documentId(adding ? body.goalId : old?.goal_id)
  const goalRef = db.collection('savings_goals').doc(goalId)
  const goal = ownedDocument(await tx.get(goalRef), access)
  if (adding && old) {
    if (old.goal_id !== goalId) throw new DuoDataError(409, 'Identyfikator wpłaty jest już używany.')
    return { goal, contribution: old }
  }
  const delta = cents(adding ? body.amount : -old!.amount)
  if (delta === 0) throw new DuoDataError(400, 'Kwota musi być różna od zera.')
  const balance = await existingBalance(tx, db, goal)
  const updates = balanceFields(goal, balance + delta, cents(goal.target_amount), now)
  const entry = adding ? contribution(access, id, goalId, delta, body.note, now) : null
  if (entry) tx.create(ref, entry)
  else tx.delete(ref)
  tx.update(goalRef, updates)
  return { goal: { ...goal, ...updates }, contribution: entry }
}

export function mutateDuoData(db: Firestore, uid: string, body: Record<string, any>) {
  const id = documentId(body?.id)
  const now = new Date().toISOString()
  return db.runTransaction(async tx => {
    const access = await requirePartnership(tx, db, uid)
    switch (body.action) {
      case 'tasks/complete': return setTaskCompleted(tx, db, access, id, desiredState(body.completed), now)
      case 'tasks/delete': return deleteTask(tx, db, access, id, now)
      case 'milestones/complete': return setMilestoneCompleted(tx, db, access, id, desiredState(body.completed), now)
      case 'savings/create': return createSavingsGoal(tx, db, access, id, body, now)
      case 'savings/update':
      case 'savings/delete': return changeSavingsGoal(tx, db, access, id, body.action, body, now)
      case 'savings/deposit':
      case 'savings/remove-deposit': return changeContribution(tx, db, access, id, body.action === 'savings/deposit', body, now)
      default: throw new DuoDataError(400, 'Nieznana operacja.')
    }
  })
}
