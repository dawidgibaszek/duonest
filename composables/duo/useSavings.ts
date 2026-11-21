import { getFirebaseBridge } from '../useFirebaseBridge'
import { savingsGoals, savingsContributions, currentUser, partnership, isOnlineWithSupabase } from './state'
import { saveToStorage } from './utils'
import type { SavingsGoal, SavingsContribution } from '~/types/duo'

export function useSavings(options: {
  triggerToast: (msg: string, opts?: any) => void
  broadcastToPartner: (action: string, data: any) => void
  verifyAccess?: () => Promise<boolean>
}) {
  const getDb = () => getFirebaseBridge()

  const syncSavingsToStorage = () => {
    saveToStorage('duonest_savings_goals', savingsGoals.value)
    saveToStorage('duonest_savings_contributions', savingsContributions.value)
  }

  const addSavingsGoal = async (payload: {
    title: string
    target_amount: number
    initial_deposit?: number
    category?: 'travel' | 'home' | 'gadget' | 'date' | 'emergency' | 'other'
    currency?: string
    target_date?: string | null
    icon?: string
    color?: string
  }): Promise<SavingsGoal | null> => {
    if (!partnership.value?.id) return null
    if (options.verifyAccess && !(await options.verifyAccess())) return null

    const cleanTitle = (payload.title || '').trim().replace(/\s+/g, ' ').slice(0, 100)
    if (!cleanTitle) return null

    const targetAmount = Math.max(1, Math.min(999999999, Math.round((Number(payload.target_amount) || 0) * 100) / 100))
    if (!Number.isFinite(targetAmount) || targetAmount <= 0) return null

    const initialDeposit = Math.max(0, Math.min(targetAmount, Math.round((Number(payload.initial_deposit) || 0) * 100) / 100))

    const cleanCategory = ['travel', 'home', 'gadget', 'date', 'emergency', 'other'].includes(payload.category || '')
      ? (payload.category as any)
      : 'travel'

    const cleanCurrency = ['PLN', 'EUR', 'USD', 'GBP'].includes(payload.currency || '')
      ? (payload.currency as string)
      : 'PLN'

    const cleanTargetDate = payload.target_date && /^\d{4}-\d{2}-\d{2}$/.test(payload.target_date)
      ? payload.target_date
      : null

    const cleanIcon = ['airplane', 'home', 'gadget', 'date', 'shield', 'sparkles', 'car', 'gift'].includes(payload.icon || '')
      ? (payload.icon as string)
      : 'airplane'

    const cleanColor = payload.color && /^#[0-9a-fA-F]{6}$/.test(payload.color)
      ? payload.color
      : '#0284c7'

    const goalId = 'svg_' + Math.random().toString(36).substring(2, 9) + Date.now().toString(36)
    const isCompleted = initialDeposit >= targetAmount && targetAmount > 0

    const newGoal: SavingsGoal = {
      id: goalId,
      partnership_id: partnership.value.id,
      title: cleanTitle,
      category: cleanCategory,
      target_amount: targetAmount,
      current_amount: initialDeposit,
      currency: cleanCurrency,
      target_date: cleanTargetDate,
      icon: cleanIcon,
      color: cleanColor,
      is_completed: isCompleted,
      completed_at: isCompleted ? new Date().toISOString() : null,
      created_by: currentUser.value.id,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }

    savingsGoals.value = [newGoal, ...savingsGoals.value]

    let initialContrib: SavingsContribution | null = null
    if (initialDeposit > 0) {
      initialContrib = {
        id: 'sct_' + Math.random().toString(36).substring(2, 9) + Date.now().toString(36),
        goal_id: goalId,
        partnership_id: partnership.value.id,
        user_id: currentUser.value.id,
        amount: initialDeposit,
        note: 'Wpłata początkowa',
        created_at: new Date().toISOString()
      }
      savingsContributions.value = [initialContrib, ...savingsContributions.value]
    }

    syncSavingsToStorage()
    options.broadcastToPartner('SAVINGS_GOAL_ADD', newGoal)
    if (initialContrib) {
      options.broadcastToPartner('SAVINGS_CONTRIBUTION_ADD', {
        goalId,
        goalTitle: cleanTitle,
        contribution: initialContrib,
        newCurrentAmount: initialDeposit,
        isCompleted
      })
    }

    const bridge = getDb()
    if (bridge && isOnlineWithSupabase.value) {
      try {
        await bridge.from('savings_goals').insert(newGoal)
        if (initialContrib) {
          await bridge.from('savings_contributions').insert(initialContrib)
        }
      } catch (err) {
        console.warn('Błąd podczas zapisywania skarbonki w bazie:', err)
      }
    }

    options.triggerToast('Utworzono nową skarbonkę!')
    return newGoal
  }

  const updateSavingsGoal = async (id: string, updates: Partial<SavingsGoal>): Promise<boolean> => {
    if (options.verifyAccess && !(await options.verifyAccess())) return false
    const goal = savingsGoals.value.find(g => g.id === id)
    if (!goal) return false

    const safeUpdates: Partial<SavingsGoal> = {
      updated_at: new Date().toISOString()
    }

    if (typeof updates.title === 'string' && updates.title.trim()) {
      safeUpdates.title = updates.title.trim().replace(/\s+/g, ' ').slice(0, 100)
    }
    if (typeof updates.target_amount === 'number' && updates.target_amount > 0) {
      safeUpdates.target_amount = Math.round(updates.target_amount * 100) / 100
      safeUpdates.is_completed = goal.current_amount >= safeUpdates.target_amount
    }
    if (updates.category && ['travel', 'home', 'gadget', 'date', 'emergency', 'other'].includes(updates.category)) {
      safeUpdates.category = updates.category
    }
    if (updates.target_date !== undefined) {
      safeUpdates.target_date = updates.target_date && /^\d{4}-\d{2}-\d{2}$/.test(updates.target_date) ? updates.target_date : null
    }
    if (updates.icon && ['airplane', 'home', 'gadget', 'date', 'shield', 'sparkles', 'car', 'gift'].includes(updates.icon)) {
      safeUpdates.icon = updates.icon
    }
    if (updates.color && /^#[0-9a-fA-F]{6}$/.test(updates.color)) {
      safeUpdates.color = updates.color
    }

    Object.assign(goal, safeUpdates)
    syncSavingsToStorage()

    options.broadcastToPartner('SAVINGS_GOAL_UPDATE', { id, title: goal.title, updates: safeUpdates })

    const bridge = getDb()
    if (bridge && isOnlineWithSupabase.value) {
      try {
        await bridge.from('savings_goals').update(safeUpdates).eq('id', id).eq('partnership_id', goal.partnership_id)
      } catch (err) {
        console.warn('Błąd podczas aktualizacji skarbonki:', err)
      }
    }

    options.triggerToast('Zaktualizowano cel')
    return true
  }

  const deleteSavingsGoal = async (id: string): Promise<boolean> => {
    if (options.verifyAccess && !(await options.verifyAccess())) return false
    const goal = savingsGoals.value.find(g => g.id === id)
    if (!goal) return false

    savingsGoals.value = savingsGoals.value.filter(g => g.id !== id)
    savingsContributions.value = savingsContributions.value.filter(c => c.goal_id !== id)
    syncSavingsToStorage()

    options.broadcastToPartner('SAVINGS_GOAL_DELETE', { id })

    const bridge = getDb()
    if (bridge && isOnlineWithSupabase.value) {
      try {
        await bridge.from('savings_goals').delete().eq('id', id).eq('partnership_id', goal.partnership_id)
      } catch (err) {
        console.warn('Błąd podczas usuwania skarbonki:', err)
      }
    }

    options.triggerToast('Usunięto skarbonkę')
    return true
  }

  const addSavingsContribution = async (goalId: string, amount: number, note?: string): Promise<boolean> => {
    if (!partnership.value?.id) return false
    if (options.verifyAccess && !(await options.verifyAccess())) return false
    const goal = savingsGoals.value.find(g => g.id === goalId)
    if (!goal) return false

    const cleanAmount = Math.round((Number(amount) || 0) * 100) / 100
    if (!Number.isFinite(cleanAmount) || cleanAmount === 0) return false

    const cleanNote = (note || '').trim().slice(0, 150) || null

    const contributionId = 'sct_' + Math.random().toString(36).substring(2, 9) + Date.now().toString(36)
    const newContrib: SavingsContribution = {
      id: contributionId,
      goal_id: goalId,
      partnership_id: partnership.value.id,
      user_id: currentUser.value.id,
      amount: cleanAmount,
      note: cleanNote,
      created_at: new Date().toISOString()
    }

    savingsContributions.value = [newContrib, ...savingsContributions.value]

    const newCurrent = Math.max(0, Math.round((goal.current_amount + cleanAmount) * 100) / 100)
    const nowCompleted = newCurrent >= goal.target_amount && goal.target_amount > 0

    goal.current_amount = newCurrent
    goal.is_completed = nowCompleted
    if (nowCompleted && !goal.completed_at) {
      goal.completed_at = new Date().toISOString()
    }
    goal.updated_at = new Date().toISOString()

    syncSavingsToStorage()

    options.broadcastToPartner('SAVINGS_CONTRIBUTION_ADD', {
      goalId,
      goalTitle: goal.title,
      contribution: newContrib,
      newCurrentAmount: newCurrent,
      isCompleted: nowCompleted
    })

    const bridge = getDb()
    if (bridge && isOnlineWithSupabase.value) {
      try {
        await bridge.from('savings_contributions').insert(newContrib)
      } catch (err) {
        console.warn('Błąd podczas dodawania wpłaty do skarbonki:', err)
      }
    }

    options.triggerToast(cleanAmount > 0 ? `Wpłacono ${cleanAmount} zł do skarbonki!` : `Wypłacono ${Math.abs(cleanAmount)} zł`)
    return true
  }

  const deleteSavingsContribution = async (id: string): Promise<boolean> => {
    if (options.verifyAccess && !(await options.verifyAccess())) return false
    const contrib = savingsContributions.value.find(c => c.id === id)
    if (!contrib) return false

    const goal = savingsGoals.value.find(g => g.id === contrib.goal_id)

    savingsContributions.value = savingsContributions.value.filter(c => c.id !== id)

    if (goal) {
      const remainingForGoal = savingsContributions.value.filter(c => c.goal_id === goal.id)
      const recalculated = remainingForGoal.reduce((sum, c) => sum + (Number(c.amount) || 0), 0)
      goal.current_amount = Math.max(0, Math.round(recalculated * 100) / 100)
      goal.is_completed = goal.current_amount >= goal.target_amount && goal.target_amount > 0
    }

    syncSavingsToStorage()

    options.broadcastToPartner('SAVINGS_CONTRIBUTION_DELETE', {
      id,
      goalId: contrib.goal_id,
      newCurrentAmount: goal?.current_amount,
      isCompleted: goal?.is_completed
    })

    const bridge = getDb()
    if (bridge && isOnlineWithSupabase.value) {
      try {
        await bridge.from('savings_contributions').delete().eq('id', id).eq('partnership_id', contrib.partnership_id)
      } catch (err) {
        console.warn('Błąd podczas usuwania wpłaty:', err)
      }
    }

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
