import { getDuoFirebase } from '~/utils/firebaseInstance'

export function useFirebase() {
  return getDuoFirebase(useRuntimeConfig().public)
}
