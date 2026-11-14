import ActivityKit
import Foundation

/// What the Live Activity shows. Compiled into both the app (which starts and
/// updates the activity) and the widget extension (which draws it).
@available(iOS 17.0, *)
struct SessionActivityAttributes: ActivityAttributes {
  struct ContentState: Codable, Hashable {
    var exerciseId: String
    var exerciseName: String
    var exerciseIndex: Int
    var exerciseCount: Int
    /// Index of the set the widget offers to tick; -1 when every set is done or there are none.
    var setIndex: Int
    var setCount: Int
    var reps: String
    var weight: String
    var unit: String
  }

  var routineName: String
  var startedAt: Date
}
