import Capacitor
import FirebaseAppCheck
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
        CAPPluginMethod(name: "setDoodle", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "addLiveStroke", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "clearLiveStrokes", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "setPartnerDrawing", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "getPushToken", returnType: CAPPluginReturnPromise)
    ]

    // Matches the 3.5 s drawing timeout in useRealtimeSync.ts, with slack for a suspended app.
    private static let liveDrawing: TimeInterval = 15

    private let store = DoodleWidgetStore.shared
    private let liveQueue = DispatchQueue(label: "com.belka.duonest.widget-live")
    private var liveStrokes: [DoodleStroke] = []

    @objc func setSession(_ call: CAPPluginCall) {
        let session = DoodleWidgetSession(json: call.options as? [String: Any] ?? [:])
        store.setSession(session)
        if session != nil {
            let partnerName = call.getString("partnerName") ?? ""
            store.update { $0.partnerName = partnerName }
            Task { _ = await DoodleWidgetAppCheck.token() }
        } else {
            liveQueue.sync { liveStrokes = [] }
        }
        scheduleReload()
        call.resolve()
    }

    @objc func setDoodle(_ call: CAPPluginCall) {
        let doodle = DoodleWidgetDoodle(json: call.options["doodle"] as? [String: Any])
        var changed = false
        store.update { state in
            changed = state.doodle?.id != doodle?.id || state.doodle?.updatedAt != doodle?.updatedAt
            if changed { state.liveStrokes = [] }
            state.doodle = doodle
            state.lastFetchAt = Date()
        }
        if changed { liveQueue.sync { liveStrokes = [] } }
        scheduleReload()
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

enum DoodleWidgetAppCheck {
    /// Also cached in the App Group so the widget extension can use it until it expires.
    static func token() async -> String? {
        await withCheckedContinuation { continuation in
            AppCheck.appCheck().token(forcingRefresh: false) { token, _ in
                if let token {
                    DoodleWidgetStore.shared.update { state in
                        state.appCheckToken = token.token
                        state.appCheckExpiresAt = token.expirationDate
                    }
                }
                continuation.resume(returning: token?.token)
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
        case "DOODLE_SAVE":
            store.update { $0.partnerDrawingUntil = nil }
            Task {
                let appCheck = await DoodleWidgetAppCheck.token()
                let refreshed = await DoodleWidgetSync.refresh(appCheckToken: appCheck)
                WidgetCenter.shared.reloadTimelines(ofKind: DoodleWidgetConfig.kind)
                completion(refreshed ? .newData : .failed)
            }
        default:
            completion(.noData)
        }
        return true
    }
}
