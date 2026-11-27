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
        CAPPluginMethod(name: "refreshLocation", returnType: CAPPluginReturnPromise),
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
    private var lastLiveStrokeAt: Date?

    @objc func setSession(_ call: CAPPluginCall) {
        let session = DoodleWidgetSession(json: call.options as? [String: Any] ?? [:])
        if session == nil && call.getString("uid") != nil {
            call.reject("Incomplete widget session")
            return
        }
        let previous = store.session()
        if session?.sameAccount(previous) != true { resetLiveStrokes() }
        store.setSession(session)
        if session != nil {
            let partnerName = call.getString("partnerName") ?? ""
            store.update { $0.partnerName = partnerName }
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

    @objc func refreshLocation(_ call: CAPPluginCall) {
        Task {
            _ = await LocationWidgetSync.refresh()
            WidgetCenter.shared.reloadTimelines(ofKind: LocationWidgetConfig.kind)
            call.resolve()
        }
    }

    @objc func setDoodle(_ call: CAPPluginCall) {
        let doodle = DoodleWidgetDoodle(json: call.options["doodle"] as? [String: Any])
        if doodle == nil && call.getBool("verifyEmpty") == true {
            // The timeline verifies the saved drawing with the server after initial hydration.
            DoodleWidgetReloader.reload()
            call.resolve()
            return
        }
        let finishDrawing = call.getBool("finishDrawing") == true
        var changed = false
        store.update { state in
            if let cached = state.doodle, let incoming = doodle, cached.isNewer(than: incoming) { return }
            changed = state.doodle?.id != doodle?.id || state.doodle?.updatedAt != doodle?.updatedAt
            if changed || doodle == nil { state.liveStrokes = [] }
            if (changed && finishDrawing) || doodle == nil { state.partnerDrawingUntil = nil }
            state.doodle = doodle
        }
        if changed || doodle == nil {
            resetLiveStrokes()
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
            lastLiveStrokeAt = Date()
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
        resetLiveStrokes()
        scheduleReload()
        call.resolve()
    }

    @objc func setPartnerDrawing(_ call: CAPPluginCall) {
        let isDrawing = call.getBool("isDrawing") ?? false
        if !isDrawing { liveQueue.sync { lastLiveStrokeAt = nil } }
        store.update { state in
            state.partnerDrawingUntil = isDrawing
                ? max(state.partnerDrawingUntil ?? .distantPast, Date().addingTimeInterval(Self.liveDrawing))
                : nil
        }
        scheduleReload()
        call.resolve()
    }

    private func resetLiveStrokes() {
        liveQueue.sync {
            liveStrokes = []
            lastLiveStrokeAt = nil
        }
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
            self.liveQueue.sync {
                self.store.update { state in
                    state.liveStrokes = self.liveStrokes
                    if let until = self.lastLiveStrokeAt?.addingTimeInterval(Self.liveDrawing), until > Date() {
                        state.partnerDrawingUntil = max(state.partnerDrawingUntil ?? .distantPast, until)
                    }
                }
            }
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
        case "DOODLE_DRAWING_STOP":
            store.update {
                $0.partnerDrawingUntil = nil
                $0.liveStrokes = []
            }
            WidgetCenter.shared.reloadTimelines(ofKind: DoodleWidgetConfig.kind)
            completion(.newData)
        case "DOODLE_SAVE", "DOODLE_CLEAR":
            store.update {
                $0.partnerDrawingUntil = nil
                $0.liveStrokes = []
            }
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
