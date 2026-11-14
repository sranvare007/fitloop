import ActivityKit
import Foundation

/// The widget's own copy of the in-progress session. It lives in native storage
/// so the Live Activity buttons keep working while the JS runtime is not
/// running; JS folds the changes back in the next time it runs.
///
/// Button intents run in the app's process, so plain `UserDefaults.standard`
/// is enough — the widget extension only ever reads the activity's content state.
@available(iOS 17.0, *)
enum SessionWidgetStore {
  typealias Snapshot = [String: Any]

  static let changed = Notification.Name("SessionWidgetChanged")
  private static let key = "session_widget_snapshot"
  private static let lock = NSLock()

  enum Action: String { case prev, next, done }

  static func load() -> Snapshot? {
    guard let data = UserDefaults.standard.data(forKey: key) else { return nil }
    return (try? JSONSerialization.jsonObject(with: data)) as? Snapshot
  }

  private static func save(_ snapshot: Snapshot) {
    guard let data = try? JSONSerialization.data(withJSONObject: snapshot) else { return }
    UserDefaults.standard.set(data, forKey: key)
  }

  static func clear() {
    lock.lock(); defer { lock.unlock() }
    UserDefaults.standard.removeObject(forKey: key)
  }

  static func json(_ snapshot: Snapshot) -> String? {
    guard let data = try? JSONSerialization.data(withJSONObject: snapshot) else { return nil }
    return String(data: data, encoding: .utf8)
  }

  /// Stores what JS sent. Returns nil when stored, or the current snapshot when
  /// the widget changed since `baseRev` and JS must merge before syncing again.
  static func sync(payload: Snapshot, baseRev: Int) -> Snapshot? {
    lock.lock(); defer { lock.unlock() }
    let stored = load()
    let startedAt = number(payload["startedAt"])
    let sameSession = stored.map { number($0["startedAt"]) == startedAt } ?? false
    if sameSession, let stored, int(stored["rev"]) != baseRev { return stored }

    let exercises = payload["exercises"] as? [Snapshot] ?? []
    let candidates = [payload["focusId"] as? String, sameSession ? stored?["cursorId"] as? String : nil]
    let cursor = candidates.compactMap { $0 }.first { id in exercises.contains { $0["id"] as? String == id } }
      ?? firstUnfinishedId(exercises)

    save([
      "startedAt": startedAt,
      "lastActiveAt": number(payload["lastActiveAt"]),
      "routineName": payload["routineName"] as? String ?? "Workout",
      "unit": payload["unit"] as? String ?? "kg",
      "rev": sameSession ? int(stored?["rev"]) : 0,
      "cursorId": cursor as Any? ?? NSNull(),
      "exercises": exercises,
    ])
    return nil
  }

  /// Applies a button press. Returns the updated snapshot, or nil if there is no session.
  static func apply(_ action: Action) -> Snapshot? {
    lock.lock(); defer { lock.unlock() }
    guard var snapshot = load(), var exercises = snapshot["exercises"] as? [Snapshot], !exercises.isEmpty else { return nil }
    let index = cursorIndex(snapshot)

    switch action {
    case .prev:
      if index > 0 { snapshot["cursorId"] = exercises[index - 1]["id"] }
    case .next:
      if index < exercises.count - 1 { snapshot["cursorId"] = exercises[index + 1]["id"] }
    case .done:
      var sets = exercises[index]["sets"] as? [Snapshot] ?? []
      let setIndex = currentSetIndex(sets)
      guard setIndex >= 0 else { return snapshot }
      sets[setIndex]["done"] = true
      exercises[index]["sets"] = sets
      snapshot["exercises"] = exercises
      snapshot["lastActiveAt"] = Date().timeIntervalSince1970 * 1000
    }
    snapshot["rev"] = int(snapshot["rev"]) + 1
    save(snapshot)
    return snapshot
  }

  /// Runs a button press end to end: mutate, redraw the activity, tell JS.
  static func perform(_ action: Action) async {
    guard let snapshot = apply(action) else { return }
    await refreshActivity(snapshot, allowStart: false)
    NotificationCenter.default.post(name: changed, object: json(snapshot))
  }

  // MARK: - Live Activity

  static func refreshActivity(_ snapshot: Snapshot, allowStart: Bool) async {
    guard let state = contentState(snapshot) else { return }
    let startedAt = Date(timeIntervalSince1970: number(snapshot["startedAt"]) / 1000)
    let content = ActivityContent(state: state, staleDate: nil)

    var matched = false
    for activity in Activity<SessionActivityAttributes>.activities {
      if !matched, abs(activity.attributes.startedAt.timeIntervalSince(startedAt)) < 1 {
        await activity.update(content)
        matched = true
      } else {
        await activity.end(nil, dismissalPolicy: .immediate)
      }
    }
    guard !matched, allowStart, ActivityAuthorizationInfo().areActivitiesEnabled else { return }
    let attributes = SessionActivityAttributes(routineName: snapshot["routineName"] as? String ?? "Workout", startedAt: startedAt)
    _ = try? Activity.request(attributes: attributes, content: content, pushType: nil)
  }

  static func endActivities() async {
    for activity in Activity<SessionActivityAttributes>.activities {
      await activity.end(nil, dismissalPolicy: .immediate)
    }
  }

  static func contentState(_ snapshot: Snapshot) -> SessionActivityAttributes.ContentState? {
    guard let exercises = snapshot["exercises"] as? [Snapshot], !exercises.isEmpty else { return nil }
    let index = cursorIndex(snapshot)
    let exercise = exercises[index]
    let sets = exercise["sets"] as? [Snapshot] ?? []
    let setIndex = currentSetIndex(sets)
    let set = setIndex >= 0 ? sets[setIndex] : nil
    return .init(
      exerciseId: exercise["id"] as? String ?? "",
      exerciseName: exercise["name"] as? String ?? "",
      exerciseIndex: index,
      exerciseCount: exercises.count,
      setIndex: setIndex,
      setCount: sets.count,
      reps: set.map { format(number($0["reps"])) } ?? "",
      weight: set.map { format(number($0["w"])) } ?? "",
      unit: snapshot["unit"] as? String ?? "kg"
    )
  }

  // MARK: - Helpers

  static func cursorIndex(_ snapshot: Snapshot) -> Int {
    guard let exercises = snapshot["exercises"] as? [Snapshot], let id = snapshot["cursorId"] as? String else { return 0 }
    return exercises.firstIndex { $0["id"] as? String == id } ?? 0
  }

  /// The first set not yet done — the one the widget offers to tick. -1 when none is left.
  static func currentSetIndex(_ sets: [Snapshot]) -> Int {
    sets.firstIndex { !(($0["done"] as? Bool) ?? false) } ?? -1
  }

  private static func firstUnfinishedId(_ exercises: [Snapshot]) -> String? {
    let unfinished = exercises.first { currentSetIndex($0["sets"] as? [Snapshot] ?? []) >= 0 }
    return (unfinished ?? exercises.first)?["id"] as? String
  }

  private static func number(_ value: Any?) -> Double { (value as? NSNumber)?.doubleValue ?? 0 }
  private static func int(_ value: Any?) -> Int { (value as? NSNumber)?.intValue ?? 0 }

  private static func format(_ value: Double) -> String {
    value == value.rounded() ? String(Int(value)) : String(value)
  }
}
