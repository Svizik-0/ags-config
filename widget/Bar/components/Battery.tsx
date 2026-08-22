import { Gtk } from "astal/gtk3"
import { bind, Variable } from "astal"
import Battery from "gi://AstalBattery"
import { Icons } from "../../../lib/icons"

export default function BatteryBar() {
  const bat = Battery.get_default()

  const isCharging = () =>
    bat.charging || bat.state === Battery.State.CHARGING

  const getIcon = () => {
    const p = bat.percentage
    if (p > 0.9) return Icons.battery.full
    if (p > 0.7) return Icons.battery.high
    if (p > 0.5) return Icons.battery.medium
    if (p > 0.3) return Icons.battery.low
    if (p > 0.1) return Icons.battery.critical
    return Icons.battery.empty
  }

  const getClass = () => {
    const p = bat.percentage
    const level = p > 0.5 ? "battery-high" : p > 0.2 ? "battery-medium" : "battery-low"
    return isCharging() ? `${level} battery-charging` : level
  }

  const icon = Variable(getIcon())
  const className = Variable(getClass())
  const charging = Variable(isCharging())

  const refresh = () => {
    icon.set(getIcon())
    className.set(getClass())
    charging.set(isCharging())
  }

  bat.connect("notify::percentage", refresh)
  bat.connect("notify::charging", refresh)
  bat.connect("notify::state", refresh)

  return <box
    visible={bind(bat, "isPresent")}
    className={bind(className)}
    spacing={4}
  >
    <box spacing={2} valign={Gtk.Align.CENTER}>
      <label className="sys-icon battery-icon" label={bind(icon)} />
      <label
        className="battery-charge-mark"
        label={Icons.battery.charging}
        visible={bind(charging)}
      />
    </box>
    <label label={bind(bat, "percentage").as(p => `${Math.round(p * 100)}%`)} />
  </box>
}
