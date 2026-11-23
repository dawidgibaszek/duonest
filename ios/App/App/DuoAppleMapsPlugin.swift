import Capacitor
import ImageIO
import MapKit
import UIKit

@objc(DuoAppleMapsPlugin)
final class DuoAppleMapsPlugin: CAPPlugin, CAPBridgedPlugin, MKMapViewDelegate {
    let identifier = "DuoAppleMapsPlugin"
    let jsName = "DuoAppleMaps"
    let pluginMethods: [CAPPluginMethod] = [
        CAPPluginMethod(name: "snapshot", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "render", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "remove", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "navigate", returnType: CAPPluginReturnPromise)
    ]

    private let mineColor = UIColor(red: 0.32, green: 0.26, blue: 0.17, alpha: 1)
    private let partnerColor = UIColor(red: 0.14, green: 0.15, blue: 0.18, alpha: 1)
    private var mapId: String?
    private var container: MapSurface?
    private var map: MKMapView?
    private var fitButton: UIButton?
    private var bottomOcclusion: CGFloat = 0
    private var annotations: [String: PersonAnnotation] = [:]
    private let avatars = NSCache<NSURL, UIImage>()

    private final class MapSurface: UIView {
        private var coveredArea: CGRect?
        private var visibleArea = CGRect.zero
        private let viewportMask = CAShapeLayer()

        // Crop the surface without changing MapKit's viewport or camera margins.
        func updateViewport(_ viewport: CGRect, controls: CGRect?) {
            visibleArea = viewport.intersection(frame).offsetBy(dx: -frame.minX, dy: -frame.minY)
            let localControls = controls?.intersection(viewport).offsetBy(dx: -frame.minX, dy: -frame.minY)
            coveredArea = localControls?.isEmpty == false ? localControls : nil
            let path = UIBezierPath(rect: visibleArea)
            if let coveredArea {
                path.append(UIBezierPath(roundedRect: coveredArea, cornerRadius: 24))
            }
            CATransaction.begin()
            CATransaction.setDisableActions(true)
            viewportMask.fillRule = .evenOdd
            viewportMask.path = path.cgPath
            layer.mask = viewportMask
            CATransaction.commit()
        }

        override func point(inside point: CGPoint, with event: UIEvent?) -> Bool {
            visibleArea.contains(point) && coveredArea?.contains(point) != true && super.point(inside: point, with: event)
        }
    }

    private struct Identity: Equatable {
        let name: String
        let avatar: URL?
        let color: String?

        init(_ input: JSObject, fallback: String) {
            let value = (input["name"] as? String)?.trimmingCharacters(in: .whitespacesAndNewlines)
            name = value.flatMap { $0.isEmpty ? nil : String($0.prefix(80)) } ?? fallback
            avatar = (input["avatar"] as? String).flatMap { URL(string: $0) }.flatMap { $0.scheme == "https" ? $0 : nil }
            color = input["color"] as? String
        }
    }

    private final class PersonAnnotation: MKPointAnnotation {
        var identity: Identity
        let fallbackColor: UIColor

        init(identity: Identity, fallbackColor: UIColor) {
            self.identity = identity
            self.fallbackColor = fallbackColor
            super.init()
            title = identity.name
        }
    }

    @objc func snapshot(_ call: CAPPluginCall) {
        DispatchQueue.main.async {
            guard let input = call.getObject("partner"), let coordinate = self.coordinate(input),
                  let width = call.getDouble("width"), let height = call.getDouble("height"),
                  width.isFinite, height.isFinite, width > 0, height > 0 else {
                call.reject("Nieprawidłowe dane podglądu mapy.")
                return
            }

            let identity = Identity(input, fallback: "Druga osoba")
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
                self.loadAvatar(identity.avatar) { avatar in
                    let pin = self.pinImage(identity, avatar: avatar, fallbackColor: self.partnerColor)
                    let image = UIGraphicsImageRenderer(size: snapshot.image.size, format: snapshot.image.imageRendererFormat).image { _ in
                        snapshot.image.draw(at: .zero)
                        let center = snapshot.point(for: coordinate)
                        pin.draw(at: CGPoint(x: center.x - pin.size.width / 2, y: center.y - 17))
                    }
                    guard let data = image.jpegData(compressionQuality: 0.82) else {
                        call.reject("Podgląd mapy jest chwilowo niedostępny.")
                        return
                    }
                    call.resolve(["image": "data:image/jpeg;base64," + data.base64EncodedString()])
                }
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
            let cover = self.rect(call.getObject("cover"))
            // Keep the map and its surface stable while only the sheet's mask moves.
            let surface = frame.intersection(webView.bounds)
            self.container?.frame = surface
            self.container?.updateViewport(visible, controls: cover)
            self.container?.isHidden = false
            self.map?.frame = frame.offsetBy(dx: -surface.minX, dy: -surface.minY)
            self.bottomOcclusion = max(0, frame.maxY - visible.maxY)
            let controlsTop = max(12, (cover?.minY ?? 12) - visible.minY)
            self.fitButton?.frame = CGRect(x: max(0, visible.width - 56), y: controlsTop + 2, width: 44, height: 44)
            self.setPoint("mine", call.getObject("mine"))
            self.setPoint("partner", call.getObject("partner"))
            if call.getBool("fit") == true { self.fitPoints() }
            self.separatePins()
            call.resolve()
        }
    }

    @objc func navigate(_ call: CAPPluginCall) {
        DispatchQueue.main.async {
            guard let latitude = call.getDouble("latitude"), let longitude = call.getDouble("longitude") else {
                call.reject("Brak celu nawigacji.")
                return
            }
            let coordinate = CLLocationCoordinate2D(latitude: latitude, longitude: longitude)
            guard CLLocationCoordinate2DIsValid(coordinate) else {
                call.reject("Brak celu nawigacji.")
                return
            }
            let item: MKMapItem
            if #available(iOS 26, *) {
                item = MKMapItem(location: CLLocation(latitude: latitude, longitude: longitude), address: nil)
            } else {
                item = MKMapItem(placemark: MKPlacemark(coordinate: coordinate))
            }
            item.name = call.getString("name")
            let scene = self.webView?.window?.windowScene
            item.openInMaps(launchOptions: [MKLaunchOptionsDirectionsModeKey: MKLaunchOptionsDirectionsModeDefault], from: scene) { opened in
                if opened { call.resolve() }
                else { call.reject("Nie udało się otworzyć Map.") }
            }
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
        bottomOcclusion = 0
        annotations.removeAll()
    }

    private func installMap(id: String, webView: UIView) {
        clearMap()
        let wrapper = MapSurface()
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

    private func setPoint(_ role: String, _ input: JSObject?) {
        guard let input, let coordinate = coordinate(input) else {
            if let existing = annotations.removeValue(forKey: role) { map?.removeAnnotation(existing) }
            return
        }
        let mine = role == "mine"
        let identity = Identity(input, fallback: mine ? "Ty" : "Druga osoba")
        if let existing = annotations[role] {
            if existing.identity != identity {
                existing.identity = identity
                existing.title = identity.name
                if let pin = map?.view(for: existing) { configure(pin, for: existing) }
            }
            if existing.coordinate.latitude != coordinate.latitude || existing.coordinate.longitude != coordinate.longitude {
                existing.coordinate = coordinate
            }
        } else {
            let point = PersonAnnotation(identity: identity, fallbackColor: mine ? mineColor : partnerColor)
            point.coordinate = coordinate
            annotations[role] = point
            map?.addAnnotation(point)
        }
    }

    private func loadAvatar(_ url: URL?, completion: @escaping (UIImage?) -> Void) {
        guard let url else { completion(nil); return }
        if let cached = avatars.object(forKey: url as NSURL) { completion(cached); return }
        let request = URLRequest(url: url, timeoutInterval: 5)
        URLSession.shared.dataTask(with: request) { data, response, _ in
            var image: UIImage?
            if let data, data.count <= 2_000_000, let response = response as? HTTPURLResponse,
               (200..<300).contains(response.statusCode), response.url?.scheme == "https",
               let source = CGImageSourceCreateWithData(data as CFData, nil),
               let thumbnail = CGImageSourceCreateThumbnailAtIndex(source, 0, [
                   kCGImageSourceCreateThumbnailFromImageAlways: true,
                   kCGImageSourceCreateThumbnailWithTransform: true,
                   kCGImageSourceThumbnailMaxPixelSize: 96
               ] as CFDictionary) {
                image = UIImage(cgImage: thumbnail)
            }
            let result = image
            DispatchQueue.main.async {
                if let result { self.avatars.setObject(result, forKey: url as NSURL) }
                completion(result)
            }
        }.resume()
    }

    private func pinImage(_ identity: Identity, avatar: UIImage?, fallbackColor: UIColor) -> UIImage {
        let text = identity.name as NSString
        let font = UIFont.systemFont(ofSize: 11, weight: .semibold)
        let width = min(112, max(36, ceil(text.size(withAttributes: [.font: font]).width) + 14))
        let label = CGRect(x: 1, y: 36, width: width, height: 17)
        let circle = CGRect(x: (width + 2 - 32) / 2, y: 1, width: 32, height: 32)
        let format = UIGraphicsImageRendererFormat.default()
        format.scale = 2
        return UIGraphicsImageRenderer(size: CGSize(width: width + 2, height: 55), format: format).image { context in
            context.cgContext.setShadow(offset: CGSize(width: 0, height: 1), blur: 2, color: UIColor.black.withAlphaComponent(0.2).cgColor)
            UIColor.white.setFill()
            UIBezierPath(ovalIn: circle).fill()
            UIBezierPath(roundedRect: label, cornerRadius: 8.5).fill()
            context.cgContext.setShadow(offset: .zero, blur: 0)

            let avatarArea = circle.insetBy(dx: 2, dy: 2)
            context.cgContext.saveGState()
            UIBezierPath(ovalIn: avatarArea).addClip()
            if let avatar {
                let scale = max(avatarArea.width / avatar.size.width, avatarArea.height / avatar.size.height)
                let size = CGSize(width: avatar.size.width * scale, height: avatar.size.height * scale)
                avatar.draw(in: CGRect(x: avatarArea.midX - size.width / 2, y: avatarArea.midY - size.height / 2, width: size.width, height: size.height))
            } else {
                avatarColor(identity.color, fallback: fallbackColor).setFill()
                UIBezierPath(ovalIn: avatarArea).fill()
                let initial = String(identity.name.prefix(1)).uppercased() as NSString
                let style: [NSAttributedString.Key: Any] = [.font: UIFont.boldSystemFont(ofSize: 13), .foregroundColor: UIColor.white]
                let size = initial.size(withAttributes: style)
                initial.draw(at: CGPoint(x: avatarArea.midX - size.width / 2, y: avatarArea.midY - size.height / 2), withAttributes: style)
            }
            context.cgContext.restoreGState()

            let paragraph = NSMutableParagraphStyle()
            paragraph.alignment = .center
            paragraph.lineBreakMode = .byTruncatingTail
            text.draw(in: label.insetBy(dx: 6, dy: 2), withAttributes: [
                .font: font, .foregroundColor: UIColor(white: 0.13, alpha: 1), .paragraphStyle: paragraph
            ])
        }
    }

    private func avatarColor(_ value: String?, fallback: UIColor) -> UIColor {
        guard let value, value.count == 7, value.hasPrefix("#"),
              let number = UInt32(value.dropFirst(), radix: 16) else { return fallback }
        return UIColor(red: CGFloat((number >> 16) & 255) / 255 * 0.47,
                       green: CGFloat((number >> 8) & 255) / 255 * 0.47,
                       blue: CGFloat(number & 255) / 255 * 0.47, alpha: 1)
    }

    private func configure(_ pin: MKAnnotationView, for point: PersonAnnotation) {
        let identity = point.identity
        pin.image = pinImage(identity, avatar: nil, fallbackColor: point.fallbackColor)
        pin.centerOffset = CGPoint(x: 0, y: 10.5)
        pin.accessibilityLabel = identity.name
        loadAvatar(identity.avatar) { [weak self, weak pin, weak point] avatar in
            guard let self, let pin, let point, let avatar,
                  pin.annotation === point, point.identity == identity else { return }
            pin.image = self.pinImage(identity, avatar: avatar, fallbackColor: point.fallbackColor)
        }
    }

    @objc private func fitPoints() {
        guard let map, let first = annotations.values.first else { return }
        let positions = annotations.values.map { MKMapPoint($0.coordinate) }
        var bounds = positions.reduce(MKMapRect.null) { rect, point in
            rect.union(MKMapRect(x: point.x, y: point.y, width: 1, height: 1))
        }
        let minimum = 400 * MKMapPointsPerMeterAtLatitude(first.coordinate.latitude)
        bounds = bounds.insetBy(dx: -max(0, minimum - bounds.size.width) / 2, dy: -max(0, minimum - bounds.size.height) / 2)
        let sheet = min(bottomOcclusion, map.bounds.height * 0.53)
        let top = (fitButton?.frame.maxY ?? 60) + 23
        map.setVisibleMapRect(bounds, edgePadding: UIEdgeInsets(top: top, left: 40, bottom: 40 + sheet, right: 40), animated: false)
    }

    func mapViewDidChangeVisibleRegion(_ mapView: MKMapView) {
        separatePins()
    }

    private func separatePins() {
        guard let map else { return }
        if let mine = annotations["mine"], let partner = annotations["partner"] {
            let first = map.convert(mine.coordinate, toPointTo: map)
            let second = map.convert(partner.coordinate, toPointTo: map)
            let overlaps = abs(first.x - second.x) < 112 && abs(first.y - second.y) < 48
            let offset: CGFloat = overlaps ? (first.x <= second.x ? 56 : -56) : 0
            map.view(for: mine)?.centerOffset.x = -offset
            map.view(for: partner)?.centerOffset.x = offset
        } else {
            for point in annotations.values { map.view(for: point)?.centerOffset.x = 0 }
        }
    }

    func mapView(_ mapView: MKMapView, viewFor annotation: MKAnnotation) -> MKAnnotationView? {
        guard let point = annotation as? PersonAnnotation else { return nil }
        let pin = mapView.dequeueReusableAnnotationView(withIdentifier: "DuoLocation")
            ?? MKAnnotationView(annotation: point, reuseIdentifier: "DuoLocation")
        pin.annotation = point
        pin.displayPriority = .required
        configure(pin, for: point)
        return pin
    }
}
