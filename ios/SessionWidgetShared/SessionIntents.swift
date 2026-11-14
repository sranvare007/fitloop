import AppIntents

// Live Activity buttons. `LiveActivityIntent` makes the system run `perform()`
// inside the app's process (launching it in the background if needed), so the
// buttons work from the lock screen without opening the app.

@available(iOS 17.0, *)
struct SessionPreviousExerciseIntent: LiveActivityIntent {
  static var title: LocalizedStringResource = "Previous exercise"
  static var isDiscoverable: Bool = false

  func perform() async throws -> some IntentResult {
    await SessionWidgetStore.perform(.prev)
    return .result()
  }
}

@available(iOS 17.0, *)
struct SessionNextExerciseIntent: LiveActivityIntent {
  static var title: LocalizedStringResource = "Next exercise"
  static var isDiscoverable: Bool = false

  func perform() async throws -> some IntentResult {
    await SessionWidgetStore.perform(.next)
    return .result()
  }
}

@available(iOS 17.0, *)
struct SessionSetDoneIntent: LiveActivityIntent {
  static var title: LocalizedStringResource = "Mark set done"
  static var isDiscoverable: Bool = false

  func perform() async throws -> some IntentResult {
    await SessionWidgetStore.perform(.done)
    return .result()
  }
}
