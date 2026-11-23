import Capacitor
import Foundation
import UIKit
import WidgetKit

/// Bridge for plugins/native-widget.client.ts: the running app streams doodle state to the widget.
@objc(DuoWidgetPlugin)
final class DuoWidgetPlugin: CAPPlugin, CAPBridgedPlugin {
    let identifier = "DuoWidgetPlugin"
    let jsName = "DuoWidget"
    let pluginMethods: [CAPPluginMethod] = [
        CAPPluginMethod(name: "setSession", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "setPartnerLocation", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "setDoodle", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "addLiveStroke", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "clearLiveStrokes", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "setPartnerDrawing", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "hasReadAccess", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "getPushToken", returnType: CAPPluginReturnPromise)
    ]

    // Matches the 3.5 s drawing timeout in useRealtimeSync.ts, with slack for a suspended app.
    private static let liveDrawing: TimeInterval = 15

    private let store = DoodleWidgetStore.shared
    private let liveQueue = DispatchQueue(label: "com.belka.duonest.widget-live")
    private var liveStrokes: [DoodleStroke] = []

    @objc func setSession(_ call: CAPPluginCall) {
        let session = DoodleWidgetSession(json: call.options as? [String: Any] ?? [:])
        let previous = store.session()
        store.setSession(session)
        if session != nil {
            let partnerName = call.getString("partnerName") ?? ""
            store.update { $0.partnerName = partnerName }
        } else {
            liveQueue.sync { liveStrokes = [] }
        }
        if store.session() != previous {
            scheduleReload()
            WidgetCenter.shared.reloadTimelines(ofKind: LocationWidgetConfig.kind)
            if session != nil {
                Task {
                    _ = await LocationWidgetSync.refresh()
                    WidgetCenter.shared.reloadTimelines(ofKind: LocationWidgetConfig.kind)
                }
            }
        }
        call.resolve()
    }

    @objc func setPartnerLocation(_ call: CAPPluginCall) {
        guard let session = store.session(),
              session.uid == call.getString("uid"), session.partnershipId == call.getString("partnershipId") else {
            call.reject("Sesja widgetu zmieniła się.")
            return
        }
        if let input = call.getObject("location"),
           let data = try? JSONSerialization.data(withJSONObject: input),
           let location = try? JSONDecoder().decode(PartnerLocation.self, from: data),
           location.latitude.isFinite, abs(location.latitude) <= 90,
           location.longitude.isFinite, abs(location.longitude) <= 180,
           location.accuracy.isFinite, location.accuracy >= 0,
           location.captured_at.isFinite, location.expires > Date() {
            let previous = store.state()
            // A delayed WebView callback cannot overwrite a more recent background fix.
            if (previous.location?.captured_at ?? 0) <= location.captured_at {
                _ = store.applyLocation(location, name: previous.partnerName, session: session,
                                        previousCapturedAt: previous.location?.captured_at)
                WidgetCenter.shared.reloadTimelines(ofKind: LocationWidgetConfig.kind)
            }
            call.resolve()
        } else {
            // An unresolved Firestore listener also starts with nil; verify absence on the server.
            Task {
                _ = await LocationWidgetSync.refresh()
                WidgetCenter.shared.reloadTimelines(ofKind: LocationWidgetConfig.kind)
                call.resolve()
            }
        }
    }

    @objc func setDoodle(_ call: CAPPluginCall) {
        let doodle = DoodleWidgetDoodle(json: call.options["doodle"] as? [String: Any])
        var changed = false
        store.update { state in
            if let cached = state.doodle, let incoming = doodle, cached.isNewer(than: incoming) { return }
            changed = state.doodle?.id != doodle?.id || state.doodle?.updatedAt != doodle?.updatedAt
            if changed { state.liveStrokes = [] }
            state.doodle = doodle
        }
        if changed {
            liveQueue.sync { liveStrokes = [] }
            scheduleReload()
        }
        call.resolve()
    }

    @objc func addLiveStroke(_ call: CAPPluginCall) {
        guard let stroke = DoodleStroke(json: call.options["stroke"]) else {
            call.reject("Invalid stroke")
            return
        }
        liveQueue.sync {
            if let last = liveStrokes.last, last.isContinued(by: stroke) {
                liveStrokes[liveStrokes.count - 1] = stroke
            } else {
                liveStrokes.append(stroke)
            }
        }
        scheduleReload()
        call.resolve()
    }

    @objc func clearLiveStrokes(_ call: CAPPluginCall) {
        liveQueue.sync { liveStrokes = [] }
        scheduleReload()
        call.resolve()
    }

    @objc func setPartnerDrawing(_ call: CAPPluginCall) {
        let isDrawing = call.getBool("isDrawing") ?? false
        store.update { $0.partnerDrawingUntil = isDrawing ? Date().addingTimeInterval(Self.liveDrawing) : nil }
        scheduleReload()
        call.resolve()
    }

    @objc func hasReadAccess(_ call: CAPPluginCall) {
        let session = store.session()
        call.resolve(["valid": session?.credential != nil &&
                      session?.uid == call.getString("uid") &&
                      session?.partnershipId == call.getString("partnershipId")])
    }

    @objc func getPushToken(_ call: CAPPluginCall) {
        guard let push = store.pushToken() else {
            call.resolve([:])
            return
        }
        call.resolve(["token": push.token, "environment": push.environment])
    }

    /// Live strokes are written together with the throttled reload instead of on every broadcast.
    private func scheduleReload() {
        DoodleWidgetReloader.reload { [weak self] in
            guard let self else { return }
            let live = self.liveQueue.sync { self.liveStrokes }
            self.store.update { $0.liveStrokes = live }
        }
    }
}

/// Coalesces bursts of updates into at most one timeline reload per second.
enum DoodleWidgetReloader {
    private static let queue = DispatchQueue(label: "com.belka.duonest.widget-reload")
    private static let interval: TimeInterval = 1
    private static var pending = false
    private static var lastReload = Date.distantPast
    private static var beforeReload: (() -> Void)?

    static func reload(before: (() -> Void)? = nil) {
        queue.async {
            if let before { beforeReload = before }
            guard !pending else { return }
            pending = true
            let delay = max(0, lastReload.addingTimeInterval(interval).timeIntervalSinceNow)
            queue.asyncAfter(deadline: .now() + delay) {
                pending = false
                lastReload = Date()
                beforeReload?()
                beforeReload = nil
                WidgetCenter.shared.reloadTimelines(ofKind: DoodleWidgetConfig.kind)
            }
        }
    }
}

/// Silent push sent by pushCore.ts to the partner's devices when they draw or save.
enum DoodleWidgetPush {
    private static let drawingDuration: TimeInterval = 60

    /// Returns false for messages that are not meant for the widget.
    static func handle(_ userInfo: [AnyHashable: Any], completion: @escaping (UIBackgroundFetchResult) -> Void) -> Bool {
        guard userInfo["widget"] as? String == "doodle" else { return false }
        let store = DoodleWidgetStore.shared
        guard let session = store.session() else {
            completion(.noData)
            return true
        }
        if let recipient = userInfo["recipientProfileId"] as? String, !session.profileId.isEmpty, recipient != session.profileId {
            completion(.noData)
            return true
        }
        if let name = userInfo["senderName"] as? String, !name.isEmpty {
            store.update { $0.partnerName = name }
        }

        switch userInfo["action"] as? String {
        case "DOODLE_DRAWING_STATUS":
            store.update { $0.partnerDrawingUntil = Date().addingTimeInterval(drawingDuration) }
            WidgetCenter.shared.reloadTimelines(ofKind: DoodleWidgetConfig.kind)
            completion(.newData)
        case "DOODLE_SAVE", "DOODLE_CLEAR":
            store.update { $0.partnerDrawingUntil = nil }
            Task {
                let refreshed = await DoodleWidgetSync.refresh()
                WidgetCenter.shared.reloadTimelines(ofKind: DoodleWidgetConfig.kind)
                completion(refreshed != nil ? .newData : .failed)
            }
        default:
            completion(.noData)
        }
        return true
    }
}
