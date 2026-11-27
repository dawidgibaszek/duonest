import Foundation
import UIKit
import WidgetKit

enum LocationWidgetConfig {
    static let kind = "DuoPartnerLocationWidget"
}

struct PartnerLocation: Codable {
    let latitude: Double
    let longitude: Double
    let accuracy: Double
    let captured_at: Double
    let expires_at: Double?
    let address: [String: String]

    var date: Date { Date(timeIntervalSince1970: captured_at / 1000) }
    var expires: Date {
        let maxAge = date.addingTimeInterval(24 * 60 * 60)
        guard let expires_at else { return maxAge }
        return min(maxAge, Date(timeIntervalSince1970: expires_at / 1000))
    }
    var label: String {
        let street = [address["street"], address["number"]].compactMap { $0 }.filter { !$0.isEmpty }.joined(separator: " ")
        let parts = [street, address["city"] ?? "", address["country"] ?? ""].filter { !$0.isEmpty }
        return parts.isEmpty ? "Adres niedostępny" : parts.joined(separator: ", ")
    }
}

enum LocationWidgetSync {
    private struct Response: Decodable {
        let partnerName: String?
        let location: PartnerLocation?
    }

    static func refresh() async -> DoodleWidgetState? {
        let store = DoodleWidgetStore.shared
        guard let session = store.session(), let credential = session.credential else { return nil }
        let previousCapturedAt = store.state().location?.captured_at
        var request = URLRequest(url: URL(string: "https://duonestapp.pl/api/widget/location")!,
                                 cachePolicy: .reloadIgnoringLocalCacheData, timeoutInterval: 8)
        request.setValue("Bearer \(credential)", forHTTPHeaderField: "Authorization")
        do {
            let (data, response) = try await URLSession.shared.data(for: request)
            let status = (response as? HTTPURLResponse)?.statusCode
            if status == 401 || status == 403 || status == 426 {
                store.invalidateReadAccess(session)
                return store.state()
            }
            guard status == 200 else {
                store.markLocationRefreshFailed(session: session)
                return nil
            }
            let body = try JSONDecoder().decode(Response.self, from: data)
            return store.applyLocation(body.location, name: body.partnerName ?? store.state().partnerName, session: session, previousCapturedAt: previousCapturedAt)
        } catch {
            store.markLocationRefreshFailed(session: session)
            return nil
        }
    }
}

enum LocationWidgetPush {
    static func handle(_ userInfo: [AnyHashable: Any], completion: @escaping (UIBackgroundFetchResult) -> Void) -> Bool {
        guard userInfo["widget"] as? String == "location" else { return false }
        guard let session = DoodleWidgetStore.shared.session(),
              userInfo["recipientProfileId"] as? String == session.profileId else {
            completion(.noData)
            return true
        }
        Task {
            let refreshed = await LocationWidgetSync.refresh()
            WidgetCenter.shared.reloadTimelines(ofKind: LocationWidgetConfig.kind)
            completion(refreshed == nil ? .failed : .newData)
        }
        return true
    }
}
