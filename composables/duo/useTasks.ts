import { getFirebaseBridge } from '../useFirebaseBridge'
import { tasksList, currentUser, partnership } from './state'
import { newDocumentId, saveToStorage } from './utils'
import type { TaskItem } from '~/types/duo'

export function useTasks(options: {
  triggerToast: (msg: string, opts?: any) => void
  broadcastToPartner: (action: string, data: any) => void
}) {
  const getDb = () => getFirebaseBridge()

  const syncTasksToStorage = () => {
    saveToStorage('duonest_tasks', tasksList.value)
  }

  const addTask = async (
    title: string, description = '', assignedTo: string | null = null,
    isRecurring = false, recurrenceInterval = 'weekly', points = 15
  ) => {
    const pid = partnership.value?.id
    if (!title.trim() || !pid) return null

    const newTask: TaskItem = {
      id: newDocumentId('task_'),
      partnership_id: pid,
      title: title.trim(),
      description: description.trim() || null,
      assigned_to: assignedTo,
      due_date: new Date(Date.now() + 86_400_000).toISOString(),
      is_recurring: isRecurring,
      recurrence_interval: isRecurring ? recurrenceInterval : 'none',
      is_completed: false,
      completed_at: null,
      points: Math.max(1, Math.min(100, Math.round(Number(points) || 15))),
      points_awarded: 0,
      created_by: currentUser.value.id,
      completed_by: null,
      created_at: new Date().toISOString()
    }
    try {
      const { error } = await getDb().from('tasks').insert(newTask)
      if (error) throw error
      if (partnership.value?.id !== pid) return null
      if (!tasksList.value.some(task => task.id === newTask.id)) tasksList.value.unshift(newTask)
      syncTasksToStorage()
      options.broadcastToPartner('TASK_ADD', newTask)
      options.triggerToast('Dodano nowe zadanie')
      return newTask
    } catch {
      options.triggerToast('Nie udało się dodać zadania. Spróbuj ponownie.', { type: 'warning' })
      return null
    }
  }

  const toggleTask = async (id: string) => {
    const task = tasksList.value.find(t => t.id === id)
    if (!task) return

    const profileId = currentUser.value.id
    const partnershipId = partnership.value?.id
    try {
      const result = await getDb().callApi<{ task: TaskItem; points: number; petXp: number }>('/api/duo/mutate', {
        action: 'tasks/complete', id, completed: !task.is_completed
      })
      if (currentUser.value.id !== profileId || partnership.value?.id !== partnershipId) return false

      const updated = tasksList.value.find(item => item.id === id)
      if (updated) Object.assign(updated, result.task)
      currentUser.value.points = result.points
      if (partnership.value) partnership.value.pet_xp = result.petXp
      syncTasksToStorage()
      saveToStorage('duonest_current_user', currentUser.value)
      saveToStorage('duonest_partnership', partnership.value)

      options.broadcastToPartner('TASK_TOGGLE', result.task)
      if (result.task.is_completed) options.triggerToast(`Zadanie ukończone! +${result.task.points_awarded} pkt 🌟`, { type: 'points' })
      return true
    } catch (error) {
      options.triggerToast(error instanceof Error ? error.message : 'Nie udało się zapisać zadania.', { type: 'warning' })
      return false
    }
  }

  const deleteTask = async (id: string) => {
    const pid = partnership.value?.id
    if (!pid || !tasksList.value.some(task => task.id === id)) return false
    try {
      const { error } = await getDb().from('tasks').delete().eq('id', id)
      if (error) throw error
      if (partnership.value?.id !== pid) return false
      tasksList.value = tasksList.value.filter(task => task.id !== id)
      syncTasksToStorage()
      options.broadcastToPartner('TASK_DELETE', { id })
      options.triggerToast('Usunięto zadanie')
      return true
    } catch {
      options.triggerToast('Nie udało się usunąć zadania.', { type: 'warning' })
      return false
    }
  }

  const updatePet = async (petId: string, petName: string) => {
    const pid = partnership.value?.id
    const profileId = currentUser.value.id
    const name = petName.trim().slice(0, 40)
    if (!pid || !name) return false

    try {
      const updates = { pet_id: petId, pet_name: name }
      const { error } = await getDb().from('partnerships').update(updates).eq('id', pid)
      if (error) throw error
      if (partnership.value?.id !== pid || currentUser.value.id !== profileId) return false
      Object.assign(partnership.value, updates)
      saveToStorage('duonest_partnership', partnership.value)
      return true
    } catch {
      options.triggerToast('Nie udało się zapisać pupila. Spróbuj ponownie.', { type: 'warning' })
      return false
    }
  }

  return {
    addTask,
    toggleTask,
    deleteTask,
    updatePet
  }
}
