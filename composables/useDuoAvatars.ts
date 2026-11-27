import { computed, shallowRef, watch } from 'vue'
import { authUser, currentUser, isAuthLoading, isLoggingOut, partnerUser, partnership } from './duo/state'
import { getFirebaseBridge } from './useFirebaseBridge'
import { requestProfileAvatar } from '~/utils/avatarStorage'

const ownAvatarImage = shallowRef<string | null>(null)
const partnerAvatarImage = shallowRef<string | null>(null)

export function useDuoAvatars() {
  return { ownAvatarImage, partnerAvatarImage }
}

export function watchDuoAvatars() {
  if (!import.meta.client) return
  const enabled = computed(() => !isAuthLoading.value && !isLoggingOut.value)
  watch(
    [enabled, () => authUser.value?.id, () => currentUser.value.id, () => currentUser.value.avatar_url],
    ([active, uid, id, path], _, onCleanup) => {
      ownAvatarImage.value = null
      if (active && uid && id && path) refreshAvatar(uid, id, ownAvatarImage, onCleanup)
    },
    { immediate: true }
  )
  watch(
    [enabled, () => authUser.value?.id, () => partnership.value?.id,
      () => partnerUser.value?.id, () => partnerUser.value?.has_avatar, () => partnerUser.value?.avatar_updated_at],
    ([active, uid, pid, id, hasAvatar], _, onCleanup) => {
      partnerAvatarImage.value = null
      if (active && uid && pid && id && hasAvatar && partnerUser.value?.partnership_id === pid) {
        refreshAvatar(uid, id, partnerAvatarImage, onCleanup)
      }
    },
    { immediate: true }
  )
}

function refreshAvatar(
  uid: string,
  profileId: string,
  image: typeof ownAvatarImage,
  onCleanup: (cleanup: () => void) => void
) {
  const account = getFirebaseBridge()?.auth.currentUser
  if (account?.uid !== uid) return
  const controller = new AbortController()
  onCleanup(() => controller.abort())
  void requestProfileAvatar(account, profileId, 'GET', undefined, controller.signal).then(async response => {
    if (!response.ok || !response.headers.get('content-type')?.startsWith('image/jpeg')) return
    const url = URL.createObjectURL(await response.blob())
    try {
      const photo = new Image()
      photo.src = url
      await photo.decode()
      if (controller.signal.aborted || getFirebaseBridge()?.auth.currentUser !== account) return
      const size = 160
      const canvas = document.createElement('canvas')
      canvas.width = canvas.height = size
      const side = Math.min(photo.naturalWidth, photo.naturalHeight)
      canvas.getContext('2d')?.drawImage(photo, (photo.naturalWidth - side) / 2, (photo.naturalHeight - side) / 2,
        side, side, 0, 0, size, size)
      image.value = canvas.toDataURL('image/jpeg', 0.82)
    } finally {
      URL.revokeObjectURL(url)
    }
  }).catch(() => {})
}
