import Foundation
import MetricKit

final class MetricKitDiagnostics: NSObject, MXMetricManagerSubscriber {
    static let shared = MetricKitDiagnostics()
    static let reportsAvailable = Notification.Name("DuoMetricKitReportsAvailable")

    struct Report: Codable {
        let id: String
        let day: String
        let version: String
        let build: String
        let kind: String
        let values: [String: Double]
    }

    private struct State: Codable {
        var enabled = true
        var reports: [Report] = []
    }

    private let queue = DispatchQueue(label: "com.belka.duonest.diagnostics")
    private let file = FileManager.default.urls(for: .applicationSupportDirectory, in: .userDomainMask)[0]
        .appendingPathComponent("duonest-diagnostics.json")
    private var state = State()

    override private init() {
        super.init()
        if let data = try? Data(contentsOf: file), let saved = try? JSONDecoder().decode(State.self, from: data) {
            state = saved
        }
    }

    func start() {
        queue.sync {
            if state.enabled { MXMetricManager.shared.add(self) }
        }
    }

    func isEnabled() -> Bool { queue.sync { state.enabled } }

    func setEnabled(_ enabled: Bool) throws {
        try queue.sync {
            guard enabled != state.enabled else { return }
            var updated = state
            updated.enabled = enabled
            if !enabled { updated.reports.removeAll() }
            try save(updated)
            if enabled { MXMetricManager.shared.add(self) }
            else { MXMetricManager.shared.remove(self) }
        }
    }

    func reports() -> [Report] {
        queue.sync {
            guard state.enabled else { return [] }
            return Array(state.reports.filter { $0.day >= Self.oldestDay() }.prefix(8))
        }
    }

    func acknowledge(_ ids: Set<String>) throws {
        try queue.sync {
            var updated = state
            updated.reports.removeAll { ids.contains($0.id) || $0.day < Self.oldestDay() }
            try save(updated)
        }
    }

    private func save(_ updated: State) throws {
        try FileManager.default.createDirectory(at: file.deletingLastPathComponent(), withIntermediateDirectories: true)
        try JSONEncoder().encode(updated).write(to: file, options: .atomic)
        state = updated
    }

    private static func day(_ date: Date) -> String {
        String(ISO8601DateFormatter().string(from: date).prefix(10))
    }

    private static func oldestDay() -> String {
        day(Date().addingTimeInterval(-7 * 86400))
    }

    private func append(_ reports: [Report]) {
        guard !reports.isEmpty else { return }
        queue.async {
            guard self.state.enabled else { return }
            var updated = self.state
            updated.reports = Array((updated.reports + reports).filter { $0.day >= Self.oldestDay() }.suffix(24))
            guard (try? self.save(updated)) != nil else { return }
            DispatchQueue.main.async {
                NotificationCenter.default.post(name: Self.reportsAvailable, object: nil)
            }
        }
    }

    func didReceive(_ payloads: [MXMetricPayload]) {
        append(payloads.compactMap { payload in
            guard !payload.includesMultipleApplicationVersions, let metadata = payload.metaData else { return nil }
            var values: [String: Double] = [
                "cpuSeconds": payload.cpuMetrics?.cumulativeCPUTime.converted(to: .seconds).value,
                "gpuSeconds": payload.gpuMetrics?.cumulativeGPUTime.converted(to: .seconds).value,
                "foregroundSeconds": payload.applicationTimeMetrics?.cumulativeForegroundTime.converted(to: .seconds).value,
                "backgroundSeconds": payload.applicationTimeMetrics?.cumulativeBackgroundTime.converted(to: .seconds).value,
                "peakMemoryMB": payload.memoryMetrics?.peakMemoryUsage.converted(to: .megabytes).value
            ].compactMapValues { $0 }
            if let launch = payload.applicationLaunchMetrics {
                Self.addHistogram(launch.histogrammedTimeToFirstDraw, prefix: "launch", values: &values)
            }
            if let responsiveness = payload.applicationResponsivenessMetrics {
                Self.addHistogram(responsiveness.histogrammedApplicationHangTime, prefix: "hang", values: &values)
            }
            values = values.filter { $0.value.isFinite && $0.value >= 0 }
            guard !values.isEmpty else { return nil }
            return Report(id: UUID().uuidString, day: Self.day(payload.timeStampEnd), version: payload.latestApplicationVersion,
                          build: metadata.applicationBuildVersion, kind: "metrics", values: values)
        })
    }

    private static func addHistogram(_ histogram: MXHistogram<UnitDuration>, prefix: String, values: inout [String: Double]) {
        var total: Double = 0
        var count: Double = 0
        for case let bucket as MXHistogramBucket<UnitDuration> in histogram.bucketEnumerator {
            let start = bucket.bucketStart.converted(to: .milliseconds).value
            let end = bucket.bucketEnd.converted(to: .milliseconds).value
            count += Double(bucket.bucketCount)
            total += (start + end) / 2 * Double(bucket.bucketCount)
        }
        if count > 0 {
            values[prefix + "Samples"] = count
            values[prefix + "MeanMs"] = total / count
        }
    }

    func didReceive(_ payloads: [MXDiagnosticPayload]) {
        append(payloads.flatMap { payload in
            var reports: [String: Report] = [:]

            func add(_ diagnostics: [MXDiagnostic]?, as key: String) {
                for diagnostic in diagnostics ?? [] {
                    let version = diagnostic.applicationVersion
                    let build = diagnostic.metaData.applicationBuildVersion
                    let group = version + ":" + build
                    let id = reports[group]?.id ?? UUID().uuidString
                    var values = reports[group]?.values ?? [:]
                    values[key, default: 0] += 1
                    reports[group] = Report(id: id, day: Self.day(payload.timeStampEnd), version: version,
                                            build: build, kind: "diagnostics", values: values)
                }
            }

            add(payload.crashDiagnostics, as: "crashes")
            add(payload.hangDiagnostics, as: "hangs")
            add(payload.cpuExceptionDiagnostics, as: "cpuExceptions")
            add(payload.diskWriteExceptionDiagnostics, as: "diskWriteExceptions")
            if #available(iOS 16.0, *) { add(payload.appLaunchDiagnostics, as: "launchDiagnostics") }
            return Array(reports.values)
        })
    }
}
