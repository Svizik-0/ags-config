import { Variable, bind } from "astal"
import Hyprland from "gi://AstalHyprland"

const hypr = Hyprland.get_default()

const SHORT_NAMES: Record<string, string> = {
  "English": "EN",
  "Ukrainian": "UA",
  "Russian": "RU",
  "German": "DE",
  "French": "FR",
  "Polish": "PL",
}

export default function KeyboardLayout() {
  const layout = Variable("EN")

  hypr.connect("keyboard-layout", (_, _name, layoutName) => {
    const key = layoutName.split(" ")[0]
    layout.set(SHORT_NAMES[key] ?? key.slice(0, 2).toUpperCase())
  })

  return <label label={bind(layout)} />
}