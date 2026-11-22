import { trackDuoEvent } from '~/composables/useDuoAnalytics'
import { getFirebaseBridge } from '../useFirebaseBridge'
import { savingsGoals, savingsContributions, currentUser, partnership } from './state'
import { newDocumentId, saveToStorage } from './utils'
import type { SavingsGoal, SavingsContribution } from '~/types/duo'

type SavingsResponse = { goal?: SavingsGoal; contribution?: SavingsContribution | null; success?: boolean }

export function useSavings(options: {
  triggerToast: (msg: string, opts?: any) => void
  broadcastToPartner: (action: string, data: any) => void
  verifyAccess?: () => Promise<boolean>
}) {
  const syncSavingsToStorage = () => {
    saveToStorage('duonest_savings_goals', savingsGoals.value)
    saveToStorage('duonest_savings_contributions', savingsContributions.value)
  }

  const mutate = async (action: string, id: string, data: object = {}) => {
    const pid = partnership.value?.id
    const profileId = currentUser.value.id
    if (!pid || (options.verifyAccess && !(await options.verifyAccess()))) return null
    try {
      const result = await getFirebaseBridge().callApi<SavingsResponse>('/api/duo/mutate', { ...data, action, id })
      if (partnership.value?.id !== pid || currentUser.value.id !== profileId) return null
      if (result.goal) {
        const goal = savingsGoals.value.find(item => item.id === result.goal!.id)
        if (!goal) savingsGoals.value.unshift(result.goal)
        else if ((goal.updated_at || '') <= (result.goal.updated_at || '')) Object.assign(goal, result.goal)
      }
      if (result.contribution && !savingsContributions.value.some(item => item.id === result.contribution!.id)) {
        savingsContributions.value.unshift(result.contribution)
      }
      syncSavingsToStorage()
      return result
    } catch (error) {
      options.triggerToast(error instanceof Error ? error.message : 'Nie udało się zapisać skarbonki.', { type: 'warning' })
      return null
    }
  }

  const addSavingsGoal = async (payload: Partial<SavingsGoal> & { title: string; target_amount: number; initial_deposit?: number }) => {
    const result = await mutate('savings/create', newDocumentId('svg_'), payload)
    if (!result?.goal) return null
    options.broadcastToPartner('SAVINGS_GOAL_ADD', result.goal)
    trackDuoEvent('duo_savings_created')
    options.triggerToast('Utworzono nową skarbonkę!')
    return result.goal
  }

  const updateSavingsGoal = async (id: string, updates: Partial<SavingsGoal>) => {
    const result = await mutate('savings/update', id, updates)
    if (!result?.goal) return false
    options.broadcastToPartner('SAVINGS_GOAL_UPDATE', { id, title: result.goal.title, updates: result.goal })
    options.triggerToast('Zaktualizowano cel')
    return true
  }

  const deleteSavingsGoal = async (id: string) => {
    const result = await mutate('savings/delete', id)
    if (!result?.success) return false
    savingsGoals.value = savingsGoals.value.filter(goal => goal.id !== id)
    savingsContributions.value = savingsContributions.value.filter(entry => entry.goal_id !== id)
    syncSavingsToStorage()
    options.triggerToast('Usunięto skarbonkę')
    return true
  }

  const addSavingsContribution = async (goalId: string, amount: number, note?: string) => {
    const result = await mutate('savings/deposit', newDocumentId('sct_'), { goalId, amount, note })
    if (!result?.contribution || !result.goal) return false
    options.broadcastToPartner('SAVINGS_CONTRIBUTION_ADD', {
      goalId, goalTitle: result.goal.title, contribution: result.contribution,
      newCurrentAmount: result.goal.current_amount, isCompleted: result.goal.is_completed
    })
    const entryAmount = result.contribution.amount
    options.triggerToast(entryAmount > 0 ? `Wpłacono ${entryAmount} zł do skarbonki!` : `Wypłacono ${Math.abs(entryAmount)} zł`)
    return true
  }

  const deleteSavingsContribution = async (id: string) => {
    const result = await mutate('savings/remove-deposit', id)
    if (!result) return false
    savingsContributions.value = savingsContributions.value.filter(entry => entry.id !== id)
    syncSavingsToStorage()
    options.triggerToast('Usunięto wpis z historii')
    return true
  }

  return {
    savingsGoals,
    savingsContributions,
    addSavingsGoal,
    updateSavingsGoal,
    deleteSavingsGoal,
    addSavingsContribution,
    deleteSavingsContribution
  }
}
