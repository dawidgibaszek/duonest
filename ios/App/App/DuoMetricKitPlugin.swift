import Capacitor
import Foundation

@objc(DuoMetricKitPlugin)
final class DuoMetricKitPlugin: CAPPlugin, CAPBridgedPlugin {
    let identifier = "DuoMetricKitPlugin"
    let jsName = "DuoMetricKit"
    let pluginMethods: [CAPPluginMethod] = [
        CAPPluginMethod(name: "getState", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "setEnabled", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "getReports", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "acknowledge", returnType: CAPPluginReturnPromise)
    ]

    override func load() {
        NotificationCenter.default.addObserver(self, selector: #selector(reportsAvailable(_:)),
                                               name: MetricKitDiagnostics.reportsAvailable, object: nil)
    }

    @objc private func reportsAvailable(_ notification: Notification) {
        notifyListeners("reportsAvailable", data: nil)
    }

    @objc func getState(_ call: CAPPluginCall) {
        call.resolve(["enabled": MetricKitDiagnostics.shared.isEnabled()])
    }

    @objc func setEnabled(_ call: CAPPluginCall) {
        guard let enabled = call.getBool("enabled") else {
            call.reject("Missing diagnostics preference")
            return
        }
        do {
            try MetricKitDiagnostics.shared.setEnabled(enabled)
            call.resolve()
        } catch {
            call.reject("Could not save diagnostics preference")
        }
    }

    @objc func getReports(_ call: CAPPluginCall) {
        do {
            let data = try JSONEncoder().encode(MetricKitDiagnostics.shared.reports())
            let reports = try JSONSerialization.jsonObject(with: data)
            call.resolve(["reports": reports])
        } catch {
            call.reject("Could not read diagnostics")
        }
    }

    @objc func acknowledge(_ call: CAPPluginCall) {
        do {
            try MetricKitDiagnostics.shared.acknowledge(Set(call.getArray("ids", String.self) ?? []))
            call.resolve()
        } catch {
            call.reject("Could not update diagnostics queue")
        }
    }
}

final class DuoBridgeViewController: CAPBridgeViewController {
    override func capacitorDidLoad() {
        super.capacitorDidLoad()
        bridge?.registerPluginInstance(DuoMetricKitPlugin())
        bridge?.registerPluginInstance(DuoWidgetPlugin())
        bridge?.registerPluginInstance(DuoLocationPlugin.shared)
        bridge?.registerPluginInstance(DuoAppleMapsPlugin())
    }
}
