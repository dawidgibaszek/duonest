import Darwin
import Foundation
import UIKit

// Compiled into both the app and the DuoNestWidget extension; they share state through the App Group.

enum DoodleWidgetConfig {
    static let appGroup = "group.com.belka.duonest"
    static let kind = "DuoDoodleWidget"
}

/// One stroke of the shared doodle; points are normalized x,y pairs in 0...1 (same shape as DuoDoodleStroke).
struct DoodleStroke: Codable, Equatable {
    var points: [Double]
    var color: String
    var width: Double
    var isEraser: Bool

    /// Mirrors normalizeStroke() in useRealtimeSync.ts.
    init?(json: Any?) {
        guard let raw = json as? [String: Any],
              let rawPoints = raw["points"] as? [Any],
              let color = raw["color"] as? String,
              let width = ((raw["width"] ?? raw["size"]) as? NSNumber)?.doubleValue else { return nil }
        guard rawPoints.count >= 2, rawPoints.count <= 100_000, rawPoints.count % 2 == 0,
              color.range(of: "^#[0-9a-fA-F]{6}$", options: .regularExpression) != nil,
              width.isFinite, width > 0, width <= 100 else { return nil }
        var points: [Double] = []
        points.reserveCapacity(rawPoints.count)
        for value in rawPoints {
            guard let number = (value as? NSNumber)?.doubleValue, number.isFinite, number >= 0, number <= 1 else { return nil }
            points.append(number)
        }
        self.points = points
        self.color = color
        self.width = width
        self.isEraser = (raw["isEraser"] as? Bool) == true
    }

    /// Partner broadcasts resend the same stroke while it grows.
    func isContinued(by next: DoodleStroke) -> Bool {
        next.isEraser == isEraser && next.width == width &&
            next.color.caseInsensitiveCompare(color) == .orderedSame &&
            next.points.count >= points.count && next.points[0] == points[0] && next.points[1] == points[1]
    }
}

struct DoodleWidgetDoodle: Codable, Equatable {
    var id: String
    var updatedAt: String
    var authorName: String
    var strokes: [DoodleStroke]

    /// Accepts a partnership_doodles row as sent by the web app.
    init?(json: [String: Any]?) {
        guard let json else { return nil }
        id = json["id"] as? String ?? ""
        updatedAt = json["updated_at"] as? String ?? ""
        authorName = json["author_name"] as? String ?? ""
        strokes = (json["strokes"] as? [Any] ?? []).compactMap { DoodleStroke(json: $0) }
    }

    func isNewer(than other: DoodleWidgetDoodle) -> Bool {
        let fractional = Date.ISO8601FormatStyle(includingFractionalSeconds: true)
        let whole = Date.ISO8601FormatStyle()
        func date(_ value: String) -> Date? {
            (try? fractional.parse(value)) ?? (try? whole.parse(value))
        }
        guard let incoming = date(updatedAt), let existing = date(other.updatedAt) else { return false }
        return incoming > existing
    }
}

struct DoodleWidgetSession: Codable, Equatable {
    var uid: String
    var profileId: String
    var partnershipId: String
    var credential: String?

    init?(json: [String: Any]) {
        uid = json["uid"] as? String ?? ""
        profileId = json["profileId"] as? String ?? ""
        partnershipId = json["partnershipId"] as? String ?? ""
        credential = json["credential"] as? String
        if uid.isEmpty || profileId.isEmpty || partnershipId.isEmpty { return nil }
    }

    func sameAccount(_ other: DoodleWidgetSession?) -> Bool {
        other?.uid == uid && other?.partnershipId == partnershipId
    }
}

struct DoodleWidgetState: Codable {
    var doodle: DoodleWidgetDoodle?
    var liveStrokes: [DoodleStroke] = []
    var location: PartnerLocation?
    var locationStatus: String?
    var partnerName = ""
    var partnerDrawingUntil: Date?

    var strokes: [DoodleStroke] { (doodle?.strokes ?? []) + liveStrokes }
}

/// WidgetKit APNs token (iOS 26+); the app uploads it because only the app can pass App Check.
struct DoodleWidgetPushToken: Codable, Equatable {
    var token: String
    var environment: String
}

/// File-backed state shared by the app and WidgetKit.
final class DoodleWidgetStore {
    static let shared = DoodleWidgetStore()

    private let queue = DispatchQueue(label: "com.belka.duonest.widget-store")
    private let directory: URL?

    init(directory: URL? = FileManager.default.containerURL(forSecurityApplicationGroupIdentifier: DoodleWidgetConfig.appGroup)) {
        self.directory = directory
    }

    private var stateURL: URL? { directory?.appendingPathComponent("doodle_widget_state.json") }
    private var sessionURL: URL? { directory?.appendingPathComponent("doodle_widget_session.json") }
    private var pushTokenURL: URL? { directory?.appendingPathComponent("doodle_widget_push.json") }

    func state() -> DoodleWidgetState {
        queue.sync { read(DoodleWidgetState.self, from: stateURL) ?? DoodleWidgetState() }
    }

    func pushToken() -> DoodleWidgetPushToken? {
        queue.sync { read(DoodleWidgetPushToken.self, from: pushTokenURL) }
    }

    func setPushToken(_ token: DoodleWidgetPushToken) {
        queue.sync { write(token, to: pushTokenURL) }
    }

    func session() -> DoodleWidgetSession? {
        queue.sync { read(DoodleWidgetSession.self, from: sessionURL) }
    }

    func update(_ change: (inout DoodleWidgetState) -> Void) {
        withSharedLock {
            var state = read(DoodleWidgetState.self, from: stateURL) ?? DoodleWidgetState()
            change(&state)
            write(state, to: stateURL)
        }
    }

    /// A local session update does not replace an existing read credential for the same nest.
    func setSession(_ next: DoodleWidgetSession?) {
        withSharedLock {
            let current = read(DoodleWidgetSession.self, from: sessionURL)
            guard var next else {
                remove(sessionURL)
                remove(stateURL)
                return
            }
            if next.sameAccount(current) {
                next.credential = next.credential ?? current?.credential
            } else {
                remove(stateURL)
            }
            write(next, to: sessionURL)
        }
    }

    func applyRefresh(_ doodle: DoodleWidgetDoodle?, session: DoodleWidgetSession, previous: DoodleWidgetDoodle?) -> DoodleWidgetState? {
        withSharedLock {
            guard read(DoodleWidgetSession.self, from: sessionURL) == session else { return nil }
            var state = read(DoodleWidgetState.self, from: stateURL) ?? DoodleWidgetState()
            if let existing = state.doodle, let doodle, existing.isNewer(than: doodle) { return state }
            if state.doodle?.id != previous?.id || state.doodle?.updatedAt != previous?.updatedAt {
                // Another process wrote a revision while this request was in flight.
                guard let doodle, let existing = state.doodle, doodle.isNewer(than: existing) else { return state }
            }
            if state.doodle?.id != doodle?.id { state.liveStrokes = [] }
            state.doodle = doodle
            write(state, to: stateURL)
            return state
        }
    }

    func applyLocation(_ location: PartnerLocation?, name: String, session: DoodleWidgetSession, previousCapturedAt: Double?) -> DoodleWidgetState? {
        withSharedLock {
            guard read(DoodleWidgetSession.self, from: sessionURL) == session else { return nil }
            var state = read(DoodleWidgetState.self, from: stateURL) ?? DoodleWidgetState()
            // A newer request in either process may have already applied a fix or a revocation.
            guard state.location?.captured_at == previousCapturedAt else { return state }
            state.location = location
            state.locationStatus = location == nil ? "unavailable" : "available"
            state.partnerName = name
            write(state, to: stateURL)
            return state
        }
    }

    func markLocationRefreshFailed(session: DoodleWidgetSession) {
        withSharedLock {
            guard read(DoodleWidgetSession.self, from: sessionURL) == session else { return }
            var state = read(DoodleWidgetState.self, from: stateURL) ?? DoodleWidgetState()
            state.locationStatus = "failed"
            write(state, to: stateURL)
        }
    }

    func invalidateReadAccess(_ session: DoodleWidgetSession) {
        withSharedLock {
            guard read(DoodleWidgetSession.self, from: sessionURL) == session else { return }
            remove(sessionURL)
            remove(stateURL)
        }
    }

    private func withSharedLock<T>(_ operation: () -> T) -> T {
        queue.sync {
            guard let lockFile = directory?.appendingPathComponent("doodle_widget.lock") else { return operation() }
            let fd = open(lockFile.path, O_CREAT | O_RDWR, S_IRUSR | S_IWUSR)
            guard fd >= 0 else { return operation() }
            defer { close(fd) }
            while flock(fd, LOCK_EX) != 0 {
                if errno != EINTR { return operation() }
            }
            defer { flock(fd, LOCK_UN) }
            return operation()
        }
    }

    private func read<T: Decodable>(_ type: T.Type, from url: URL?) -> T? {
        guard let url, let data = try? Data(contentsOf: url) else { return nil }
        return try? JSONDecoder().decode(type, from: data)
    }

    private func write<T: Encodable>(_ value: T, to url: URL?) {
        guard let url, let data = try? JSONEncoder().encode(value) else { return }
        try? data.write(to: url, options: [.atomic, .completeFileProtectionUntilFirstUserAuthentication])
    }

    private func remove(_ url: URL?) {
        guard let url else { return }
        try? FileManager.default.removeItem(at: url)
    }
}

enum DoodleRenderer {
    // Matches the board in utils/duoDoodle.ts.
    private static let boardSize = CGSize(width: 768, height: 384)

    static func image(strokes: [DoodleStroke]) -> UIImage {
        let format = UIGraphicsImageRendererFormat()
        format.scale = 1
        format.opaque = false
        return UIGraphicsImageRenderer(size: boardSize, format: format).image { context in
            let cg = context.cgContext
            for stroke in strokes {
                draw(stroke, in: cg)
            }
        }
    }

    private static func draw(_ stroke: DoodleStroke, in cg: CGContext) {
        let pts = stroke.points
        guard pts.count >= 2 else { return }
        func point(_ i: Int) -> CGPoint { CGPoint(x: pts[i] * boardSize.width, y: pts[i + 1] * boardSize.height) }

        cg.saveGState()
        defer { cg.restoreGState() }
        let color = stroke.isEraser ? UIColor.black : UIColor(hex: stroke.color.lowercased() == "#ffffff" ? "#0f172a" : stroke.color)
        cg.setBlendMode(stroke.isEraser ? .clear : .normal)
        cg.setStrokeColor(color.cgColor)
        cg.setFillColor(color.cgColor)
        let lineWidth = max(1.5, CGFloat(stroke.width) * boardSize.height / 400)
        cg.setLineWidth(lineWidth)
        cg.setLineCap(.round)
        cg.setLineJoin(.round)

        if pts.count == 2 {
            let center = point(0)
            cg.fillEllipse(in: CGRect(x: center.x - lineWidth / 2, y: center.y - lineWidth / 2, width: lineWidth, height: lineWidth))
            return
        }

        cg.move(to: point(0))
        var i = 2
        while i < pts.count {
            let prev = point(i - 2)
            let curr = point(i)
            cg.addQuadCurve(to: CGPoint(x: (prev.x + curr.x) / 2, y: (prev.y + curr.y) / 2), control: prev)
            i += 2
        }
        cg.addLine(to: point(pts.count - 2))
        cg.strokePath()
    }
}

extension UIColor {
    convenience init(hex: String) {
        let value = UInt32(hex.dropFirst(), radix: 16) ?? 0
        self.init(red: CGFloat((value >> 16) & 0xff) / 255, green: CGFloat((value >> 8) & 0xff) / 255,
                  blue: CGFloat(value & 0xff) / 255, alpha: 1)
    }
}

/// The extension has read-only access to the latest doodle, scoped to its paired account.
enum DoodleWidgetSync {
    private static let endpoint = URL(string: "https://duonestapp.pl/api/widget/doodle")!

    static func refresh() async -> DoodleWidgetState? {
        let store = DoodleWidgetStore.shared
        guard let session = store.session(), let credential = session.credential else { return nil }
        let previous = store.state().doodle
        var request = URLRequest(url: endpoint, cachePolicy: .reloadIgnoringLocalCacheData, timeoutInterval: 8)
        request.setValue("Bearer \(credential)", forHTTPHeaderField: "Authorization")
        do {
            let (data, response) = try await URLSession.shared.data(for: request)
            let status = (response as? HTTPURLResponse)?.statusCode
            if status == 401 || status == 403 || status == 426 {
                store.invalidateReadAccess(session)
                return store.state()
            }
            guard status == 200,
                  let body = try JSONSerialization.jsonObject(with: data) as? [String: Any],
                  body.keys.contains("doodle") else { return nil }
            let doodle = DoodleWidgetDoodle(json: body["doodle"] as? [String: Any])
            return store.applyRefresh(doodle, session: session, previous: previous)
        } catch {
            return nil
        }
    }
}
