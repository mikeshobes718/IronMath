import ExpoModulesCore

public class IronMathWearablesModule: Module {
  public func definition() -> ModuleDefinition {
    Name("IronMathWearables")
    Events("onHudAction")

    OnCreate {
      WearablesHud.actionHandler = { [weak self] body in
        self?.sendEvent("onHudAction", body)
      }
    }

    AsyncFunction("configure") {
      try await WearablesHud.shared.configure()
    }

    AsyncFunction("startRegistration") {
      try await WearablesHud.shared.startRegistration()
    }

    AsyncFunction("startUnregistration") {
      try await WearablesHud.shared.startUnregistration()
    }

    AsyncFunction("handleUrl") { (url: String) in
      try await WearablesHud.shared.handleUrl(url)
    }

    AsyncFunction("connectDisplay") {
      try await WearablesHud.shared.connectDisplay()
    }

    AsyncFunction("disconnectDisplay") {
      await WearablesHud.shared.disconnectDisplay()
      return "stopped"
    }

    AsyncFunction("sendHud") { (payload: [String: String]) in
      try await WearablesHud.shared.sendHud(HudFields(from: payload))
    }

    AsyncFunction("openGlassesAppUpdate") {
      try await WearablesHud.shared.openGlassesAppUpdate()
    }

    Function("getStatus") {
      WearablesHud.shared.status()
    }
  }
}
