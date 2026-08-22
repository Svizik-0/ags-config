import { bind, Variable } from "astal"
import Network from "gi://AstalNetwork"
import { Icons } from "../../../lib/icons"

export default function NetworkIndicator() {
  const network = Network.get_default()

  const getIcon = () => {
    const p = network.primary
    if (p === Network.Primary.WIFI) {
      const wifi = network.wifi
      if (!wifi || wifi.state !== Network.DeviceState.ACTIVATED)
        return Icons.network.disconnected
      const s = wifi.strength ?? 0
      if (s > 75) return Icons.network.wifi_full
      if (s > 50) return Icons.network.wifi_high
      if (s > 25) return Icons.network.wifi_medium
      return Icons.network.wifi_low
    }
    if (p === Network.Primary.WIRED) {
      const wired = network.wired
      if (!wired || wired.state !== Network.DeviceState.ACTIVATED)
        return Icons.network.disconnected
      return Icons.network.wired
    }
    return Icons.network.disconnected
  }

  // Реактивна змінна яка оновлюється при будь-якій зміні мережі
  const icon = Variable(getIcon())

  network.connect("notify::primary", () => icon.set(getIcon()))
  network.wifi?.connect("notify::state", () => icon.set(getIcon()))
  network.wifi?.connect("notify::strength", () => icon.set(getIcon()))
  network.wired?.connect("notify::state", () => icon.set(getIcon()))

  return <label
    className="sys-icon"
    label={bind(icon)}
  />
}