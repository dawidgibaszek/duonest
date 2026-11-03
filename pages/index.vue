<script setup lang="ts">
const { isAuthenticated, isPaired, initializeClientState } = useDuoState()
initializeClientState()

if (!isAuthenticated.value) {
  await navigateTo('/login', { replace: true })
} else if (!isPaired.value) {
  await navigateTo('/pairing', { replace: true })
} else {
  await navigateTo('/tabs/nest', { replace: true })
}
</script>

<template>
  <div></div>
</template>
