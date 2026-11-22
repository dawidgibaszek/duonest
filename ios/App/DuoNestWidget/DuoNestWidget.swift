import SwiftUI
import WidgetKit

@main
struct DuoNestWidgetBundle: WidgetBundle {
    var body: some Widget {
        DoodleWidget()
    }
}

struct DoodleWidget: Widget {
    var body: some WidgetConfiguration {
        if #available(iOSApplicationExtension 26.0, *) {
            return configuration.pushHandler(DoodleWidgetPushHandler.self)
        } else {
            return configuration
        }
    }

    private var configuration: some WidgetConfiguration {
        StaticConfiguration(kind: DoodleWidgetConfig.kind, provider: DoodleProvider()) { entry in
            DoodleWidgetView(entry: entry)
        }
        .configurationDisplayName("Wspólny rysunek")
        .description("Wasz wspólny rysunek, odświeżany po zapisaniu zmian")
        .supportedFamilies([.systemSmall, .systemMedium, .systemLarge, .systemExtraLarge, .accessoryInline, .accessoryCircular, .accessoryRectangular])
    }
}

/// pushCore.ts sends a WidgetKit push to this token when the partner saves a doodle,
/// which reloads the timeline even when the app is not running.
@available(iOSApplicationExtension 26.0, *)
struct DoodleWidgetPushHandler: WidgetPushHandler {
    func pushTokenDidChange(_ pushInfo: WidgetPushInfo, widgets: [WidgetInfo]) {
        #if DEBUG
        let environment = "development"
        #else
        let environment = "production"
        #endif
        let token = pushInfo.token.map { String(format: "%02x", $0) }.joined()
        DoodleWidgetStore.shared.setPushToken(DoodleWidgetPushToken(token: token, environment: environment))
    }
}

struct DoodleEntry: TimelineEntry {
    let date: Date
    let connected: Bool
    let partnerName: String
    let authorName: String
    let partnerDrawing: Bool
    let image: UIImage?
}

struct DoodleProvider: TimelineProvider {
    // Matches the 16 pt widget content margins and the header in DoodleWidgetView.
    private static let margin: CGFloat = 16
    private static let header: CGFloat = 28
    private static let gap: CGFloat = 10
    private static let refreshInterval: TimeInterval = 15 * 60
    func placeholder(in context: Context) -> DoodleEntry {
        DoodleEntry(date: Date(), connected: true, partnerName: "", authorName: "", partnerDrawing: false, image: nil)
    }

    func getSnapshot(in context: Context, completion: @escaping (DoodleEntry) -> Void) {
        completion(entry(at: Date(), state: DoodleWidgetStore.shared.state(), drawing: nil, context: context))
    }

    func getTimeline(in context: Context, completion: @escaping (Timeline<DoodleEntry>) -> Void) {
        Task {
            let store = DoodleWidgetStore.shared
            let state = await DoodleWidgetSync.refresh() ?? store.state()

            let now = Date()
            var entries = [entry(at: now, state: state, drawing: nil, context: context)]
            if let until = state.partnerDrawingUntil, until > now {
                entries.append(entry(at: until, state: state, drawing: false, context: context))
            }
            completion(Timeline(entries: entries, policy: .after(now.addingTimeInterval(Self.refreshInterval))))
        }
    }

    private func entry(at date: Date, state: DoodleWidgetState, drawing: Bool?, context: Context) -> DoodleEntry {
        let connected = DoodleWidgetStore.shared.session() != nil
        let strokes = connected ? state.strokes : []
        let board = CGSize(
            width: max(1, context.displaySize.width - 2 * Self.margin),
            height: max(1, context.displaySize.height - 2 * Self.margin - ([WidgetFamily.systemMedium, .systemLarge, .systemExtraLarge].contains(context.family) ? Self.header + Self.gap : 0))
        )
        return DoodleEntry(
            date: date,
            connected: connected,
            partnerName: state.partnerName,
            authorName: state.doodle?.authorName ?? "",
            partnerDrawing: connected && (drawing ?? ((state.partnerDrawingUntil ?? .distantPast) > date)),
            image: strokes.isEmpty ? nil : DoodleRenderer.image(strokes: strokes, size: board, scale: 2)
        )
    }
}

private enum DuoColor {
    static let ink = Color(red: 0x1c / 255, green: 0x1b / 255, blue: 0x19 / 255)
    static let muted = Color(red: 0x6b / 255, green: 0x6e / 255, blue: 0x75 / 255)
    static let line = Color(red: 0xec / 255, green: 0xee / 255, blue: 0xf1 / 255)
    static let soft = Color(red: 0xf2 / 255, green: 0xf3 / 255, blue: 0xf5 / 255)
    static let live = Color(red: 0x2f / 255, green: 0xa3 / 255, blue: 0x6b / 255)
}

struct DoodleWidgetView: View {
    @Environment(\.widgetFamily) private var family
    let entry: DoodleEntry

    private var partnerLabel: String { entry.partnerName.isEmpty ? "Partner" : entry.partnerName }
    private var partnerDative: String { entry.partnerName.isEmpty ? "partnera" : entry.partnerName }

    var body: some View {
        switch family {
        case .accessoryInline:
            Label(entry.authorName.isEmpty ? "Wspólny rysunek" : "Rysunek · \(entry.authorName)", systemImage: "paintbrush")
        case .systemSmall, .accessoryCircular, .accessoryRectangular:
            Group {
                if let image = entry.image {
                    Image(uiImage: image).resizable().scaledToFit()
                } else {
                    Image(systemName: "paintbrush.pointed")
                }
            }
            .accessibilityLabel("Wspólny rysunek")
            .containerBackground(for: .widget) { Color.white }
        default:
            fullBoard
        }
    }

    private var fullBoard: some View {
        VStack(alignment: .leading, spacing: 10) {
            HStack(spacing: 12) {
                Text("Wspólny rysunek")
                    .font(.system(size: 20, weight: .semibold, design: .serif))
                    .foregroundColor(DuoColor.ink)
                    .lineLimit(1)
                Spacer(minLength: 0)
                if entry.partnerDrawing {
                    HStack(spacing: 6) {
                        Circle().fill(DuoColor.live).frame(width: 8, height: 8)
                        Text("\(partnerLabel) rysuje")
                            .font(.system(size: 13, weight: .medium))
                            .foregroundColor(DuoColor.ink)
                            .lineLimit(1)
                    }
                } else if entry.image != nil, !entry.authorName.isEmpty {
                    Text(entry.authorName)
                        .font(.system(size: 13))
                        .foregroundColor(DuoColor.muted)
                        .lineLimit(1)
                }
            }
            .frame(height: 28)

            if let image = entry.image {
                ZStack {
                    RoundedRectangle(cornerRadius: 24, style: .continuous).fill(Color.white)
                    Image(uiImage: image).resizable()
                }
                .clipShape(RoundedRectangle(cornerRadius: 24, style: .continuous))
                .overlay(RoundedRectangle(cornerRadius: 24, style: .continuous).stroke(DuoColor.line, lineWidth: 1))
            } else {
                VStack(spacing: 10) {
                    Image(systemName: "paintbrush.pointed")
                        .font(.system(size: 24))
                        .foregroundColor(DuoColor.ink)
                    Text(entry.connected ? "Narysuj coś dla \(partnerDative)" : "Otwórz DuoNest, aby zobaczyć wspólny rysunek")
                        .font(.system(size: 14))
                        .foregroundColor(DuoColor.muted)
                        .multilineTextAlignment(.center)
                        .lineLimit(2)
                }
                .padding(12)
                .frame(maxWidth: .infinity, maxHeight: .infinity)
                .background(RoundedRectangle(cornerRadius: 24, style: .continuous).fill(DuoColor.soft))
            }
        }
        .environment(\.colorScheme, .light)
        .containerBackground(Color.white, for: .widget)
    }
}
