import Foundation

#if IRONMATH_HAS_DAT
import MWDATCore
import MWDATDisplay
#endif

struct HudFields {
  var targetLabel: String
  var loadedLabel: String
  var otherLoadedLabel: String
  var eachSide: String
  var miss: String
  var convertLb: String
  var convertKg: String
  var bumpStep: String

  init(from dict: [String: String]) {
    targetLabel = dict["targetLabel"] ?? ""
    loadedLabel = dict["loadedLabel"] ?? ""
    otherLoadedLabel = dict["otherLoadedLabel"] ?? ""
    eachSide = dict["eachSide"] ?? ""
    miss = dict["miss"] ?? ""
    convertLb = dict["convertLb"] ?? ""
    convertKg = dict["convertKg"] ?? ""
    bumpStep = dict["bumpStep"] ?? "2.5"
  }
}

final class WearablesHud: @unchecked Sendable {
  static let shared = WearablesHud()
  nonisolated(unsafe) static var actionHandler: (([String: Any]) -> Void)?

  private let lock = NSLock()
  private var configured = false
  private var lastError = ""
  private var registration = "unknown"
  private var displayState = "idle"
  private var pending: HudFields?

#if IRONMATH_HAS_DAT
  private var deviceSession: DeviceSession?
  private var display: Display?
  private var displayStateToken: (any AnyListenerToken)?
  private var coreStateTask: Task<Void, Never>?
  private var sessionErrorTask: Task<Void, Never>?
  private var registrationTask: Task<Void, Never>?
#endif

  static func emitBump(_ delta: Double) {
    actionHandler?(["type": "bump", "delta": delta])
  }

  func configure() async throws -> String {
#if IRONMATH_HAS_DAT
    if snapshot().configured {
      return "ready"
    }
    do {
      try Wearables.configure()
      setConfigured(true)
      setLastError("")
      observeRegistration()
      return "ready"
    } catch {
      setLastError(error.localizedDescription)
      throw error
    }
#else
    setLastError("Meta Wearables SDK is not linked in this build.")
    return "unavailable"
#endif
  }

  func startRegistration() async throws -> String {
#if IRONMATH_HAS_DAT
    _ = try await configure()
    try await Wearables.shared.startRegistration()
    return "registering"
#else
    throw WearablesHudError.unavailable
#endif
  }

  func startUnregistration() async throws -> String {
#if IRONMATH_HAS_DAT
    try await Wearables.shared.startUnregistration()
    return "unregistering"
#else
    throw WearablesHudError.unavailable
#endif
  }

  func handleUrl(_ value: String) async throws -> String {
#if IRONMATH_HAS_DAT
    guard let url = URL(string: value) else {
      return "ignored"
    }
    _ = try await Wearables.shared.handleUrl(url)
    return "handled"
#else
    return "unavailable"
#endif
  }

  func connectDisplay() async throws -> String {
#if IRONMATH_HAS_DAT
    _ = try await configure()
    if snapshot().displayState == "started", currentDisplay() != nil {
      return "started"
    }
    await disconnectDisplay()
    let wearables = Wearables.shared
    let selector = AutoDeviceSelector(wearables: wearables, filter: { device in
      device.supportsDisplay()
    })
    let session: DeviceSession
    do {
      session = try wearables.createSession(deviceSelector: selector)
    } catch {
      try await failSession(error)
      throw WearablesHudError.connectFailed(gymMessage(for: error))
    }
    setSession(session)
    let stateStream = session.stateStream()
    let errorStream = session.errorStream()
    replaceStateTask(Task { [weak self] in
      for await sessionState in stateStream {
        guard let self, !Task.isCancelled else { return }
        switch sessionState {
        case .started:
          await self.attachDisplay(on: session)
        case .stopping, .stopped:
          self.setDisplayState("stopped")
          self.setDisplay(nil)
        case .paused:
          self.setDisplayState("paused")
        case .starting, .idle:
          self.setDisplayState("starting")
        @unknown default:
          break
        }
      }
    })
    replaceErrorTask(Task { [weak self] in
      for await error in errorStream {
        guard let self, !Task.isCancelled else { return }
        self.setLastError(error.localizedDescription)
        self.setDisplayState("error")
        if Self.needsDatInstall(error) {
          try? await Wearables.shared.openDATGlassesAppUpdate()
        }
      }
    })
    do {
      try session.start()
    } catch {
      try await failSession(error)
      throw WearablesHudError.connectFailed(gymMessage(for: error))
    }
    return try await waitForDisplayStarted(seconds: 25)
#else
    throw WearablesHudError.unavailable
#endif
  }

  func disconnectDisplay() async {
#if IRONMATH_HAS_DAT
    currentDisplay()?.stop()
    currentSession()?.stop()
    replaceStateTask(nil)
    replaceErrorTask(nil)
    let token = takeDisplayToken()
    setDisplay(nil)
    setSession(nil)
    setDisplayState("stopped")
    await token?.cancel()
#endif
  }

  func sendHud(_ payload: HudFields) async throws -> String {
#if IRONMATH_HAS_DAT
    setPending(payload)
    if let display = currentDisplay() {
      try await push(payload, on: display)
      return "sent"
    }
    return "queued"
#else
    throw WearablesHudError.unavailable
#endif
  }

  func openGlassesAppUpdate() async throws -> String {
#if IRONMATH_HAS_DAT
    try await Wearables.shared.openDATGlassesAppUpdate()
    return "opened"
#else
    throw WearablesHudError.unavailable
#endif
  }

  func status() -> [String: String] {
    let snap = snapshot()
#if IRONMATH_HAS_DAT
    let available = "true"
#else
    let available = "false"
#endif
    return [
      "available": available,
      "configured": snap.configured ? "true" : "false",
      "registration": snap.registration,
      "display": snap.displayState,
      "lastError": snap.lastError,
    ]
  }

#if IRONMATH_HAS_DAT
  private func observeRegistration() {
    replaceRegistrationTask(Task { [weak self] in
      let stream = Wearables.shared.registrationStateStream()
      for await state in stream {
        guard let self, !Task.isCancelled else { return }
        self.setRegistration(state.description)
      }
    })
  }

  private func attachDisplay(on session: DeviceSession) async {
    if currentDisplay() != nil {
      return
    }
    do {
      let capability = try session.addDisplay()
      setDisplay(capability)
      let token = capability.statePublisher.listen { state in
        Task {
          await WearablesHud.shared.handleDisplayState(state, display: capability)
        }
      }
      setDisplayToken(token)
      capability.start()
    } catch {
      setLastError(error.localizedDescription)
      setDisplayState("error")
    }
  }

  private func handleDisplayState(_ state: DisplayState, display: Display) async {
    switch state {
    case .starting:
      setDisplayState("starting")
    case .started:
      setDisplayState("started")
    case .stopping:
      setDisplayState("stopping")
    case .stopped:
      setDisplayState("stopped")
    @unknown default:
      setDisplayState("idle")
    }
    if state == .started, let pending = snapshot().pending {
      try? await push(pending, on: display)
    }
  }

  private func push(_ payload: HudFields, on display: Display) async throws {
    let down = payload.bumpStep
    try await display.send(
      FlexBox(direction: .column, spacing: 10) {
        MWDATDisplay.Text("LOAD", style: .meta, color: .secondary)
        MWDATDisplay.Text(payload.targetLabel, style: .body, color: .secondary)
        MWDATDisplay.Text(payload.loadedLabel, style: .heading)
        MWDATDisplay.Text(payload.otherLoadedLabel, style: .body, color: .secondary)
        MWDATDisplay.Text(payload.eachSide, style: .heading)
        MWDATDisplay.Text(payload.miss, style: .body)
        MWDATDisplay.Text("LB AND KG", style: .meta, color: .secondary)
        FlexBox(direction: .row, spacing: 16) {
          MWDATDisplay.Text(payload.convertLb, style: .heading)
          MWDATDisplay.Text(payload.convertKg, style: .heading)
        }
        ButtonGroup {
          Button(label: "- \(down)", style: .secondary, onClick: {
            WearablesHud.emitBump(-2.5)
          })
          Button(label: "+ \(down)", style: .primary, onClick: {
            WearablesHud.emitBump(2.5)
          })
        }
      }
      .padding(20)
      .background(.card)
    )
  }
#endif

  private struct Snapshot {
    var configured: Bool
    var lastError: String
    var registration: String
    var displayState: String
    var pending: HudFields?
  }

  private func snapshot() -> Snapshot {
    lock.lock()
    defer { lock.unlock() }
    return Snapshot(
      configured: configured,
      lastError: lastError,
      registration: registration,
      displayState: displayState,
      pending: pending
    )
  }

  private func setConfigured(_ value: Bool) {
    lock.lock()
    configured = value
    lock.unlock()
  }

  private func setLastError(_ value: String) {
    lock.lock()
    lastError = value
    lock.unlock()
  }

  private func setRegistration(_ value: String) {
    lock.lock()
    registration = value
    lock.unlock()
  }

  private func setDisplayState(_ value: String) {
    lock.lock()
    displayState = value
    lock.unlock()
  }

  private func setPending(_ value: HudFields) {
    lock.lock()
    pending = value
    lock.unlock()
  }

#if IRONMATH_HAS_DAT
  private func currentDisplay() -> Display? {
    lock.lock()
    defer { lock.unlock() }
    return display
  }

  private func currentSession() -> DeviceSession? {
    lock.lock()
    defer { lock.unlock() }
    return deviceSession
  }

  private func setDisplay(_ value: Display?) {
    lock.lock()
    display = value
    lock.unlock()
  }

  private func setSession(_ value: DeviceSession?) {
    lock.lock()
    deviceSession = value
    lock.unlock()
  }

  private func setDisplayToken(_ value: (any AnyListenerToken)?) {
    lock.lock()
    displayStateToken = value
    lock.unlock()
  }

  private func takeDisplayToken() -> (any AnyListenerToken)? {
    lock.lock()
    let token = displayStateToken
    displayStateToken = nil
    lock.unlock()
    return token
  }

  private func replaceStateTask(_ task: Task<Void, Never>?) {
    lock.lock()
    coreStateTask?.cancel()
    coreStateTask = task
    lock.unlock()
  }

  private func replaceErrorTask(_ task: Task<Void, Never>?) {
    lock.lock()
    sessionErrorTask?.cancel()
    sessionErrorTask = task
    lock.unlock()
  }

  private func replaceRegistrationTask(_ task: Task<Void, Never>?) {
    lock.lock()
    registrationTask?.cancel()
    registrationTask = task
    lock.unlock()
  }
#endif
}

#if IRONMATH_HAS_DAT
extension WearablesHud {
  fileprivate static func needsDatInstall(_ error: Error) -> Bool {
    if let sessionError = error as? DeviceSessionError {
      switch sessionError {
      case .datAppOnTheGlassesUpdateRequired, .dwaUnavailable, .noEligibleDevice:
        return true
      default:
        break
      }
    }
    return needsDatInstallMessage(error.localizedDescription)
  }

  fileprivate static func needsDatInstallMessage(_ text: String) -> Bool {
    let lower = text.lowercased()
    return lower.contains("update")
      || lower.contains("dwa")
      || lower.contains("app connections")
      || lower.contains("no eligible")
      || lower.contains("not reachable")
  }

  private func failSession(_ error: Error) async throws {
    setLastError(gymMessage(for: error))
    setDisplayState("error")
    if Self.needsDatInstall(error) {
      try? await Wearables.shared.openDATGlassesAppUpdate()
    }
  }

  private func gymMessage(for error: Error) -> String {
    if let sessionError = error as? DeviceSessionError {
      switch sessionError {
      case .noEligibleDevice:
        return "Glasses not found. Put them on, open Meta AI, turn on Developer Mode, then tap Show on glasses."
      case .datAppOnTheGlassesUpdateRequired:
        return "DAT on the glasses needs an update. Meta AI should open. Keep the glasses on."
      case .dwaUnavailable:
        return "DAT on the glasses is not reachable. Wear them and install DAT from Meta AI."
      default:
        break
      }
    }
    let text = error.localizedDescription
    return text.isEmpty ? "Glasses did not connect." : text
  }

  private func waitForDisplayStarted(seconds: TimeInterval) async throws -> String {
    let deadline = Date().addingTimeInterval(seconds)
    while Date() < deadline {
      let snap = snapshot()
      if snap.displayState == "started" {
        return "started"
      }
      if snap.displayState == "error" {
        let message = snap.lastError.isEmpty ? "Glasses did not connect." : snap.lastError
        if Self.needsDatInstallMessage(message) {
          try? await Wearables.shared.openDATGlassesAppUpdate()
        }
        throw WearablesHudError.connectFailed(message)
      }
      try await Task.sleep(nanoseconds: 250_000_000)
    }
    let err = snapshot().lastError
    let message = err.isEmpty
      ? "Glasses not found. Put them on. In Meta AI turn on Developer Mode, then tap Show on glasses."
      : err
    setLastError(message)
    setDisplayState("error")
    throw WearablesHudError.connectFailed(message)
  }
}
#endif

enum WearablesHudError: Error, LocalizedError {
  case unavailable
  case connectFailed(String)

  var errorDescription: String? {
    switch self {
    case .unavailable:
      return "Meta Wearables SDK is not linked. Lock screen glance still works."
    case .connectFailed(let message):
      return message.isEmpty ? "Glasses did not connect." : message
    }
  }
}
