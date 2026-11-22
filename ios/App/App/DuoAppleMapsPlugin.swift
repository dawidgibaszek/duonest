import Capacitor
import MapKit
import UIKit

@objc(DuoAppleMapsPlugin)
final class DuoAppleMapsPlugin: CAPPlugin, CAPBridgedPlugin, MKMapViewDelegate {
    let identifier = "DuoAppleMapsPlugin"
    let jsName = "DuoAppleMaps"
    let pluginMethods: [CAPPluginMethod] = [
        CAPPluginMethod(name: "snapshot", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "render", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "remove", returnType: CAPPluginReturnPromise)
    ]

    private let mineColor = UIColor(red: 0.32, green: 0.26, blue: 0.17, alpha: 1)
    private let partnerColor = UIColor(red: 0.14, green: 0.15, blue: 0.18, alpha: 1)
    private var mapId: String?
    private var container: UIView?
    private var map: MKMapView?
    private var fitButton: UIButton?
    private var annotations: [String: MKPointAnnotation] = [:]

    @objc func snapshot(_ call: CAPPluginCall) {
        DispatchQueue.main.async {
            guard let coordinate = self.coordinate(call.getObject("partner")),
                  let width = call.getDouble("width"), let height = call.getDouble("height"),
                  width.isFinite, height.isFinite, width > 0, height > 0 else {
                call.reject("Nieprawidłowe dane podglądu mapy.")
                return
            }

            let options = MKMapSnapshotter.Options()
            let scale = min(1, 720 / width, 320 / height)
            options.size = CGSize(width: width * scale, height: height * scale)
            options.region = MKCoordinateRegion(center: coordinate, latitudinalMeters: 430, longitudinalMeters: 430)
            options.pointOfInterestFilter = .excludingAll
            let displayScale = min(self.webView?.traitCollection.displayScale ?? 2, 2)
            if #available(iOS 17, *) {
                options.traitCollection = UITraitCollection { traits in
                    traits.userInterfaceStyle = .light
                    traits.displayScale = displayScale
                }
            } else {
                options.traitCollection = UITraitCollection(traitsFrom: [
                    UITraitCollection(userInterfaceStyle: .light),
                    UITraitCollection(displayScale: displayScale)
                ])
            }
            let snapshotter = MKMapSnapshotter(options: options)
            snapshotter.start { snapshot, _ in
                guard let snapshot else {
                    call.reject("Podgląd mapy jest chwilowo niedostępny.")
                    return
                }
                let image = UIGraphicsImageRenderer(size: snapshot.image.size, format: snapshot.image.imageRendererFormat).image { _ in
                    snapshot.image.draw(at: .zero)
                    let center = snapshot.point(for: coordinate)
                    UIColor.white.setFill()
                    UIBezierPath(ovalIn: CGRect(x: center.x - 9, y: center.y - 9, width: 18, height: 18)).fill()
                    self.partnerColor.setFill()
                    UIBezierPath(ovalIn: CGRect(x: center.x - 6, y: center.y - 6, width: 12, height: 12)).fill()
                }
                guard let data = image.jpegData(compressionQuality: 0.82) else {
                    call.reject("Podgląd mapy jest chwilowo niedostępny.")
                    return
                }
                call.resolve(["image": "data:image/jpeg;base64," + data.base64EncodedString()])
            }
        }
    }

    @objc func render(_ call: CAPPluginCall) {
        DispatchQueue.main.async {
            guard let id = call.getString("id"),
                  let webView = self.webView,
                  let frame = self.rect(call.getObject("frame")),
                  let clip = self.rect(call.getObject("clip")) else {
                call.reject("Nie udało się wyświetlić mapy.")
                return
            }
            let visible = frame.intersection(clip).intersection(webView.bounds)
            guard !visible.isEmpty else {
                if self.mapId == id { self.container?.isHidden = true }
                call.resolve()
                return
            }

            if self.mapId != id { self.installMap(id: id, webView: webView) }
            self.container?.frame = visible
            self.container?.isHidden = false
            self.map?.frame = frame.offsetBy(dx: -visible.minX, dy: -visible.minY)
            self.fitButton?.frame = CGRect(x: max(0, visible.width - 56), y: 12, width: 44, height: 44)
            self.setPoint("mine", self.coordinate(call.getObject("mine")))
            self.setPoint("partner", self.coordinate(call.getObject("partner")))
            if call.getBool("fit") == true { self.fitPoints() }
            call.resolve()
        }
    }

    @objc func remove(_ call: CAPPluginCall) {
        DispatchQueue.main.async {
            if self.mapId == call.getString("id") { self.clearMap() }
            call.resolve()
        }
    }

    private func coordinate(_ input: JSObject?) -> CLLocationCoordinate2D? {
        guard let lat = input?["latitude"] as? Double, let lng = input?["longitude"] as? Double else { return nil }
        let coordinate = CLLocationCoordinate2D(latitude: lat, longitude: lng)
        return CLLocationCoordinate2DIsValid(coordinate) ? coordinate : nil
    }

    private func rect(_ input: JSObject?) -> CGRect? {
        guard let x = input?["x"] as? Double, let y = input?["y"] as? Double,
              let width = input?["width"] as? Double, let height = input?["height"] as? Double,
              [x, y, width, height].allSatisfy({ $0.isFinite }), width >= 0, height >= 0 else { return nil }
        return CGRect(x: x, y: y, width: width, height: height)
    }

    private func clearMap() {
        container?.removeFromSuperview()
        container = nil
        map = nil
        fitButton = nil
        mapId = nil
        annotations.removeAll()
    }

    private func installMap(id: String, webView: UIView) {
        clearMap()
        let wrapper = UIView()
        wrapper.clipsToBounds = true
        let mapView = MKMapView()
        mapView.delegate = self
        mapView.overrideUserInterfaceStyle = .light
        mapView.isPitchEnabled = false
        mapView.isRotateEnabled = false
        mapView.pointOfInterestFilter = .excludingAll
        mapView.accessibilityLabel = "Mapa Waszych pozycji"
        wrapper.addSubview(mapView)

        let button = UIButton(type: .system)
        button.setImage(UIImage(systemName: "location.viewfinder"), for: .normal)
        button.tintColor = partnerColor
        button.backgroundColor = .white
        button.layer.cornerRadius = 14
        button.accessibilityLabel = "Dopasuj mapę do pozycji"
        button.addTarget(self, action: #selector(fitPoints), for: .touchUpInside)
        wrapper.addSubview(button)
        webView.addSubview(wrapper)
        mapId = id
        container = wrapper
        map = mapView
        fitButton = button
    }

    private func setPoint(_ role: String, _ coordinate: CLLocationCoordinate2D?) {
        guard let coordinate else {
            if let existing = annotations.removeValue(forKey: role) { map?.removeAnnotation(existing) }
            return
        }
        if let existing = annotations[role] {
            if existing.coordinate.latitude != coordinate.latitude || existing.coordinate.longitude != coordinate.longitude {
                existing.coordinate = coordinate
            }
        } else {
            let point = MKPointAnnotation()
            point.title = role == "mine" ? "Twoja pozycja" : "Pozycja drugiej osoby"
            point.coordinate = coordinate
            annotations[role] = point
            map?.addAnnotation(point)
        }
    }

    @objc private func fitPoints() {
        guard let map, let first = annotations.values.first else { return }
        let positions = annotations.values.map { MKMapPoint($0.coordinate) }
        if positions.count < 2 || positions[0].distance(to: positions[1]) < 150 {
            map.setRegion(MKCoordinateRegion(center: first.coordinate, latitudinalMeters: 500, longitudinalMeters: 500), animated: false)
            return
        }
        let bounds = positions.reduce(MKMapRect.null) { rect, point in
            rect.union(MKMapRect(x: point.x, y: point.y, width: 1, height: 1))
        }
        map.setVisibleMapRect(bounds, edgePadding: UIEdgeInsets(top: 56, left: 32, bottom: 40, right: 32), animated: false)
    }

    func mapView(_ mapView: MKMapView, viewFor annotation: MKAnnotation) -> MKAnnotationView? {
        guard let point = annotation as? MKPointAnnotation else { return nil }
        let pin = mapView.dequeueReusableAnnotationView(withIdentifier: "DuoLocation") as? MKMarkerAnnotationView
            ?? MKMarkerAnnotationView(annotation: point, reuseIdentifier: "DuoLocation")
        pin.annotation = point
        let mine = point === annotations["mine"]
        pin.markerTintColor = mine ? mineColor : partnerColor
        pin.glyphImage = UIImage(systemName: mine ? "location.fill" : "person.fill")
        pin.canShowCallout = true
        return pin
    }
}
