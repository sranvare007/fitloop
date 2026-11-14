package com.fitloop.app.sessionwidget

import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import com.facebook.react.modules.core.DeviceEventManagerModule
import java.lang.ref.WeakReference
import org.json.JSONObject

class SessionWidgetModule(private val reactContext: ReactApplicationContext) : ReactContextBaseJavaModule(reactContext) {

  init { current = WeakReference(reactContext) }

  override fun getName(): String = NAME

  @ReactMethod
  fun sync(payloadJson: String, baseRev: Double, promise: Promise) {
    try {
      val context = reactContext.applicationContext
      val conflict = SessionWidgetStore.sync(context, JSONObject(payloadJson), baseRev.toInt())
      if (conflict != null) {
        promise.resolve(JSONObject().put("ok", false).put("snapshot", conflict).toString())
        return
      }
      val snapshot = SessionWidgetStore.load(context)
      if (snapshot != null) SessionNotification.show(context, snapshot)
      promise.resolve(JSONObject().put("ok", true).put("rev", snapshot?.optInt("rev") ?: 0).toString())
    } catch (e: Exception) {
      promise.reject("E_SESSION_WIDGET", e)
    }
  }

  @ReactMethod
  fun end(promise: Promise) {
    val context = reactContext.applicationContext
    SessionWidgetStore.clear(context)
    SessionNotification.cancel(context)
    promise.resolve(null)
  }

  @ReactMethod
  fun getSnapshot(promise: Promise) {
    promise.resolve(SessionWidgetStore.load(reactContext.applicationContext)?.toString())
  }

  // Required by NativeEventEmitter.
  @ReactMethod fun addListener(eventName: String) {}
  @ReactMethod fun removeListeners(count: Double) {}

  companion object {
    const val NAME = "SessionWidget"
    private const val CHANGE_EVENT = "SessionWidgetChanged"
    private var current: WeakReference<ReactApplicationContext>? = null

    /** Tells JS about a change made from the widget, if a JS runtime is alive to hear it. */
    fun emitChange(snapshotJson: String) {
      val context = current?.get() ?: return
      if (!context.hasActiveReactInstance()) return
      context.getJSModule(DeviceEventManagerModule.RCTDeviceEventEmitter::class.java).emit(CHANGE_EVENT, snapshotJson)
    }
  }
}
