import { getFirebaseBridge } from '../useFirebaseBridge'
import { milestonesList, currentUser, partnership, isOnlineWithSupabase } from './state'
import { saveToStorage } from './utils'
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
    if (!title.trim()) return null
    if (options.verifyAccess && !(await options.verifyAccess())) return null

    const newMilestone: NestMilestone = {
      id: 'm_' + Math.random().toString(36).substring(2, 9),
      partnership_id: partnership.value?.id,
      title: title.trim(),
      description: description.trim(),
      target_points: Math.max(10, Number(targetPoints) || 50),
      assigned_to: assignedTo || null,
      is_completed: false,
      created_by: currentUser.value?.id,
      created_at: new Date().toISOString()
    }

    milestonesList.value.push(newMilestone)
    syncMilestonesToStorage()
    options.broadcastToPartner('MILESTONE_ADD', newMilestone)

    const bridge = getDb()
    if (bridge && partnership.value?.id) {
      try {
        await bridge.from('milestones').insert(newMilestone)
      } catch (err) {
        console.warn('Błąd podczas zapisywania kamienia milowego:', err)
      }
    }

    options.triggerToast('Dodano cel')
    return newMilestone
  }

  const updateMilestone = async (id: string, updates: Partial<NestMilestone>) => {
    if (options.verifyAccess && !(await options.verifyAccess())) return
    const idx = milestonesList.value.findIndex(m => m.id === id)
    if (idx === -1) return

    milestonesList.value[idx] = {
      ...milestonesList.value[idx],
      ...updates
    }
    syncMilestonesToStorage()
    options.broadcastToPartner('MILESTONE_UPDATE', { id, updates })

    const bridge = getDb()
    if (bridge) {
      try {
        await bridge.from('milestones').update(updates).eq('id', id)
      } catch (err) {
        console.warn('Błąd podczas aktualizacji kamienia milowego:', err)
      }
    }

    options.triggerToast('Zaktualizowano cel')
  }

  const deleteMilestone = async (id: string) => {
    if (options.verifyAccess && !(await options.verifyAccess())) return
    milestonesList.value = milestonesList.value.filter(m => m.id !== id)
    syncMilestonesToStorage()
    options.broadcastToPartner('MILESTONE_DELETE', { id })

    const bridge = getDb()
    if (bridge) {
      try {
        await bridge.from('milestones').delete().eq('id', id)
      } catch (err) {
        console.warn('Błąd podczas usuwania kamienia milowego:', err)
      }
    }

    options.triggerToast('Usunięto cel')
  }

  const claimMilestone = async (id: string) => {
    if (options.verifyAccess && !(await options.verifyAccess())) return
    const m = milestonesList.value.find(i => i.id === id)
    if (!m || m.is_completed) return

    const now = new Date().toISOString()
    m.is_completed = true
    m.completed_at = now
    syncMilestonesToStorage()
    options.broadcastToPartner('MILESTONE_CLAIM', { id, title: m.title, completed_at: now })

    const bridge = getDb()
    if (bridge) {
      try {
        await bridge.from('milestones').update({ is_completed: true, completed_at: now }).eq('id', id)
      } catch (err) {
        console.warn('Błąd podczas odbierania nagrody:', err)
      }
    }

    options.triggerToast('Odebrano nagrodę')
  }

  const reactivateMilestone = async (id: string) => {
    if (options.verifyAccess && !(await options.verifyAccess())) return
    const m = milestonesList.value.find(i => i.id === id)
    if (!m || !m.is_completed) return

    m.is_completed = false
    m.completed_at = null
    syncMilestonesToStorage()
    options.broadcastToPartner('MILESTONE_REACTIVATE', { id, title: m.title })

    const bridge = getDb()
    if (bridge) {
      try {
        await bridge.from('milestones').update({ is_completed: false, completed_at: null }).eq('id', id)
      } catch (err) {
        console.warn('Błąd podczas wznawiania kamienia milowego:', err)
      }
    }

    options.triggerToast('Wznowiono cel')
  }

  return {
    milestonesList,
    addMilestone,
    updateMilestone,
    deleteMilestone,
    claimMilestone,
    reactivateMilestone
  }
}
