package com.fitloop.app.sessionwidget

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent

/** Handles the widget's previous / next / done buttons, including from the lock screen. */
class SessionActionReceiver : BroadcastReceiver() {
  override fun onReceive(context: Context, intent: Intent) {
    val action = intent.getStringExtra(EXTRA_ACTION) ?: return
    val snapshot = SessionWidgetStore.apply(context.applicationContext, action) ?: run {
      SessionNotification.cancel(context)
      return
    }
    SessionNotification.show(context.applicationContext, snapshot)
    SessionWidgetModule.emitChange(snapshot.toString())
  }

  companion object {
    const val EXTRA_ACTION = "action"
  }
}
