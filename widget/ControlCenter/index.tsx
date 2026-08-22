import { App, Astal, Gtk, Gdk } from "astal/gtk3"
import { Variable, bind, execAsync } from "astal"
import Network from "gi://AstalNetwork"
import Bluetooth from "gi://AstalBluetooth"
import Wp from "gi://AstalWp"
import { Windows } from "../../services/windows"
import { Icons } from "../../lib/icons"
import {
  nightMode,
  nightTemp,
  autoSchedule,
  startTime,
  endTime,
  toggleNightMode,
  setStartTime,
  setEndTime,
} from "../../services/nightmode"

// ── WiFi Toggle (icon only) ─────────────────────────────────────────────────
function WifiToggle({ showNetworks }: { showNetworks: Variable<boolean> }) {
  const network = Network.get_default()
  const wifi = network.wifi

  const getIcon = () => {
    if (!wifi?.enabled) return Icons.network.wifi_off
    if (wifi.state !== Network.DeviceState.ACTIVATED) return Icons.network.disconnected
    const strength = wifi.strength ?? wifi.activeAccessPoint?.strength ?? 0
    if (strength > 75) return Icons.network.wifi_full
    if (strength > 50) return Icons.network.wifi_high
    if (strength > 25) return Icons.network.wifi_medium
    return Icons.network.wifi_low
  }

  const active = Variable(wifi?.enabled ?? false)
  const icon = Variable(getIcon())
  const refresh = () => {
    active.set(wifi?.enabled ?? false)
    icon.set(getIcon())
  }

  wifi?.connect("notify::enabled", refresh)
  wifi?.connect("notify::state", refresh)
  wifi?.connect("notify::strength", refresh)
  wifi?.connect("notify::active-access-point", refresh)
  network.connect("notify::primary", refresh)

  return <button
    className={bind(active).as(a => a ? "cc-toggle active" : "cc-toggle")}
    hexpand
    onClicked={() => { if (wifi) wifi.enabled = !wifi.enabled }}
    onButtonPressEvent={(_, event) => {
      if (event.get_button()[1] === 3) showNetworks.set(!showNetworks.get())
    }}
    tooltipText="WiFi (right-click for networks)"
  >
    <box halign={Gtk.Align.CENTER}>
      <label className="cc-toggle-icon" label={bind(icon)} />
    </box>
  </button>
}

// ── Bluetooth Toggle (icon only) ────────────────────────────────────────────
function BluetoothToggle({ showDevices }: { showDevices: Variable<boolean> }) {
  const bt = Bluetooth.get_default()
  const active = Variable(bt.isPowered)
  bt.connect("notify::is-powered", () => active.set(bt.isPowered))
  return <button
    className={bind(active).as(a => a ? "cc-toggle active" : "cc-toggle")}
    hexpand
    onClicked={() => bt.toggle()}
    onButtonPressEvent={(_, event) => {
      if (event.get_button()[1] === 3) showDevices.set(!showDevices.get())
    }}
    tooltipText="Bluetooth (right-click for devices)"
  >
    <box halign={Gtk.Align.CENTER}>
      <label className="cc-toggle-icon" label="󰂯" />
    </box>
  </button>
}

// ── Ethernet Toggle (icon only) ─────────────────────────────────────────────
function EthernetToggle({ showDetails }: { showDetails: Variable<boolean> }) {
  const network = Network.get_default()
  const wired = network.wired

  const connected = Variable(wired?.state === Network.DeviceState.ACTIVATED)
  const refresh = () => connected.set(wired?.state === Network.DeviceState.ACTIVATED)
  wired?.connect("notify::state", refresh)
  network.connect("notify::primary", refresh)

  return <button
    className={bind(connected).as(c => c ? "cc-toggle active" : "cc-toggle")}
    hexpand
    onClicked={() => {
      if (!wired?.device) return
      const iface = (wired.device as any).interface
      if (wired.state !== Network.DeviceState.ACTIVATED)
        execAsync(["nmcli", "device", "connect", iface]).catch(() => { })
    }}
    onButtonPressEvent={(_, event) => {
      if (event.get_button()[1] === 3) showDetails.set(!showDetails.get())
    }}
    tooltipText="Ethernet (right-click for details)"
  >
    <box halign={Gtk.Align.CENTER}>
      <label className="cc-toggle-icon" label={Icons.network.wired} />
    </box>
  </button>
}

// ── Night Mode Toggle (icon only, ПКМ → налаштування) ───────────────────────
function NightModeToggle({ showSettings }: { showSettings: Variable<boolean> }) {
  return <button
    className={bind(nightMode).as(on => on ? "cc-toggle active" : "cc-toggle")}
    hexpand
    onClicked={toggleNightMode}
    onButtonPressEvent={(_, event) => {
      if (event.get_button()[1] === 3) showSettings.set(!showSettings.get())
    }}
    tooltipText="Night Mode (right-click for settings)"
  >
    <box halign={Gtk.Align.CENTER}>
      <label className="cc-toggle-icon" label={bind(nightMode).as(on => on ? "󰖝" : "󰖜")} />
    </box>
  </button>
}

// ── Night Mode Settings (розкривна панель) ──────────────────────────────────
function NightModeSettings() {
  return <box vertical spacing={10}>
    <label className="cc-section-title" label="Night Mode" halign={Gtk.Align.START} />

    {/* Тепло кольору */}
    <box className="cc-row" spacing={12}>
      <label className="cc-row-icon" label="󰗌" />
      <box vertical hexpand spacing={6}>
        <box>
          <label className="cc-row-title" label="Warmth" hexpand halign={Gtk.Align.START} />
          <label className="cc-row-value" label={bind(nightTemp).as(t => `${t}K`)} />
        </box>
        <slider
          className="cc-slider-warm"
          hexpand min={2500} max={6500}
          value={bind(nightTemp)}
          onChangeValue={({ value }) => nightTemp.set(Math.round(value))}
          setup={(self) => {
            self.connect("map", () => {
              self.set_value(nightTemp.get())
            })
          }}
        />
      </box>
    </box>

    <box className="cc-divider cc-divider-soft" />

    {/* Авто-розклад */}
    <box spacing={12} className="cc-schedule-header">
      <label className="cc-row-icon" label="󰥔" />
      <label className="cc-row-title" label="Auto schedule" hexpand halign={Gtk.Align.START} />
      <button
        className={bind(autoSchedule).as(on => on ? "cc-switch on" : "cc-switch")}
        onClicked={() => autoSchedule.set(!autoSchedule.get())}
      >
        <box
          className="cc-switch-knob"
          halign={bind(autoSchedule).as(on => on ? Gtk.Align.END : Gtk.Align.START)}
          valign={Gtk.Align.CENTER}
        />
      </button>
    </box>

    {/* Час старту / завершення */}
    {bind(autoSchedule).as(on => on
      ? <box className="cc-schedule-times" vertical spacing={2}>
        <box className="cc-schedule-row" spacing={10}>
          <label className="cc-row-icon" label="󰖔" />
          <label className="cc-row-title" label="Start" hexpand halign={Gtk.Align.START} />
          <entry
            className="cc-time-entry"
            text={bind(startTime)}
            maxWidthChars={5}
            xalign={0.5}
            onActivate={(self) => setStartTime(self.text)}
            onFocusOutEvent={(self) => { setStartTime((self as any).text); return false }}
          />
        </box>
        <box className="cc-schedule-row" spacing={10}>
          <label className="cc-row-icon" label="󰖨" />
          <label className="cc-row-title" label="End" hexpand halign={Gtk.Align.START} />
          <entry
            className="cc-time-entry"
            text={bind(endTime)}
            maxWidthChars={5}
            xalign={0.5}
            onActivate={(self) => setEndTime(self.text)}
            onFocusOutEvent={(self) => { setEndTime((self as any).text); return false }}
          />
        </box>
      </box>
      : <box />
    )}
  </box>
}

// ── Wired Details ───────────────────────────────────────────────────────────
function WiredDetails() {
  const network = Network.get_default()
  const wired = network.wired
  const status = Variable("")

  const getInfo = () => {
    if (!wired) return { iface: "—", speed: "—", connection: "Unavailable" }
    const device = wired.device as any
    const speed = wired.speed > 0 ? `${wired.speed} Mb/s` : "—"
    const connection = device?.activeConnection?.id ?? "Not connected"
    return { iface: device?.interface ?? "—", speed, connection }
  }

  const info = Variable(getInfo())
  const refresh = () => info.set(getInfo())
  wired?.connect("notify::state", refresh)
  wired?.connect("notify::speed", refresh)

  if (!wired) return <label className="cc-bt-empty" label="Ethernet unavailable" />

  return <box vertical spacing={4}>
    <box spacing={8}>
      <label className="cc-section-title" label="Ethernet" hexpand halign={Gtk.Align.START} />
      <button className="cc-manage-btn" onClicked={() =>
        execAsync(["nm-connection-editor"]).catch(() => status.set("nm-connection-editor not available"))
      }>
        <box spacing={4}>
          <label label="󰒓" />
          <label label="Manage" />
        </box>
      </button>
    </box>
    {bind(info).as(({ iface, speed, connection }) =>
      <box vertical spacing={4}>
        <button className={wired.state === Network.DeviceState.ACTIVATED ? "cc-bt-device connected" : "cc-bt-device"}>
          <box spacing={8}>
            <label className="cc-bt-icon" label={Icons.network.wired} />
            <box vertical hexpand halign={Gtk.Align.START}>
              <label className="cc-bt-name" label={connection} halign={Gtk.Align.START} ellipsize={3} maxWidthChars={24} />
              <label className="cc-wifi-status" label={`${iface} · ${speed}`} halign={Gtk.Align.START} />
            </box>
            {wired.state === Network.DeviceState.ACTIVATED ? <label className="cc-bt-connected" label="󰄬" /> : <box />}
          </box>
        </button>
      </box>
    )}
    {bind(status).as(text => text ? <label className="cc-wifi-status" label={text} halign={Gtk.Align.START} /> : <box />)}
  </box>
}

// ── WiFi Password Dialog ────────────────────────────────────────────────────
function WifiPasswordDialog({
  ssid,
  onConnect,
  onCancel,
}: {
  ssid: string
  onConnect: (password: string) => void
  onCancel: () => void
}) {
  const password = Variable("")
  const showPassword = Variable(false)

  return <box className="cc-wifi-dialog" vertical spacing={12}>
    <box spacing={8}>
      <label className="cc-toggle-icon" label="󰌾" />
      <box vertical hexpand>
        <label className="cc-section-title" label="Enter Password" halign={Gtk.Align.START} />
        <label className="cc-wifi-status" label={ssid} halign={Gtk.Align.START} ellipsize={3} maxWidthChars={28} />
      </box>
    </box>

    <box className="cc-password-field" spacing={8}>
      <entry
        className="cc-password-entry"
        hexpand
        placeholderText="Password"
        visibility={bind(showPassword)}
        text={bind(password)}
        onChanged={(self) => password.set(self.text)}
        onActivate={() => onConnect(password.get())}
      />
      <button
        className="cc-password-eye"
        onClicked={() => showPassword.set(!showPassword.get())}
      >
        <label label={bind(showPassword).as(s => s ? "󰈈" : "󰈉")} />
      </button>
    </box>

    <box spacing={8} homogeneous>
      <button className="cc-dialog-btn cc-dialog-cancel" onClicked={onCancel}>
        <label label="Cancel" />
      </button>
      <button className="cc-dialog-btn cc-dialog-connect" onClicked={() => onConnect(password.get())}>
        <box spacing={6} halign={Gtk.Align.CENTER}>
          <label label="󰌾" />
          <label label="Connect" />
        </box>
      </button>
    </box>
  </box>
}

// ── WiFi Networks ───────────────────────────────────────────────────────────
function WifiNetworks() {
  const network = Network.get_default()
  const wifi = network.wifi
  const scanning = Variable(false)
  const status = Variable("")
  const connectingTo = Variable<string | null>(null)
  const passwordSsid = Variable<string | null>(null)

  const scan = () => {
    if (!wifi || scanning.get()) return
    scanning.set(true)
    status.set("")
    wifi.scan()
    setTimeout(() => scanning.set(false), 3000)
  }

  const connectOpen = (ssid: string) => {
    connectingTo.set(ssid)
    status.set("")
    execAsync(["nmcli", "device", "wifi", "connect", ssid])
      .then(() => {
        status.set(`Connected to ${ssid}`)
        connectingTo.set(null)
      })
      .catch(() => {
        status.set("Connection failed")
        connectingTo.set(null)
      })
  }

  const connectWithPassword = (ssid: string, password: string) => {
    passwordSsid.set(null)
    connectingTo.set(ssid)
    status.set("")
    execAsync(["nmcli", "device", "wifi", "connect", ssid, "password", password])
      .then(() => {
        status.set(`Connected to ${ssid}`)
        connectingTo.set(null)
      })
      .catch(() => {
        status.set("Wrong password or connection failed")
        connectingTo.set(null)
      })
  }

  if (wifi) scan()

  const getWifiIcon = (s: number) =>
    s > 75 ? Icons.network.wifi_full :
      s > 50 ? Icons.network.wifi_high :
        s > 25 ? Icons.network.wifi_medium :
          Icons.network.wifi_low

  if (!wifi) return <label className="cc-bt-empty" label="WiFi unavailable" />

  return <box vertical spacing={8}>

    {/* Header */}
    <box spacing={8}>
      <label className="cc-section-title" label="Networks" hexpand halign={Gtk.Align.START} />
      <button className="cc-scan-btn" onClicked={scan} tooltipText="Scan">
        <label label={bind(scanning).as(s => s ? "󰑐" : "󰑓")} />
      </button>
      <button className="cc-manage-btn" onClicked={() =>
        execAsync(["nm-connection-editor"]).catch(() => status.set("nm-connection-editor not available"))
      }>
        <box spacing={4}>
          <label label="󰒓" />
          <label label="Manage" />
        </box>
      </button>
    </box>

    {/* Status */}
    {bind(status).as(text => text
      ? <box className="cc-wifi-status-bar" spacing={6}>
        <label label={text.startsWith("Connected") ? "󰄬" : "󰅙"} className={text.startsWith("Connected") ? "cc-status-ok" : "cc-status-err"} />
        <label className="cc-wifi-status" label={text} halign={Gtk.Align.START} />
      </box>
      : <box />
    )}

    {/* Password dialog */}
    {bind(passwordSsid).as(ssid => ssid
      ? <WifiPasswordDialog
        ssid={ssid}
        onConnect={(pw) => connectWithPassword(ssid, pw)}
        onCancel={() => passwordSsid.set(null)}
      />
      : <box />
    )}

    {/* Network list */}
    {bind(wifi, "accessPoints").as(aps => {
      const known = new Map<string, any>()
      aps
        .filter((ap: any) => ap.ssid)
        .sort((a: any, b: any) => b.strength - a.strength)
        .forEach((ap: any) => { if (!known.has(ap.ssid)) known.set(ap.ssid, ap) })

      const filtered = Array.from(known.values()).slice(0, 8)
      if (filtered.length === 0)
        return <label className="cc-bt-empty" label="No networks found. Try scanning." />

      return <box vertical spacing={2}>
        {filtered.map((ap: any) => {
          const isActive = wifi.activeAccessPoint?.ssid === ap.ssid
          const isLocked = !!(ap.flags & 4)

          return <button
            className={isActive ? "cc-wifi-network connected" : "cc-wifi-network"}
            onClicked={() => {
              if (isActive) return
              if (isLocked) passwordSsid.set(ap.ssid)
              else connectOpen(ap.ssid)
            }}
          >
            <box spacing={10}>
              <label className="cc-wifi-signal-icon" label={getWifiIcon(ap.strength)} />
              <box vertical hexpand halign={Gtk.Align.START}>
                <label
                  className="cc-bt-name"
                  label={ap.ssid}
                  halign={Gtk.Align.START}
                  ellipsize={3}
                  maxWidthChars={22}
                />
                <label
                  className="cc-wifi-meta"
                  label={`${ap.strength}%${isLocked ? " · secured" : " · open"}`}
                  halign={Gtk.Align.START}
                />
              </box>
              <box spacing={4}>
                {isLocked ? <label className="cc-wifi-lock" label="󰌾" /> : <box />}
                {isActive
                  ? <label className="cc-bt-connected" label="󰄬" />
                  : bind(connectingTo).as(c => c === ap.ssid
                    ? <label className="cc-wifi-connecting" label="󰑐" />
                    : <box />
                  )
                }
              </box>
            </box>
          </button>
        })}
      </box>
    })}
  </box>
}

// ── Bluetooth Devices ───────────────────────────────────────────────────────
function BluetoothDevices() {
  const bt = Bluetooth.get_default()
  return <box vertical spacing={4}>
    <label className="cc-section-title" label="Devices" halign={Gtk.Align.START} />
    {bind(bt, "devices").as(devices => {
      const paired = devices.filter((d: any) => d.paired)
      if (paired.length === 0) return <label className="cc-bt-empty" label="No paired devices" />
      return paired.map((device: any) =>
        <button
          className={device.connected ? "cc-bt-device connected" : "cc-bt-device"}
          onClicked={() => {
            if (device.connected)
              execAsync(["bash", "-c", `bluetoothctl disconnect ${device.address}`])
            else
              execAsync(["bash", "-c", `bluetoothctl connect ${device.address}`])
          }}
        >
          <box spacing={8}>
            <label className="cc-bt-icon" label={
              device.icon?.includes("phone") ? "󰄜" :
                device.icon?.includes("headset") ? "󰋋" :
                  device.icon?.includes("audio") ? "󰋋" :
                    device.icon?.includes("keyboard") ? "󰌌" :
                      device.icon?.includes("mouse") ? "󰍽" : "󰂯"
            } />
            <label className="cc-bt-name" label={device.alias ?? device.name ?? "Unknown"} hexpand halign={Gtk.Align.START} />
            {device.connected ? <label className="cc-bt-connected" label="󰄬" /> : <box />}
          </box>
        </button>
      )
    })}
  </box>
}

// ── App Streams ─────────────────────────────────────────────────────────────
function AppStreams() {
  const wp = Wp.get_default()
  const audio = wp?.audio

  const getAppIcon = (name: string) => {
    const n = (name ?? "").toLowerCase()
    if (n.includes("firefox") || n.includes("browser")) return "󰈹"
    if (n.includes("chrome") || n.includes("chromium")) return "󰊯"
    if (n.includes("spotify") || n.includes("music")) return "󰎇"
    if (n.includes("mpv") || n.includes("vlc") || n.includes("video")) return "󰕧"
    if (n.includes("discord") || n.includes("telegram")) return "󰙯"
    if (n.includes("game") || n.includes("steam")) return "󰺷"
    return "󰓃"
  }

  if (!audio) return <label className="cc-bt-empty" label="Audio unavailable" />

  return <box vertical spacing={8}>
    <label className="cc-streams-heading" label="App Volume" halign={Gtk.Align.START} />
    {bind(audio, "streams").as((streams: any[]) => {
      const visible = streams.filter((s: any) => !s.corked && s.name !== "sink-input-by-media-role:event")
      if (visible.length === 0)
        return <label className="cc-bt-empty" label="No active streams" />
      return visible.map((stream: any) =>
        <box className="cc-row" spacing={12}>
          <label
            className="cc-row-icon"
            label={bind(stream, "mute").as((m: boolean) =>
              m ? "󰝟" : getAppIcon(stream.description ?? stream.name ?? "")
            )}
          />
          <box vertical hexpand spacing={6}>
            <box>
              <label
                className="cc-row-title"
                label={stream.description ?? stream.name ?? "Unknown"}
                hexpand
                halign={Gtk.Align.START}
                ellipsize={3}
                maxWidthChars={22}
              />
              <label
                className="cc-row-value"
                label={bind(stream, "volume").as((v: number) => `${Math.round(v * 100)}%`)}
              />
            </box>
            <slider
              className="cc-slider"
              hexpand
              min={0} max={1}
              value={bind(stream, "volume")}
              onChangeValue={({ value }: { value: number }) => { stream.volume = value }}
            />
          </box>
        </box>
      )
    })}
  </box>
}

// ── Volume Row (right-click → streams) ─────────────────────────────────────
function VolumeRow({ showStreams }: { showStreams: Variable<boolean> }) {
  const wp = Wp.get_default()
  const speaker = wp?.audio?.defaultSpeaker
  if (!speaker) return <box />

  const getIcon = (vol: number, muted: boolean) => {
    if (muted || vol === 0) return "󰝟"
    if (vol < 0.33) return "󰕿"
    if (vol < 0.66) return "󰖀"
    return "󰕾"
  }

  return <box
    className="cc-row"
    spacing={12}
    onButtonPressEvent={(_, event) => {
      if (event.get_button()[1] === 3) showStreams.set(!showStreams.get())
    }}
    tooltipText="Right-click for app volumes"
  >
    <label
      className="cc-row-icon"
      label={bind(speaker, "mute").as(m => getIcon(speaker.volume, m))}
    />
    <box vertical hexpand spacing={6}>
      <box>
        <label className="cc-row-title" label="Volume" hexpand halign={Gtk.Align.START} />
        <label className="cc-row-value" label={bind(speaker, "volume").as(v => `${Math.round(v * 100)}%`)} />
      </box>
      <slider
        className="cc-slider"
        hexpand min={0} max={1}
        value={bind(speaker, "volume")}
        onChangeValue={({ value }) => { speaker.volume = value }}
      />
    </box>
  </box>
}

// ── Mic Row ─────────────────────────────────────────────────────────────────
function MicRow() {
  const wp = Wp.get_default()
  const mic = wp?.audio?.defaultMicrophone
  if (!mic) return <box />

  const getMicIcon = (muted: boolean) => muted ? "󰍭" : "󰍬"

  return <box className="cc-row" spacing={12}>
    <label
      className="cc-row-icon"
      label={bind(mic, "mute").as(m => getMicIcon(m))}
    />
    <box vertical hexpand spacing={6}>
      <box>
        <label className="cc-row-title" label="Microphone" hexpand halign={Gtk.Align.START} />
        <label className="cc-row-value" label={bind(mic, "volume").as(v => `${Math.round(v * 100)}%`)} />
      </box>
      <slider
        className="cc-slider cc-slider-mic"
        hexpand min={0} max={1}
        value={bind(mic, "volume")}
        onChangeValue={({ value }) => { mic.volume = value }}
      />
    </box>
  </box>
}

// ── Brightness Row ──────────────────────────────────────────────────────────
function BrightnessRow() {
  const value = Variable(0)
  execAsync(["brightnessctl", "g"]).then(out =>
    execAsync(["brightnessctl", "m"]).then(max =>
      value.set(Math.round((parseInt(out) / parseInt(max)) * 100))
    )
  ).catch(() => value.set(100))

  return <box className="cc-row" spacing={12}>
    <label className="cc-row-icon" label="󰃟" />
    <box vertical hexpand spacing={6}>
      <box>
        <label className="cc-row-title" label="Brightness" hexpand halign={Gtk.Align.START} />
        <label className="cc-row-value" label={bind(value).as(v => `${v}%`)} />
      </box>
      <slider
        className="cc-slider"
        hexpand min={0} max={100}
        value={bind(value)}
        onChangeValue={({ value: v }) => {
          const val = Math.round(v)
          value.set(val)
          execAsync(["brightnessctl", "set", `${val}%`]).catch(() => { })
        }}
      />
    </box>
  </box>
}

// ── Control Center Window ───────────────────────────────────────────────────
export default function ControlCenter(gdkmonitor: Gdk.Monitor) {
  const { TOP, RIGHT } = Astal.WindowAnchor
  const visible = Windows.get("controlcenter")
  const showNetworks = Variable(false)
  const showBtDevices = Variable(false)
  const showWiredDetails = Variable(false)
  const showNightSettings = Variable(false)
  const showStreams = Variable(false)

  return <window
    namespace="ags-controlcenter"
    gdkmonitor={gdkmonitor}
    anchor={TOP | RIGHT}
    exclusivity={Astal.Exclusivity.NORMAL}
    visible={bind(visible)}
    application={App}
    margin={5}
    marginEnd={8}
    keymode={Astal.Keymode.ON_DEMAND}
    onKeyPressEvent={(_, event) => {
      if (event.get_keyval()[1] === 65307) Windows.close("controlcenter")
    }}
  >
    <box className="control-center" vertical spacing={12}>

      {/* Power buttons */}
      <box spacing={6} homogeneous>
        {([
          ["󰌾", ["bash", "-c", "loginctl lock-session $XDG_SESSION_ID"], "Lock"],
          ["󰤄", ["systemctl", "suspend"], "Suspend"],
          ["󰜉", ["systemctl", "reboot"], "Reboot"],
          ["󰐥", ["systemctl", "poweroff"], "Power off"],
        ] as [string, string[], string][]).map(([icon, cmd, tip]) =>
          <button
            className="cc-power-btn"
            tooltipText={tip}
            onClicked={() => execAsync(cmd).catch(() => { })}
          >
            <label className="cc-power-icon" label={icon} halign={Gtk.Align.CENTER} hexpand />
          </button>
        )}
      </box>

      <box className="cc-divider" />

      {/* Network + BT + Night Mode toggles — icon-only, в один ряд */}
      <box spacing={8} homogeneous>
        <WifiToggle showNetworks={showNetworks} />
        <BluetoothToggle showDevices={showBtDevices} />
        <EthernetToggle showDetails={showWiredDetails} />
        <NightModeToggle showSettings={showNightSettings} />
      </box>

      {/* Expandable panels */}
      {bind(showNetworks).as(show => show
        ? <box vertical spacing={4}><box className="cc-divider" /><WifiNetworks /></box>
        : <box />
      )}
      {bind(showBtDevices).as(show => show
        ? <box vertical spacing={4}><box className="cc-divider" /><BluetoothDevices /></box>
        : <box />
      )}
      {bind(showWiredDetails).as(show => show
        ? <box vertical spacing={4}><box className="cc-divider" /><WiredDetails /></box>
        : <box />
      )}
      <box vertical spacing={4} visible={bind(showNightSettings)}>
        <box className="cc-divider" />
        <NightModeSettings />
      </box>

      <box className="cc-divider" />

      {/* Sliders */}
      <box vertical spacing={8}>

        <box className="cc-card" vertical spacing={0}>
          <MicRow />
        </box>

        <box className="cc-card" vertical spacing={0}>
          <VolumeRow showStreams={showStreams} />
          {bind(showStreams).as(show => show
            ? <box vertical spacing={0}>
              <box className="cc-divider cc-divider-soft" marginTop={8} marginBottom={4} />
              <AppStreams />
            </box>
            : <box />
          )}
        </box>

        <box className="cc-card" vertical spacing={0}>
          <BrightnessRow />
        </box>

      </box>

    </box>
  </window>
}