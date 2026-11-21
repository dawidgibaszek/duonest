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
}

struct DoodleWidgetSession: Codable, Equatable {
    var uid: String
    var profileId: String
    var partnershipId: String
    var refreshToken: String
    var apiKey: String
    var projectId: String

    init?(json: [String: Any]) {
        func value(_ key: String) -> String { (json[key] as? String) ?? "" }
        uid = value("uid")
        profileId = value("profileId")
        partnershipId = value("partnershipId")
        refreshToken = value("refreshToken")
        apiKey = value("apiKey")
        projectId = value("projectId")
        if uid.isEmpty || partnershipId.isEmpty || refreshToken.isEmpty || apiKey.isEmpty || projectId.isEmpty { return nil }
    }

    func sameAccount(_ other: DoodleWidgetSession?) -> Bool {
        other?.uid == uid && other?.partnershipId == partnershipId
    }
}

struct DoodleWidgetState: Codable {
    var doodle: DoodleWidgetDoodle?
    var liveStrokes: [DoodleStroke] = []
    var partnerName = ""
    var partnerDrawingUntil: Date?
    var lastFetchAt: Date?
    var idToken: String?
    var idTokenExpiresAt: Date?
    var appCheckToken: String?
    var appCheckExpiresAt: Date?

    var strokes: [DoodleStroke] { (doodle?.strokes ?? []) + liveStrokes }
}

/// WidgetKit APNs token (iOS 26+); the app uploads it because only the app can pass App Check.
struct DoodleWidgetPushToken: Codable, Equatable {
    var token: String
    var environment: String
}

/// File-backed state in the App Group container; the session (Firebase refresh token) lives in its own file.
final class DoodleWidgetStore {
    static let shared = DoodleWidgetStore()

    private let queue = DispatchQueue(label: "com.belka.duonest.widget-store")
    private let directory = FileManager.default.containerURL(forSecurityApplicationGroupIdentifier: DoodleWidgetConfig.appGroup)

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
        queue.sync {
            var state = read(DoodleWidgetState.self, from: stateURL) ?? DoodleWidgetState()
            change(&state)
            write(state, to: stateURL)
        }
    }

    /// `nil` signs the widget out and forgets the cached doodle.
    func setSession(_ next: DoodleWidgetSession?) {
        queue.sync {
            let current = read(DoodleWidgetSession.self, from: sessionURL)
            guard let next else {
                remove(sessionURL)
                remove(stateURL)
                return
            }
            if !next.sameAccount(current) { remove(stateURL) }
            write(next, to: sessionURL)
        }
    }

    func replaceRefreshToken(for session: DoodleWidgetSession, with token: String) {
        queue.sync {
            guard var current = read(DoodleWidgetSession.self, from: sessionURL),
                  current.sameAccount(session), current.refreshToken != token else { return }
            current.refreshToken = token
            write(current, to: sessionURL)
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

/// Draws the doodle like the "Wspólny rysunek" preview in pages/tabs/nest.vue (renderPreviewCanvas).
enum DoodleRenderer {
    static func image(strokes: [DoodleStroke], size: CGSize, scale: CGFloat) -> UIImage {
        let format = UIGraphicsImageRendererFormat()
        format.scale = scale
        format.opaque = false
        return UIGraphicsImageRenderer(size: size, format: format).image { context in
            let cg = context.cgContext
            let lineScale = min(size.width, size.height) / 400
            for stroke in strokes {
                draw(stroke, in: cg, size: size, lineScale: lineScale, scale: scale)
            }
        }
    }

    private static func draw(_ stroke: DoodleStroke, in cg: CGContext, size: CGSize, lineScale: CGFloat, scale: CGFloat) {
        let pts = stroke.points
        guard pts.count >= 2 else { return }
        func point(_ i: Int) -> CGPoint { CGPoint(x: pts[i] * size.width, y: pts[i + 1] * size.height) }

        cg.saveGState()
        defer { cg.restoreGState() }
        let color = stroke.isEraser ? UIColor.black : UIColor(hex: stroke.color.lowercased() == "#ffffff" ? "#0f172a" : stroke.color)
        cg.setBlendMode(stroke.isEraser ? .clear : .normal)
        cg.setStrokeColor(color.cgColor)
        cg.setFillColor(color.cgColor)
        let lineWidth = max(1.5 / scale, CGFloat(stroke.width) * lineScale)
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

/// Loads the newest partnership_doodles row with the user's own Firebase session,
/// so the same Firestore security rules apply as in the web app.
enum DoodleWidgetSync {
    enum SyncError: Error { case http(Int), invalidResponse }

    /// Returns false when there is no session or the request failed.
    @discardableResult
    static func refresh(appCheckToken: String?) async -> Bool {
        let store = DoodleWidgetStore.shared
        guard let session = store.session() else { return false }
        do {
            guard let token = try await idToken(for: session) else { return false }
            let doodle = try await fetchLatestDoodle(session: session, idToken: token, appCheckToken: appCheckToken)
            guard session.sameAccount(store.session()) else { return false }
            store.update { state in
                if state.doodle?.id != doodle?.id || state.doodle?.updatedAt != doodle?.updatedAt { state.liveStrokes = [] }
                state.doodle = doodle
                state.lastFetchAt = Date()
            }
            return true
        } catch {
            print("[DuoWidget] refresh failed: \(error)")
            return false
        }
    }

    private static func idToken(for session: DoodleWidgetSession) async throws -> String? {
        let store = DoodleWidgetStore.shared
        let cached = store.state()
        if let token = cached.idToken, let expiry = cached.idTokenExpiresAt, expiry > Date() { return token }

        var components = URLComponents(string: "https://securetoken.googleapis.com/v1/token")!
        components.queryItems = [URLQueryItem(name: "key", value: session.apiKey)]
        var request = URLRequest(url: components.url!, timeoutInterval: 10)
        request.httpMethod = "POST"
        request.setValue("application/x-www-form-urlencoded", forHTTPHeaderField: "Content-Type")
        var form = URLComponents()
        form.queryItems = [URLQueryItem(name: "grant_type", value: "refresh_token"),
                           URLQueryItem(name: "refresh_token", value: session.refreshToken)]
        request.httpBody = form.percentEncodedQuery?.replacingOccurrences(of: "+", with: "%2B").data(using: .utf8)

        let (data, response) = try await URLSession.shared.data(for: request)
        let status = (response as? HTTPURLResponse)?.statusCode ?? 0
        let json = try JSONSerialization.jsonObject(with: data) as? [String: Any]
        if status == 400, let message = (json?["error"] as? [String: Any])?["message"] as? String,
           ["TOKEN_EXPIRED", "USER_DISABLED", "USER_NOT_FOUND", "INVALID_REFRESH_TOKEN"].contains(where: { message.hasPrefix($0) }) {
            // The app hands over a new session at the next sign-in.
            if session.sameAccount(store.session()) { store.setSession(nil) }
            return nil
        }
        guard status == 200, let json, json["user_id"] as? String == session.uid,
              let idToken = json["id_token"] as? String else { throw SyncError.http(status) }

        if let refreshToken = json["refresh_token"] as? String, !refreshToken.isEmpty {
            store.replaceRefreshToken(for: session, with: refreshToken)
        }
        let lifetime = Double(json["expires_in"] as? String ?? "") ?? 3600
        store.update { state in
            state.idToken = idToken
            state.idTokenExpiresAt = Date().addingTimeInterval(max(60, lifetime - 300))
        }
        return idToken
    }

    private static func fetchLatestDoodle(session: DoodleWidgetSession, idToken: String, appCheckToken: String?) async throws -> DoodleWidgetDoodle? {
        let query: [String: Any] = ["structuredQuery": [
            "from": [["collectionId": "partnership_doodles"]],
            "where": ["fieldFilter": [
                "field": ["fieldPath": "partnership_id"],
                "op": "EQUAL",
                "value": ["stringValue": session.partnershipId]
            ]],
            "orderBy": [["field": ["fieldPath": "updated_at"], "direction": "DESCENDING"]],
            "limit": 1
        ]]
        let project = session.projectId.addingPercentEncoding(withAllowedCharacters: .urlPathAllowed) ?? session.projectId
        var request = URLRequest(
            url: URL(string: "https://firestore.googleapis.com/v1/projects/\(project)/databases/(default)/documents:runQuery")!,
            timeoutInterval: 10
        )
        request.httpMethod = "POST"
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        request.setValue("Bearer \(idToken)", forHTTPHeaderField: "Authorization")
        if let appCheckToken { request.setValue(appCheckToken, forHTTPHeaderField: "X-Firebase-AppCheck") }
        request.httpBody = try JSONSerialization.data(withJSONObject: query)

        let (data, response) = try await URLSession.shared.data(for: request)
        let status = (response as? HTTPURLResponse)?.statusCode ?? 0
        guard status == 200 else { throw SyncError.http(status) }
        guard let rows = try JSONSerialization.jsonObject(with: data) as? [[String: Any]] else { throw SyncError.invalidResponse }
        guard let document = rows.compactMap({ $0["document"] as? [String: Any] }).first else { return nil }
        return DoodleWidgetDoodle(json: plainDoodle(from: document))
    }

    /// Converts Firestore REST typed values into the row shape used by the web app.
    private static func plainDoodle(from document: [String: Any]) -> [String: Any] {
        let fields = document["fields"] as? [String: Any] ?? [:]
        func string(_ field: Any?) -> String { (field as? [String: Any])?["stringValue"] as? String ?? "" }
        func number(_ field: Any?) -> Double {
            guard let field = field as? [String: Any] else { return .nan }
            if let value = field["doubleValue"] as? NSNumber { return value.doubleValue }
            if let value = field["integerValue"] as? String { return Double(value) ?? .nan }
            return .nan
        }
        func values(_ field: Any?) -> [Any] {
            ((field as? [String: Any])?["arrayValue"] as? [String: Any])?["values"] as? [Any] ?? []
        }

        let strokes: [[String: Any]] = values(fields["strokes"]).compactMap { value in
            guard let strokeFields = ((value as? [String: Any])?["mapValue"] as? [String: Any])?["fields"] as? [String: Any] else { return nil }
            return [
                "points": values(strokeFields["points"]).map { number($0) },
                "color": string(strokeFields["color"]),
                "width": number(strokeFields["width"]),
                "isEraser": (strokeFields["isEraser"] as? [String: Any])?["booleanValue"] as? Bool ?? false
            ]
        }
        let name = document["name"] as? String ?? ""
        let id = string(fields["id"])
        return [
            "id": id.isEmpty ? String(name.split(separator: "/").last ?? "") : id,
            "updated_at": string(fields["updated_at"]),
            "author_name": string(fields["author_name"]),
            "strokes": strokes
        ]
    }
}
