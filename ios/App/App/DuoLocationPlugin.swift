import Capacitor
import CoreLocation
import UIKit

@objc(DuoLocationPlugin)
final class DuoLocationPlugin: CAPPlugin, CAPBridgedPlugin, CLLocationManagerDelegate {
    let identifier = "DuoLocationPlugin"
    let jsName = "DuoLocation"
    let pluginMethods: [CAPPluginMethod] = [
        CAPPluginMethod(name: "start", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "stop", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "status", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "locate", returnType: CAPPluginReturnPromise)
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

    @objc func start(_ call: CAPPluginCall) {
        DispatchQueue.main.async {
            guard let token = call.getString("token"), !token.isEmpty else {
                call.reject("Brak sesji udostępniania.")
                return
            }
            self.withPermission(call) {
                if self.token != token { self.stopSharing() }
                self.token = token
                self.lastSent = .distantPast
                self.manager.allowsBackgroundLocationUpdates = true
                self.manager.showsBackgroundLocationIndicator = true
                self.manager.startUpdatingLocation()
                if self.manager.authorizationStatus == .authorizedWhenInUse && call.getBool("requestBackground") == true {
                    self.manager.requestAlwaysAuthorization()
                }
                call.resolve()
            }
        }
    }

    @objc func status(_ call: CAPPluginCall) {
        DispatchQueue.main.async { call.resolve(["active": self.token != nil]) }
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
        manager.stopUpdatingLocation()
        manager.allowsBackgroundLocationUpdates = false
        geocoder.cancelGeocode()
        upload?.cancel()
        upload = nil
        endBackgroundTask()
    }
}
