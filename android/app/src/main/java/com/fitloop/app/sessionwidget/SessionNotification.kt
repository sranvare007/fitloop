package com.fitloop.app.sessionwidget

import android.Manifest
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.content.Context
import android.content.Intent
import android.content.pm.PackageManager
import android.net.Uri
import android.os.Build
import android.os.SystemClock
import android.view.View
import android.widget.RemoteViews
import androidx.core.app.NotificationCompat
import androidx.core.app.NotificationManagerCompat
import androidx.core.content.ContextCompat
import com.fitloop.app.MainActivity
import com.fitloop.app.R
import org.json.JSONArray
import org.json.JSONObject

/** The ongoing "workout in progress" notification — Android's lock-screen widget. */
object SessionNotification {
  private const val CHANNEL_ID = "workout-session"
  private const val NOTIFICATION_ID = 4101
  private const val LINK = "fitloop://session"
  private const val ACCENT = 0xFFFF5A2C.toInt()

  fun cancel(context: Context) {
    NotificationManagerCompat.from(context).cancel(NOTIFICATION_ID)
  }

  fun show(context: Context, snapshot: JSONObject) {
    if (Build.VERSION.SDK_INT >= 33 &&
      ContextCompat.checkSelfPermission(context, Manifest.permission.POST_NOTIFICATIONS) != PackageManager.PERMISSION_GRANTED
    ) return
    val exercises = snapshot.optJSONArray("exercises") ?: return
    if (exercises.length() == 0) return
    ensureChannel(context)

    val index = SessionWidgetStore.cursorIndex(snapshot)
    val exercise = exercises.getJSONObject(index)
    val sets = exercise.optJSONArray("sets") ?: JSONArray()
    val setIndex = SessionWidgetStore.currentSetIndex(sets)
    val unit = snapshot.optString("unit", "kg")
    val name = exercise.optString("name")
    val position = "${index + 1}/${exercises.length()}"

    val set = if (setIndex >= 0) sets.getJSONObject(setIndex) else null
    val reps = set?.let { number(it.optDouble("reps", 0.0)) }
    val weight = set?.let { number(it.optDouble("w", 0.0)) }
    val summary = when {
      sets.length() == 0 -> context.getString(R.string.session_widget_no_sets)
      set == null -> context.getString(R.string.session_widget_all_done, sets.length())
      else -> context.getString(R.string.session_widget_set_summary, setIndex + 1, sets.length(), reps, weight, unit)
    }
    val setLabel = when {
      sets.length() == 0 -> context.getString(R.string.session_widget_no_sets)
      set == null -> context.getString(R.string.session_widget_all_done, sets.length())
      else -> context.getString(R.string.session_widget_set_label, setIndex + 1, sets.length(), position)
    }

    val collapsed = RemoteViews(context.packageName, R.layout.session_widget_collapsed).apply {
      setTextViewText(R.id.sw_title, name)
      setTextViewText(R.id.sw_subtitle, summary)
    }
    val expanded = RemoteViews(context.packageName, R.layout.session_widget_expanded).apply {
      setTextViewText(R.id.sw_title, name)
      setTextViewText(R.id.sw_subtitle, setLabel)
      val elapsed = System.currentTimeMillis() - snapshot.optLong("startedAt")
      setChronometer(R.id.sw_timer, SystemClock.elapsedRealtime() - elapsed, null, true)
      setViewVisibility(R.id.sw_values, if (set != null) View.VISIBLE else View.GONE)
      if (set != null) {
        setTextViewText(R.id.sw_reps, context.getString(R.string.session_widget_reps, reps))
        setTextViewText(R.id.sw_weight, "$weight $unit")
        val id = Uri.encode(exercise.optString("id"))
        setOnClickPendingIntent(R.id.sw_reps, open(context, "$LINK?ex=$id&set=$setIndex&field=reps"))
        setOnClickPendingIntent(R.id.sw_weight, open(context, "$LINK?ex=$id&set=$setIndex&field=kg"))
      }
    }
    for (views in listOf(collapsed, expanded)) {
      views.setViewVisibility(R.id.sw_done, if (set != null) View.VISIBLE else View.GONE)
      views.setOnClickPendingIntent(R.id.sw_prev, action(context, SessionWidgetStore.ACTION_PREV, 1))
      views.setOnClickPendingIntent(R.id.sw_done, action(context, SessionWidgetStore.ACTION_DONE, 2))
      views.setOnClickPendingIntent(R.id.sw_next, action(context, SessionWidgetStore.ACTION_NEXT, 3))
    }

    val notification = NotificationCompat.Builder(context, CHANNEL_ID)
      .setSmallIcon(R.drawable.ic_stat_session)
      .setColor(ACCENT)
      .setSubText(snapshot.optString("routineName"))
      .setContentTitle(name)
      .setContentText(summary)
      .setStyle(NotificationCompat.DecoratedCustomViewStyle())
      .setCustomContentView(collapsed)
      .setCustomBigContentView(expanded)
      .setContentIntent(open(context, LINK))
      .setCategory(NotificationCompat.CATEGORY_WORKOUT)
      .setVisibility(NotificationCompat.VISIBILITY_PUBLIC)
      .setOngoing(true)
      .setOnlyAlertOnce(true)
      .setSilent(true)
      .setShowWhen(false)
      .build()
    NotificationManagerCompat.from(context).notify(NOTIFICATION_ID, notification)
  }

  private fun ensureChannel(context: Context) {
    if (Build.VERSION.SDK_INT < 26) return
    val manager = context.getSystemService(NotificationManager::class.java)
    if (manager.getNotificationChannel(CHANNEL_ID) != null) return
    val channel = NotificationChannel(CHANNEL_ID, context.getString(R.string.session_widget_channel), NotificationManager.IMPORTANCE_DEFAULT).apply {
      setSound(null, null)
      enableVibration(false)
      setShowBadge(false)
      lockscreenVisibility = android.app.Notification.VISIBILITY_PUBLIC
    }
    manager.createNotificationChannel(channel)
  }

  private fun action(context: Context, action: String, requestCode: Int): PendingIntent {
    val intent = Intent(context, SessionActionReceiver::class.java).putExtra(SessionActionReceiver.EXTRA_ACTION, action)
    return PendingIntent.getBroadcast(context, requestCode, intent, PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE)
  }

  private fun open(context: Context, url: String): PendingIntent {
    val intent = Intent(Intent.ACTION_VIEW, Uri.parse(url), context, MainActivity::class.java)
      .addFlags(Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_SINGLE_TOP)
    return PendingIntent.getActivity(context, 0, intent, PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE)
  }

  private fun number(value: Double): String =
    if (value == Math.floor(value)) value.toLong().toString() else value.toString()
}
