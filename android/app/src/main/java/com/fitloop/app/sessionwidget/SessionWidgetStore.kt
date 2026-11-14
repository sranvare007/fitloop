package com.fitloop.app.sessionwidget

import android.content.Context
import org.json.JSONArray
import org.json.JSONObject

/**
 * The widget's own copy of the in-progress session. It lives in native storage
 * so the notification buttons keep working while the JS runtime is not running;
 * JS folds the changes back in the next time it runs.
 */
object SessionWidgetStore {
  private const val PREFS = "session_widget"
  private const val KEY = "snapshot"

  const val ACTION_PREV = "prev"
  const val ACTION_NEXT = "next"
  const val ACTION_DONE = "done"

  @Synchronized
  fun load(context: Context): JSONObject? {
    val raw = context.getSharedPreferences(PREFS, Context.MODE_PRIVATE).getString(KEY, null) ?: return null
    return try { JSONObject(raw) } catch (e: Exception) { null }
  }

  @Synchronized
  private fun save(context: Context, snapshot: JSONObject) {
    context.getSharedPreferences(PREFS, Context.MODE_PRIVATE).edit().putString(KEY, snapshot.toString()).apply()
  }

  @Synchronized
  fun clear(context: Context) {
    context.getSharedPreferences(PREFS, Context.MODE_PRIVATE).edit().remove(KEY).apply()
  }

  /**
   * Stores what JS sent. Returns null when stored, or the current snapshot when
   * the widget changed since [baseRev] and JS must merge before syncing again.
   */
  @Synchronized
  fun sync(context: Context, payload: JSONObject, baseRev: Int): JSONObject? {
    val stored = load(context)
    val sameSession = stored != null && stored.optLong("startedAt") == payload.optLong("startedAt")
    if (sameSession && stored!!.optInt("rev") != baseRev) return stored

    val exercises = payload.optJSONArray("exercises") ?: JSONArray()
    val focusId = payload.optString("focusId", "").takeIf { it.isNotEmpty() && payload.has("focusId") && !payload.isNull("focusId") }
    val previousCursor = if (sameSession) stored!!.optString("cursorId", "") else ""
    val cursor = listOfNotNull(focusId, previousCursor.takeIf { it.isNotEmpty() })
      .firstOrNull { indexOfExercise(exercises, it) >= 0 }
      ?: firstUnfinishedId(exercises)

    val next = JSONObject()
      .put("startedAt", payload.optLong("startedAt"))
      .put("lastActiveAt", payload.optLong("lastActiveAt"))
      .put("routineName", payload.optString("routineName", "Workout"))
      .put("unit", payload.optString("unit", "kg"))
      .put("rev", if (sameSession) stored!!.optInt("rev") else 0)
      .put("cursorId", cursor ?: JSONObject.NULL)
      .put("exercises", exercises)
    save(context, next)
    return null
  }

  /** Applies a button press. Returns the updated snapshot, or null if there is no session. */
  @Synchronized
  fun apply(context: Context, action: String): JSONObject? {
    val snapshot = load(context) ?: return null
    val exercises = snapshot.optJSONArray("exercises") ?: return null
    if (exercises.length() == 0) return null
    val index = cursorIndex(snapshot)

    when (action) {
      ACTION_PREV -> if (index > 0) snapshot.put("cursorId", exercises.getJSONObject(index - 1).optString("id"))
      ACTION_NEXT -> if (index < exercises.length() - 1) snapshot.put("cursorId", exercises.getJSONObject(index + 1).optString("id"))
      ACTION_DONE -> {
        val sets = exercises.getJSONObject(index).optJSONArray("sets") ?: JSONArray()
        val setIndex = currentSetIndex(sets)
        if (setIndex < 0) return snapshot
        sets.getJSONObject(setIndex).put("done", true)
        snapshot.put("lastActiveAt", System.currentTimeMillis())
      }
      else -> return snapshot
    }
    snapshot.put("rev", snapshot.optInt("rev") + 1)
    save(context, snapshot)
    return snapshot
  }

  fun cursorIndex(snapshot: JSONObject): Int {
    val exercises = snapshot.optJSONArray("exercises") ?: return 0
    val index = indexOfExercise(exercises, snapshot.optString("cursorId", ""))
    return if (index >= 0) index else 0
  }

  /** The first set not yet done — the one the widget offers to tick. -1 when none is left. */
  fun currentSetIndex(sets: JSONArray): Int {
    for (i in 0 until sets.length()) if (!sets.getJSONObject(i).optBoolean("done")) return i
    return -1
  }

  private fun indexOfExercise(exercises: JSONArray, id: String): Int {
    if (id.isEmpty()) return -1
    for (i in 0 until exercises.length()) if (exercises.getJSONObject(i).optString("id") == id) return i
    return -1
  }

  private fun firstUnfinishedId(exercises: JSONArray): String? {
    for (i in 0 until exercises.length()) {
      val exercise = exercises.getJSONObject(i)
      if (currentSetIndex(exercise.optJSONArray("sets") ?: JSONArray()) >= 0) return exercise.optString("id")
    }
    return if (exercises.length() > 0) exercises.getJSONObject(0).optString("id") else null
  }
}
