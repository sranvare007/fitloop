import Foundation
import React

/// JS bridge for the lock-screen workout widget (Live Activity). Mirrors the
/// Android module of the same name.
@objc(SessionWidget)
class SessionWidget: RCTEventEmitter {
  private static let changeEvent = "SessionWidgetChanged"
  private var hasListeners = false

  override init() {
    super.init()
    if #available(iOS 17.0, *) {
      NotificationCenter.default.addObserver(self, selector: #selector(widgetChanged(_:)), name: SessionWidgetStore.changed, object: nil)
    }
  }

  deinit { NotificationCenter.default.removeObserver(self) }

  override static func requiresMainQueueSetup() -> Bool { false }
  override func supportedEvents() -> [String]! { [SessionWidget.changeEvent] }
  override func startObserving() { hasListeners = true }
  override func stopObserving() { hasListeners = false }

  @objc private func widgetChanged(_ notification: Notification) {
    guard hasListeners, let json = notification.object as? String else { return }
    sendEvent(withName: SessionWidget.changeEvent, body: json)
  }

  @objc(sync:baseRev:resolver:rejecter:)
  func sync(_ payloadJson: String, baseRev: Double, resolver resolve: @escaping RCTPromiseResolveBlock, rejecter reject: @escaping RCTPromiseRejectBlock) {
    guard #available(iOS 17.0, *) else { resolve("{\"ok\":true,\"rev\":0}"); return }
    guard let data = payloadJson.data(using: .utf8),
          let payload = (try? JSONSerialization.jsonObject(with: data)) as? [String: Any] else {
      reject("E_SESSION_WIDGET", "Malformed payload", nil)
      return
    }
    if let conflict = SessionWidgetStore.sync(payload: payload, baseRev: Int(baseRev)) {
      resolve(SessionWidgetStore.json(["ok": false, "snapshot": conflict]))
      return
    }
    guard let snapshot = SessionWidgetStore.load() else { resolve("{\"ok\":true,\"rev\":0}"); return }
    let rev = (snapshot["rev"] as? NSNumber)?.intValue ?? 0
    Task {
      await SessionWidgetStore.refreshActivity(snapshot, allowStart: true)
      resolve("{\"ok\":true,\"rev\":\(rev)}")
    }
  }

  @objc(end:rejecter:)
  func end(_ resolve: @escaping RCTPromiseResolveBlock, rejecter reject: @escaping RCTPromiseRejectBlock) {
    guard #available(iOS 17.0, *) else { resolve(nil); return }
    SessionWidgetStore.clear()
    Task {
      await SessionWidgetStore.endActivities()
      resolve(nil)
    }
  }

  @objc(getSnapshot:rejecter:)
  func getSnapshot(_ resolve: @escaping RCTPromiseResolveBlock, rejecter reject: @escaping RCTPromiseRejectBlock) {
    guard #available(iOS 17.0, *), let snapshot = SessionWidgetStore.load() else { resolve(nil); return }
    resolve(SessionWidgetStore.json(snapshot))
  }
}
