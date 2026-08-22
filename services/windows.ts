import { Variable } from "astal"

type WindowName =
  | "calendar"
  | "clockmenu"
  | "mediaplayer"
  | "notifcenter"
  | "controlcenter"
  | "sysinfo"
  | "clipboard"
  | "launcher"
  | "powermenu"
  | "dashboard"
  | "lockscreen"
  | "wallpaper"
  | "themeswitcher"

class WindowManager {
  private states = new Map<WindowName, Variable<boolean>>()

  get(name: WindowName): Variable<boolean> {
    if (!this.states.has(name)) {
      this.states.set(name, Variable(false))
    }
    return this.states.get(name)!
  }

  toggle(name: WindowName) {
    const state = this.get(name)
    state.set(!state.get())
  }

  open(name: WindowName) {
    this.get(name).set(true)
  }

  close(name: WindowName) {
    this.get(name).set(false)
  }

  closeAll() {
    this.states.forEach(state => state.set(false))
  }
}

export const Windows = new WindowManager()