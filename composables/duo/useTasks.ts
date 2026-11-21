import { getFirebaseBridge } from '../useFirebaseBridge'
import { tasksList, currentUser, partnership, isOnlineWithSupabase } from './state'
import { saveToStorage } from './utils'
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
    title: string,
    points: number = 10,
    optionsData: {
      description?: string
      assigned_to?: string | null
      due_date?: string | null
      is_recurring?: boolean
      recurrence_interval?: string | null
    } = {}
  ) => {
    if (!title.trim() || !partnership.value?.id) return null

    const newTask: TaskItem = {
      id: `task_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      partnership_id: partnership.value.id,
      title: title.trim(),
      description: optionsData.description?.trim() || null,
      assigned_to: optionsData.assigned_to || null,
      due_date: optionsData.due_date || null,
      is_recurring: Boolean(optionsData.is_recurring),
      recurrence_interval: optionsData.recurrence_interval || null,
      is_completed: false,
      completed_at: null,
      points: Math.max(1, points || 10),
      points_awarded: 0,
      created_by: currentUser.value.id,
      completed_by: null,
      created_at: new Date().toISOString()
    }

    tasksList.value.unshift(newTask)
    syncTasksToStorage()

    options.broadcastToPartner('TASK_ADD', newTask)

    const bridge = getDb()
    if (bridge && isOnlineWithSupabase.value) {
      try {
        await bridge.from('tasks').insert(newTask)
      } catch (err) {
        console.warn('Błąd podczas zapisywania zadania:', err)
      }
    }

    options.triggerToast('Dodano nowe zadanie')
    return newTask
  }

  const toggleTask = async (id: string) => {
    const task = tasksList.value.find(t => t.id === id)
    if (!task) return

    task.is_completed = !task.is_completed
    task.completed_at = task.is_completed ? new Date().toISOString() : null
    task.completed_by = task.is_completed ? currentUser.value.id : null

    if (task.is_completed) {
      task.points_awarded = task.points
      currentUser.value.points = (Number(currentUser.value.points) || 0) + task.points
      if (partnership.value) {
        partnership.value.pet_xp = (Number(partnership.value.pet_xp) || 0) + task.points
      }
      options.triggerToast(`Zadanie ukończone! +${task.points} pkt 🌟`, { type: 'points' })
    } else {
      currentUser.value.points = Math.max(0, (Number(currentUser.value.points) || 0) - (task.points_awarded || task.points))
      task.points_awarded = 0
    }

    syncTasksToStorage()
    saveToStorage('duonest_current_user', currentUser.value)
    if (partnership.value) saveToStorage('duonest_partnership', partnership.value)

    options.broadcastToPartner('TASK_TOGGLE', {
      id,
      is_completed: task.is_completed,
      completed_by: task.completed_by,
      points_awarded: task.points_awarded,
      pet_xp: partnership.value?.pet_xp
    })

    const bridge = getDb()
    if (bridge && isOnlineWithSupabase.value) {
      try {
        await bridge.from('tasks').update({
          is_completed: task.is_completed,
          completed_at: task.completed_at,
          completed_by: task.completed_by,
          points_awarded: task.points_awarded
        }).eq('id', id)

        if (currentUser.value.id) {
          await bridge.from('profiles').update({ points: currentUser.value.points }).eq('id', currentUser.value.id)
        }

        if (partnership.value?.id) {
          await bridge.from('partnerships').update({ pet_xp: partnership.value.pet_xp }).eq('id', partnership.value.id)
        }
      } catch (err) {
        console.warn('Błąd aktualizacji zadania:', err)
      }
    }
  }

  const deleteTask = async (id: string) => {
    const idx = tasksList.value.findIndex(t => t.id === id)
    if (idx === -1) return

    tasksList.value.splice(idx, 1)
    syncTasksToStorage()

    options.broadcastToPartner('TASK_DELETE', { id })

    const bridge = getDb()
    if (bridge && isOnlineWithSupabase.value) {
      try {
        await bridge.from('tasks').delete().eq('id', id)
      } catch (err) {
        console.warn('Błąd usuwania zadania:', err)
      }
    }

    options.triggerToast('Usunięto zadanie')
  }

  const updatePet = async (petId: string, petName: string) => {
    if (!partnership.value?.id) return
    partnership.value.pet_id = petId
    partnership.value.pet_name = petName.trim() || 'Kropek'
    saveToStorage('duonest_partnership', partnership.value)

    options.broadcastToPartner('PET_UPDATE', {
      pet_id: partnership.value.pet_id,
      pet_name: partnership.value.pet_name
    })

    const bridge = getDb()
    if (bridge && isOnlineWithSupabase.value) {
      try {
        await bridge.from('partnerships').update({
          pet_id: partnership.value.pet_id,
          pet_name: partnership.value.pet_name
        }).eq('id', partnership.value.id)
      } catch (_) {}
    }

    options.triggerToast('Zaktualizowano zwierzaka! 🐾', { type: 'love' })
  }

  return {
    addTask,
    toggleTask,
    deleteTask,
    updatePet
  }
}
