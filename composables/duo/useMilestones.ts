import { getFirebaseBridge } from '../useFirebaseBridge'
import { milestonesList, currentUser, partnership } from './state'
import { newDocumentId, saveToStorage } from './utils'
import type { NestMilestone } from '~/types/duo'

export function useMilestones(options: {
  triggerToast: (msg: string, opts?: any) => void
  broadcastToPartner: (action: string, data: any) => void
  verifyAccess?: () => Promise<boolean>
}) {
  const getDb = () => getFirebaseBridge()

  const syncMilestonesToStorage = () => {
    saveToStorage('duonest_milestones', milestonesList.value)
  }

  const addMilestone = async (
    title: string,
    targetPoints: number,
    assignedTo: string | null = null,
    description: string = ''
  ) => {
    const pid = partnership.value?.id
    if (!title.trim() || !pid) return null
    if (options.verifyAccess && !(await options.verifyAccess())) return null

    const newMilestone: NestMilestone = {
      id: newDocumentId('m_'),
      partnership_id: pid,
      title: title.trim(),
      description: description.trim(),
      target_points: Math.max(10, Number(targetPoints) || 50),
      assigned_to: assignedTo || null,
      is_completed: false,
      created_by: currentUser.value?.id,
      created_at: new Date().toISOString()
    }

    try {
      const { error } = await getDb().from('milestones').insert(newMilestone)
      if (error) throw error
      if (partnership.value?.id !== pid) return null
      if (!milestonesList.value.some(goal => goal.id === newMilestone.id)) milestonesList.value.push(newMilestone)
      syncMilestonesToStorage()
      options.broadcastToPartner('MILESTONE_ADD', newMilestone)
      options.triggerToast('Dodano cel')
      return newMilestone
    } catch {
      options.triggerToast('Nie udało się dodać celu.', { type: 'warning' })
      return null
    }
  }

  const updateMilestone = async (id: string, updates: Partial<NestMilestone>) => {
    const pid = partnership.value?.id
    if (!pid || (options.verifyAccess && !(await options.verifyAccess()))) return false
    if (!milestonesList.value.some(goal => goal.id === id)) return false
    try {
      const { error } = await getDb().from('milestones').update(updates).eq('id', id)
      if (error) throw error
      if (partnership.value?.id !== pid) return false
      const goal = milestonesList.value.find(item => item.id === id)
      if (goal) Object.assign(goal, updates)
      syncMilestonesToStorage()
      options.broadcastToPartner('MILESTONE_UPDATE', { id, updates })
      options.triggerToast('Zaktualizowano cel')
      return true
    } catch {
      options.triggerToast('Nie udało się zapisać celu.', { type: 'warning' })
      return false
    }
  }

  const deleteMilestone = async (id: string) => {
    const pid = partnership.value?.id
    if (!pid || (options.verifyAccess && !(await options.verifyAccess()))) return false
    try {
      const { error } = await getDb().from('milestones').delete().eq('id', id)
      if (error) throw error
      if (partnership.value?.id !== pid) return false
      milestonesList.value = milestonesList.value.filter(goal => goal.id !== id)
      syncMilestonesToStorage()
      options.broadcastToPartner('MILESTONE_DELETE', { id })
      options.triggerToast('Usunięto cel')
      return true
    } catch {
      options.triggerToast('Nie udało się usunąć celu.', { type: 'warning' })
      return false
    }
  }

  const setMilestoneCompleted = async (id: string, completed: boolean) => {
    if (options.verifyAccess && !(await options.verifyAccess())) return false
    const partnershipId = partnership.value?.id
    try {
      const { milestone } = await getDb().callApi<{ milestone: NestMilestone }>('/api/duo/mutate', {
        action: 'milestones/complete', id, completed
      })
      if (partnership.value?.id !== partnershipId) return false
      const goal = milestonesList.value.find(item => item.id === id)
      if (goal) Object.assign(goal, milestone)
      syncMilestonesToStorage()
      if (completed) options.broadcastToPartner('MILESTONE_CLAIM', milestone)
      options.triggerToast(completed ? 'Odebrano nagrodę' : 'Wznowiono cel')
      return true
    } catch (error) {
      options.triggerToast(error instanceof Error ? error.message : 'Nie udało się zapisać celu.', { type: 'warning' })
      return false
    }
  }

  const claimMilestone = (id: string) => setMilestoneCompleted(id, true)
  const reactivateMilestone = (id: string) => setMilestoneCompleted(id, false)

  return {
    milestonesList,
    addMilestone,
    updateMilestone,
    deleteMilestone,
    claimMilestone,
    reactivateMilestone
  }
}
