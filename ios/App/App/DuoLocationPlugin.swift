import Capacitor
import CoreLocation
import UIKit
import Security
import WidgetKit

@objc(DuoLocationPlugin)
final class DuoLocationPlugin: CAPPlugin, CAPBridgedPlugin, CLLocationManagerDelegate {
    static let shared = DuoLocationPlugin()

    let identifier = "DuoLocationPlugin"
    let jsName = "DuoLocation"
    let pluginMethods: [CAPPluginMethod] = [
        CAPPluginMethod(name: "start", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "stop", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "status", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "locate", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "openSettings", returnType: CAPPluginReturnPromise)
    ]

    private lazy var manager: CLLocationManager = {
        let manager = CLLocationManager()
        manager.delegate = self
        manager.desiredAccuracy = kCLLocationAccuracyNearestTenMeters
        manager.distanceFilter = 25
        return manager
    }()
    private let geocoder = CLGeocoder()
    private let lookupGeocoder = CLGeocoder()
    private var token: String?
    private var pending: CAPPluginCall?
    private var lastSent = Date.distantPast
    private var upload: URLSessionDataTask?
    private var backgroundTask: UIBackgroundTaskIdentifier = .invalid

    // Significant-change delivery can relaunch the process after system termination.
    // iOS does not promise delivery after the user force-quits the app.
    func restoreSharing() {
        guard UserDefaults.standard.bool(forKey: "duonest.location.opted-in"),
              manager.authorizationStatus == .authorizedAlways,
              let data = savedToken(), let saved = String(data: data, encoding: .utf8), !saved.isEmpty else { return }
        token = saved
        manager.allowsBackgroundLocationUpdates = true
        manager.showsBackgroundLocationIndicator = true
        manager.pausesLocationUpdatesAutomatically = false
        manager.startMonitoringSignificantLocationChanges()
        manager.startUpdatingLocation()
    }

    private var tokenQuery: [String: Any] {
        [kSecClass as String: kSecClassGenericPassword,
         kSecAttrService as String: "com.belka.duonest.location",
         kSecAttrAccount as String: "sharing-grant"]
    }

    private func savedToken() -> Data? {
        var query = tokenQuery
        query[kSecReturnData as String] = true
        query[kSecMatchLimit as String] = kSecMatchLimitOne
        var item: CFTypeRef?
        guard SecItemCopyMatching(query as CFDictionary, &item) == errSecSuccess else { return nil }
        return item as? Data
    }

    private func saveToken(_ value: String?) {
        SecItemDelete(tokenQuery as CFDictionary)
        UserDefaults.standard.set(false, forKey: "duonest.location.opted-in")
        guard let value else { return }
        var query = tokenQuery
        query[kSecValueData as String] = Data(value.utf8)
        query[kSecAttrAccessible as String] = kSecAttrAccessibleAfterFirstUnlockThisDeviceOnly
        if SecItemAdd(query as CFDictionary, nil) == errSecSuccess {
            UserDefaults.standard.set(true, forKey: "duonest.location.opted-in")
        }
    }

    @objc func start(_ call: CAPPluginCall) {
        DispatchQueue.main.async {
            guard let token = call.getString("token"), !token.isEmpty else {
                call.reject("Brak sesji udostępniania.")
                return
            }
            self.withPermission(call) {
                if self.token != token { self.stopSharing() }
                self.token = token
                self.saveToken(token)
                self.lastSent = .distantPast
                self.manager.allowsBackgroundLocationUpdates = true
                self.manager.showsBackgroundLocationIndicator = true
                self.manager.pausesLocationUpdatesAutomatically = false
                self.manager.startUpdatingLocation()
                if self.manager.authorizationStatus == .authorizedAlways { self.manager.startMonitoringSignificantLocationChanges() }
                if self.manager.authorizationStatus == .authorizedWhenInUse && call.getBool("requestBackground") == true {
                    self.manager.requestAlwaysAuthorization()
                }
                call.resolve()
            }
        }
    }

    private func permissionState() -> String {
        switch manager.authorizationStatus {
        case .authorizedAlways: return "always"
        case .authorizedWhenInUse: return "whenInUse"
        case .denied, .restricted: return "denied"
        case .notDetermined: return "prompt"
        @unknown default: return "prompt"
        }
    }

    @objc func status(_ call: CAPPluginCall) {
        DispatchQueue.main.async {
            call.resolve([
                "active": self.token != nil,
                "permission": self.permissionState()
            ])
        }
    }

    @objc func openSettings(_ call: CAPPluginCall) {
        DispatchQueue.main.async {
            guard let url = URL(string: UIApplication.openSettingsURLString) else {
                call.reject("Nie udało się otworzyć ustawień aplikacji.")
                return
            }
            UIApplication.shared.open(url, options: [:]) { opened in
                if opened { call.resolve() }
                else { call.reject("Nie udało się otworzyć ustawień aplikacji.") }
            }
        }
    }

    @objc func stop(_ call: CAPPluginCall) {
        DispatchQueue.main.async {
            let pending = self.permissionCall
            self.permissionCall = nil
            self.permissionAction = nil
            self.stopSharing()
            pending?.reject("Anulowano dostęp do lokalizacji.")
            call.resolve()
        }
    }

    @objc func locate(_ call: CAPPluginCall) {
        DispatchQueue.main.async {
            self.withPermission(call) {
                self.pending = call
                if let recent = self.manager.location, abs(recent.timestamp.timeIntervalSinceNow) < 20 {
                    self.finishLookup(recent)
                } else if self.token == nil {
                    self.manager.requestLocation()
                }
                DispatchQueue.main.asyncAfter(deadline: .now() + 20) {
                    if self.pending === call {
                        self.pending = nil
                        call.reject("Nie udało się ustalić pozycji.")
                    }
                }
            }
        }
    }

    private var permissionAction: (() -> Void)?
    private var permissionCall: CAPPluginCall?

    private func withPermission(_ call: CAPPluginCall, action: @escaping () -> Void) {
        switch manager.authorizationStatus {
        case .authorizedAlways, .authorizedWhenInUse: action()
        case .notDetermined:
            guard permissionCall == nil else { call.reject("Trwa prośba o dostęp do lokalizacji."); return }
            permissionCall = call
            permissionAction = action
            manager.requestWhenInUseAuthorization()
        default: call.reject("Włącz dostęp do lokalizacji w ustawieniach telefonu.")
        }
    }

    func locationManagerDidChangeAuthorization(_ manager: CLLocationManager) {
        guard manager.authorizationStatus != .notDetermined else { return }
        let call = permissionCall
        let action = permissionAction
        permissionCall = nil
        permissionAction = nil
        if manager.authorizationStatus == .authorizedAlways || manager.authorizationStatus == .authorizedWhenInUse {
            if token != nil && manager.authorizationStatus == .authorizedAlways { manager.startMonitoringSignificantLocationChanges() }
            action?()
        } else {
            stopSharing()
            call?.reject("Włącz dostęp do lokalizacji w ustawieniach telefonu.")
        }
    }

    func locationManager(_ manager: CLLocationManager, didFailWithError error: Error) {
        if (error as? CLError)?.code == .locationUnknown { return }
        pending?.reject("Nie udało się ustalić pozycji.")
        pending = nil
        if (error as? CLError)?.code == .denied { stopSharing() }
    }

    func locationManager(_ manager: CLLocationManager, didUpdateLocations locations: [CLLocation]) {
        guard let fix = locations.last, fix.horizontalAccuracy >= 0,
              abs(fix.timestamp.timeIntervalSinceNow) < 60 else { return }
        finishLookup(fix)
        guard let token, upload == nil, !geocoder.isGeocoding, Date().timeIntervalSince(lastSent) >= 18 else { return }
        lastSent = Date()
        backgroundTask = UIApplication.shared.beginBackgroundTask { [weak self] in self?.endBackgroundTask() }
        geocoder.reverseGeocodeLocation(fix, preferredLocale: Locale(identifier: "pl_PL")) { [weak self] places, _ in
            DispatchQueue.main.async {
                guard let self, self.token == token else { return }
                self.send(self.payload(fix, places?.first), token: token)
            }
        }
    }

    private func finishLookup(_ fix: CLLocation) {
        guard let call = pending else { return }
        pending = nil
        lookupGeocoder.reverseGeocodeLocation(fix, preferredLocale: Locale(identifier: "pl_PL")) { [weak self] places, _ in
            guard let self else { call.reject("Lokalizacja niedostępna."); return }
            call.resolve(self.payload(fix, places?.first))
        }
    }

    private func payload(_ fix: CLLocation, _ place: CLPlacemark?) -> [String: Any] {
        [
            "latitude": fix.coordinate.latitude,
            "longitude": fix.coordinate.longitude,
            "accuracy": fix.horizontalAccuracy,
            "captured_at": fix.timestamp.timeIntervalSince1970 * 1000,
            "address": [
                "street": place?.thoroughfare ?? "",
                "number": place?.subThoroughfare ?? "",
                "city": place?.locality ?? place?.subAdministrativeArea ?? "",
                "country": place?.country ?? ""
            ]
        ]
    }

    private func send(_ body: [String: Any], token: String) {
        guard let url = URL(string: "https://duonestapp.pl/api/location/update"),
              let data = try? JSONSerialization.data(withJSONObject: body) else { endBackgroundTask(); return }
        var request = URLRequest(url: url, timeoutInterval: 12)
        request.httpMethod = "POST"
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        request.setValue("Bearer \(token)", forHTTPHeaderField: "Authorization")
        request.httpBody = data
        upload = URLSession.shared.dataTask(with: request) { [weak self] _, response, _ in
            DispatchQueue.main.async {
                guard let self, self.token == token else { return }
                self.upload = nil
                self.endBackgroundTask()
                if (response as? HTTPURLResponse)?.statusCode == 401 { self.stopSharing() }
                else if (response as? HTTPURLResponse)?.statusCode == 200 {
                    Task {
                        _ = await LocationWidgetSync.refresh()
                        WidgetCenter.shared.reloadTimelines(ofKind: LocationWidgetConfig.kind)
                    }
                }
            }
        }
        upload?.resume()
    }

    private func endBackgroundTask() {
        if backgroundTask != .invalid {
            UIApplication.shared.endBackgroundTask(backgroundTask)
            backgroundTask = .invalid
        }
    }

    private func stopSharing() {
        token = nil
        saveToken(nil)
        manager.stopMonitoringSignificantLocationChanges()
        manager.stopUpdatingLocation()
        manager.allowsBackgroundLocationUpdates = false
        geocoder.cancelGeocode()
        upload?.cancel()
        upload = nil
        endBackgroundTask()
    }
}
