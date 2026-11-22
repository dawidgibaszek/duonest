import { Capacitor, registerPlugin, type PluginListenerHandle } from '@capacitor/core'
import { onBeforeUnmount, onMounted, readonly, ref, watch } from 'vue'
import { getFirebaseBridge } from '~/composables/useFirebaseBridge'

interface DuoDiagnosticsPlugin {
  getState(): Promise<{ enabled: boolean }>
  setEnabled(options: { enabled: boolean }): Promise<void>
  getReports(): Promise<{ reports: { id: string }[] }>
  acknowledge(options: { ids: string[] }): Promise<void>
  addListener(event: 'reportsAvailable', handler: () => void): Promise<PluginListenerHandle>
  markReady?(): Promise<void>
}

const metricKit = registerPlugin<DuoDiagnosticsPlugin>('DuoMetricKit')
const androidDiagnostics = registerPlugin<DuoDiagnosticsPlugin>('DuoAndroidDiagnostics')
const enabled = ref(false)

export function useDuoDiagnostics() {
  const isAndroid = Capacitor.getPlatform() === 'android'
  const platform = isAndroid ? 'android' : 'ios'
  const plugin = isAndroid ? androidDiagnostics : metricKit
  const available = Capacitor.isNativePlatform() &&
    Capacitor.isPluginAvailable(isAndroid ? 'DuoAndroidDiagnostics' : 'DuoMetricKit')

  async function setEnabled(value: boolean) {
    await plugin.setEnabled({ enabled: value })
    enabled.value = value
  }

  return { available, platform, enabled: readonly(enabled), setEnabled, plugin }
}

export function useDuoDiagnosticsUpload(canUpload: () => boolean) {
  const { available, platform, plugin } = useDuoDiagnostics()
  if (!available) return

  let uploading = false
  let disposed = false
  let listener: PluginListenerHandle | undefined

  async function upload() {
    if (disposed || uploading || !enabled.value || !canUpload()) return
    uploading = true
    try {
      // Each batch holds at most eight reports, with up to 24 kept on the device.
      for (let batch = 0; batch < 3 && enabled.value && canUpload(); batch++) {
        const { reports } = await plugin.getReports()
        if (!reports.length || disposed || !enabled.value || !canUpload()) break
        await getFirebaseBridge().callApi('/api/diagnostics/' + platform, { reports })
        await plugin.acknowledge({ ids: reports.map(report => report.id) })
      }
    } catch {
      // Leave the queue intact and retry after the next foreground or network change.
    } finally {
      uploading = false
    }
  }

  watch([enabled, canUpload], () => { void upload() })

  onMounted(async () => {
    try {
      if (platform === 'android') await plugin.markReady?.()
      enabled.value = (await plugin.getState()).enabled
      if (platform === 'ios') {
        const handle = await plugin.addListener('reportsAvailable', () => { void upload() })
        if (disposed) void handle.remove()
        else listener = handle
      }
      void upload()
    } catch {
      // Diagnostics never block the app if the native bridge is unavailable.
    }
  })

  onBeforeUnmount(() => {
    disposed = true
    void listener?.remove()
  })
}
