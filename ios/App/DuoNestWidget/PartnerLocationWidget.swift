import SwiftUI
import WidgetKit
import MapKit

struct PartnerLocationWidget: Widget {
    var body: some WidgetConfiguration {
        if #available(iOSApplicationExtension 26.0, *) {
            return configuration.pushHandler(DoodleWidgetPushHandler.self)
        } else { return configuration }
    }

    private var configuration: some WidgetConfiguration {
        StaticConfiguration(kind: LocationWidgetConfig.kind, provider: PartnerLocationProvider()) { entry in
            PartnerLocationWidgetView(entry: entry)
        }
        .configurationDisplayName("Lokalizacja drugiej osoby")
        .description("Ostatnia udostępniona pozycja, adres i czas odczytu.")
        .supportedFamilies([.systemSmall, .systemMedium, .systemLarge, .systemExtraLarge,
                            .accessoryInline, .accessoryCircular, .accessoryRectangular])
    }
}

struct PartnerLocationEntry: TimelineEntry {
    let date: Date
    let connected: Bool
    let name: String
    let location: PartnerLocation?
    let map: UIImage?
    var locationStatus: String? = nil
}

struct PartnerLocationProvider: TimelineProvider {
    func placeholder(in context: Context) -> PartnerLocationEntry {
        PartnerLocationEntry(date: Date(), connected: true, name: "Druga osoba", location: nil, map: nil)
    }

    func getSnapshot(in context: Context, completion: @escaping (PartnerLocationEntry) -> Void) {
        completion(entry(state: DoodleWidgetStore.shared.state()))
    }

    func getTimeline(in context: Context, completion: @escaping (Timeline<PartnerLocationEntry>) -> Void) {
        Task {
            let state = await LocationWidgetSync.refresh() ?? DoodleWidgetStore.shared.state()
            let current = entry(state: state)
            let image = await snapshot(current.location, context: context)
            let ready = PartnerLocationEntry(date: current.date, connected: current.connected, name: current.name,
                                             location: current.location, map: image, locationStatus: current.locationStatus)
            var entries = [ready]
            // Remove the last fix even if the next network request is delayed or offline.
            if let expires = current.location?.expires, expires > current.date {
                entries.append(PartnerLocationEntry(date: expires, connected: current.connected, name: current.name, location: nil, map: nil, locationStatus: "unavailable"))
            }
            completion(Timeline(entries: entries, policy: .after(Date().addingTimeInterval(15 * 60))))
        }
    }

    private func entry(state: DoodleWidgetState) -> PartnerLocationEntry {
        let connected = DoodleWidgetStore.shared.session() != nil
        let location = connected && (state.location?.expires ?? .distantPast) > Date() ? state.location : nil
        return PartnerLocationEntry(date: Date(), connected: connected,
                                    name: state.partnerName.isEmpty ? "Druga osoba" : state.partnerName, location: location, map: nil, locationStatus: state.locationStatus)
    }

    private func snapshot(_ location: PartnerLocation?, context: Context) async -> UIImage? {
        guard let location, [.systemSmall, .systemMedium, .systemLarge, .systemExtraLarge].contains(context.family) else { return nil }
        let options = MKMapSnapshotter.Options()
        options.region = MKCoordinateRegion(center: CLLocationCoordinate2D(latitude: location.latitude, longitude: location.longitude),
                                            latitudinalMeters: 1500, longitudinalMeters: 1500)
        options.size = CGSize(width: min(600, context.displaySize.width), height: min(400, context.displaySize.height))
        options.scale = 2
        options.traitCollection = UITraitCollection(userInterfaceStyle: .light)
        options.pointOfInterestFilter = .excludingAll
        return try? await MKMapSnapshotter(options: options).start().image
    }
}

private enum LocationColor {
    static let ink = Color(uiColor: UIColor(hex: "#1c1b19"))
    static let cream = Color(uiColor: UIColor(hex: "#f6f2e7"))
    static let muted = Color(uiColor: UIColor(hex: "#6b6e75"))
}

struct PartnerLocationWidgetView: View {
    @Environment(\.widgetFamily) private var family
    let entry: PartnerLocationEntry

    private var destination: URL? {
        guard let point = entry.location else { return URL(string: "https://duonestapp.pl/tabs/nest") }
        var url = URLComponents(string: "https://maps.apple.com/")!
        url.queryItems = [URLQueryItem(name: "ll", value: "\(point.latitude),\(point.longitude)"),
                         URLQueryItem(name: "q", value: entry.name)]
        return url.url
    }

    var body: some View {
        Group {
            switch family {
            case .accessoryInline:
                if let point = entry.location {
                    Label("\(entry.name) · \(point.address["city"] ?? point.label)", systemImage: "location")
                } else { Label(emptyMessage, systemImage: "location.slash") }
            case .accessoryCircular:
                VStack(spacing: 2) {
                    Image(systemName: entry.location == nil ? "location.slash" : "location.fill")
                    if let point = entry.location { Text(point.date, style: .relative).font(.caption2).lineLimit(1) }
                    else { Text(entry.locationStatus == "unavailable" ? "Brak pozycji" : "Odśwież w aplikacji").font(.caption2).minimumScaleFactor(0.7) }
                }
                .containerBackground(for: .widget) { AccessoryWidgetBackground() }
            case .accessoryRectangular:
                VStack(alignment: .leading, spacing: 2) {
                    Label(entry.name, systemImage: "location").font(.headline).lineLimit(1)
                    Text(entry.location?.label ?? emptyMessage).font(.caption).lineLimit(1)
                    if let point = entry.location { age(point).font(.caption2) }
                }
                .containerBackground(for: .widget) { AccessoryWidgetBackground() }
            default:
                home
                    .foregroundStyle(LocationColor.ink)
                    .containerBackground(LocationColor.cream, for: .widget)
                    .environment(\.colorScheme, .light)
            }
        }
        .privacySensitive()
        .widgetURL(destination)
    }

    private var emptyMessage: String {
        if !entry.connected { return "Otwórz DuoNest, aby połączyć widget" }
        switch entry.locationStatus {
        case "unavailable": return "Brak udostępnionej pozycji"
        case "failed": return "Nie udało się odświeżyć pozycji"
        default: return "Otwórz DuoNest, aby odświeżyć pozycję"
        }
    }

    private var home: some View {
        Group {
            if family == .systemMedium || family == .systemExtraLarge {
                HStack(spacing: 14) {
                    details
                    if entry.location != nil { map.frame(maxWidth: .infinity, maxHeight: .infinity) }
                }
            } else {
                VStack(alignment: .leading, spacing: 10) {
                    heading
                    if entry.location != nil {
                        map.frame(maxWidth: .infinity, maxHeight: .infinity)
                        Text(entry.location!.label).font(.system(size: family == .systemSmall ? 12 : 15)).lineLimit(2)
                        age(entry.location!).font(.caption2).foregroundStyle(LocationColor.muted)
                        if family == .systemLarge { accuracy }
                    } else {
                        Text(emptyMessage).font(.subheadline).foregroundStyle(LocationColor.muted)
                            .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .leading)
                    }
                }
            }
        }
    }

    private var heading: some View {
        Label(entry.name, systemImage: "location")
            .font(.system(size: family == .systemSmall ? 16 : 20, weight: .semibold, design: .serif))
            .lineLimit(1).minimumScaleFactor(0.8)
    }

    private var details: some View {
        VStack(alignment: .leading, spacing: 8) {
            heading
            Text(entry.location?.label ?? emptyMessage).font(.subheadline).lineLimit(family == .systemExtraLarge ? 4 : 2)
            if let point = entry.location {
                age(point).font(.caption).foregroundStyle(LocationColor.muted)
                if family == .systemExtraLarge { accuracy }
            }
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .leading)
    }

    private var accuracy: some View {
        Text("Dokładność ok. \(Int(ceil(entry.location?.accuracy ?? 0))) m")
            .font(.caption).foregroundStyle(LocationColor.muted)
    }

    private func age(_ point: PartnerLocation) -> some View {
        HStack(spacing: 3) {
            Text("Odczyt:")
            Text(point.date, style: .relative)
        }.lineLimit(1).minimumScaleFactor(0.8)
    }

    private var map: some View {
        ZStack {
            Color.white
            if let image = entry.map {
                GeometryReader { geometry in
                    Image(uiImage: image).resizable().scaledToFill()
                        .frame(width: geometry.size.width, height: geometry.size.height).clipped()
                }
            }
            Image(systemName: "mappin.circle.fill")
                .font(.system(size: family == .systemSmall ? 26 : 36))
                .symbolRenderingMode(.palette).foregroundStyle(.white, LocationColor.ink)
                .shadow(color: .black.opacity(0.15), radius: 3, y: 2)
        }
        .clipShape(RoundedRectangle(cornerRadius: 16))
        .accessibilityLabel("Ostatnia udostępniona pozycja: \(entry.location?.label ?? "")")
    }
}
