import { Capacitor, registerPlugin, type PluginListenerHandle } from '@capacitor/core'
import { onBeforeUnmount, onMounted, readonly, ref, watch } from 'vue'
import { getFirebaseBridge } from '~/composables/useFirebaseBridge'

interface DuoMetricKitPlugin {
  getState(): Promise<{ enabled: boolean }>
  setEnabled(options: { enabled: boolean }): Promise<void>
  getReports(): Promise<{ reports: { id: string }[] }>
  acknowledge(options: { ids: string[] }): Promise<void>
  addListener(event: 'reportsAvailable', handler: () => void): Promise<PluginListenerHandle>
}

const metricKit = registerPlugin<DuoMetricKitPlugin>('DuoMetricKit')
const enabled = ref(false)

export function useIosDiagnostics() {
  const available = Capacitor.getPlatform() === 'ios' && Capacitor.isPluginAvailable('DuoMetricKit')

  async function setEnabled(value: boolean) {
    await metricKit.setEnabled({ enabled: value })
    enabled.value = value
  }

  return { available, enabled: readonly(enabled), setEnabled }
}

export function useIosDiagnosticsUpload(canUpload: () => boolean) {
  const { available } = useIosDiagnostics()
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
        const { reports } = await metricKit.getReports()
        if (!reports.length || disposed || !enabled.value || !canUpload()) break
        await getFirebaseBridge().callApi('/api/diagnostics/ios', { reports })
        await metricKit.acknowledge({ ids: reports.map(report => report.id) })
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
      enabled.value = (await metricKit.getState()).enabled
      const handle = await metricKit.addListener('reportsAvailable', () => { void upload() })
      if (disposed) void handle.remove()
      else listener = handle
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
