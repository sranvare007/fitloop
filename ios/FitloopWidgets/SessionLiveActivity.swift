import ActivityKit
import AppIntents
import SwiftUI
import WidgetKit

private enum Palette {
  static let background = Color(red: 0.047, green: 0.051, blue: 0.063)
  static let accent = Color(red: 1.0, green: 0.353, blue: 0.173)
  static let pop = Color(red: 0.776, green: 1.0, blue: 0.227)
  static let ink = Color(red: 0.047, green: 0.051, blue: 0.063)
  static let chip = Color.white.opacity(0.12)
}

private typealias State = SessionActivityAttributes.ContentState

private extension State {
  var hasSet: Bool { setIndex >= 0 }

  var setLabel: String {
    if setCount == 0 { return "No sets yet — tap to add in the app" }
    if !hasSet { return "All \(setCount) sets done" }
    return "Set \(setIndex + 1) of \(setCount)"
  }

  func link(field: String? = nil) -> URL {
    var components = URLComponents(string: "fitloop://session")!
    if let field, hasSet {
      components.queryItems = [
        URLQueryItem(name: "ex", value: exerciseId),
        URLQueryItem(name: "set", value: String(setIndex)),
        URLQueryItem(name: "field", value: field),
      ]
    }
    return components.url!
  }
}

struct SessionLiveActivity: Widget {
  var body: some WidgetConfiguration {
    ActivityConfiguration(for: SessionActivityAttributes.self) { context in
      LockScreenView(attributes: context.attributes, state: context.state)
        .activityBackgroundTint(Palette.background)
        .activitySystemActionForegroundColor(.white)
        .widgetURL(context.state.link())
    } dynamicIsland: { context in
      DynamicIsland {
        DynamicIslandExpandedRegion(.leading) {
          Text(context.attributes.routineName)
            .font(.caption).foregroundStyle(.secondary).lineLimit(1)
        }
        DynamicIslandExpandedRegion(.trailing) {
          ElapsedTimer(startedAt: context.attributes.startedAt)
        }
        DynamicIslandExpandedRegion(.center) {
          Text(context.state.exerciseName).font(.headline).lineLimit(1)
        }
        DynamicIslandExpandedRegion(.bottom) {
          VStack(spacing: 8) {
            Text(context.state.setLabel).font(.caption).foregroundStyle(.secondary)
            Controls(state: context.state)
          }
        }
      } compactLeading: {
        Image(systemName: "dumbbell.fill").foregroundStyle(Palette.accent)
      } compactTrailing: {
        Text(context.state.hasSet ? "\(context.state.setIndex + 1)/\(context.state.setCount)" : "✓")
          .font(.caption.weight(.bold)).foregroundStyle(Palette.pop)
      } minimal: {
        Image(systemName: "dumbbell.fill").foregroundStyle(Palette.accent)
      }
      .widgetURL(context.state.link())
    }
  }
}

private struct LockScreenView: View {
  let attributes: SessionActivityAttributes
  let state: State

  var body: some View {
    VStack(alignment: .leading, spacing: 10) {
      HStack(alignment: .firstTextBaseline) {
        VStack(alignment: .leading, spacing: 2) {
          Text(state.exerciseName)
            .font(.headline).foregroundStyle(.white).lineLimit(1)
          Text("\(state.setLabel) · \(state.exerciseIndex + 1)/\(state.exerciseCount) · \(attributes.routineName)")
            .font(.caption).foregroundStyle(.white.opacity(0.6)).lineLimit(1)
        }
        Spacer(minLength: 8)
        ElapsedTimer(startedAt: attributes.startedAt)
      }
      Controls(state: state)
    }
    .padding(16)
  }
}

private struct ElapsedTimer: View {
  let startedAt: Date

  var body: some View {
    Text(timerInterval: startedAt...Date.distantFuture, countsDown: false)
      .font(.caption.weight(.bold).monospacedDigit())
      .foregroundStyle(Palette.pop)
      .multilineTextAlignment(.trailing)
      .frame(width: 64, alignment: .trailing)
  }
}

/// Reps and weight open the app on that set; the three buttons act in place.
private struct Controls: View {
  let state: State

  var body: some View {
    HStack(spacing: 8) {
      if state.hasSet {
        Link(destination: state.link(field: "reps")) {
          ValueChip(value: state.reps, label: "reps")
        }
        .accessibilityLabel("Edit reps, \(state.reps)")
        Link(destination: state.link(field: "kg")) {
          ValueChip(value: state.weight, label: state.unit)
        }
        .accessibilityLabel("Edit weight, \(state.weight) \(state.unit)")
      } else {
        Spacer(minLength: 0)
      }

      Button(intent: SessionPreviousExerciseIntent()) {
        ControlIcon(systemName: "chevron.left", background: Palette.chip, foreground: .white)
      }
      .accessibilityLabel("Previous exercise")
      .disabled(state.exerciseIndex == 0)
      .opacity(state.exerciseIndex == 0 ? 0.4 : 1)

      if state.hasSet {
        Button(intent: SessionSetDoneIntent()) {
          ControlIcon(systemName: "checkmark", background: Palette.accent, foreground: Palette.ink)
        }
        .accessibilityLabel("Mark set done")
      }

      Button(intent: SessionNextExerciseIntent()) {
        ControlIcon(systemName: "chevron.right", background: Palette.chip, foreground: .white)
      }
      .accessibilityLabel("Next exercise")
      .disabled(state.exerciseIndex >= state.exerciseCount - 1)
      .opacity(state.exerciseIndex >= state.exerciseCount - 1 ? 0.4 : 1)
    }
    .buttonStyle(.plain)
  }
}

private struct ValueChip: View {
  let value: String
  let label: String

  var body: some View {
    HStack(alignment: .firstTextBaseline, spacing: 4) {
      Text(value).font(.body.weight(.bold).monospacedDigit()).foregroundStyle(.white)
      Text(label).font(.caption2.weight(.semibold)).foregroundStyle(.white.opacity(0.6))
    }
    .lineLimit(1)
    .minimumScaleFactor(0.7)
    .frame(maxWidth: .infinity, minHeight: 44)
    .background(Palette.chip, in: RoundedRectangle(cornerRadius: 12, style: .continuous))
  }
}

private struct ControlIcon: View {
  let systemName: String
  let background: Color
  let foreground: Color

  var body: some View {
    Image(systemName: systemName)
      .font(.body.weight(.bold))
      .foregroundStyle(foreground)
      .frame(width: 48, height: 44)
      .background(background, in: RoundedRectangle(cornerRadius: 12, style: .continuous))
  }
}
