import { App, Astal, Gtk, Gdk } from "astal/gtk3"
import { Variable, bind } from "astal"
import { Windows } from "../../services/windows"
import { formatMs } from "../../lib/utils"

type Tab = "stopwatch" | "timer"

// ---- Stopwatch ----
function Stopwatch() {
  const running = Variable(false)
  const elapsed = Variable(0)
  let interval: any = null

  const start = () => {
    running.set(true)
    interval = setInterval(() => elapsed.set(elapsed.get() + 100), 100)
  }
  const stop = () => {
    running.set(false)
    clearInterval(interval)
  }
  const reset = () => { stop(); elapsed.set(0) }

  return <box className="tab-content" vertical spacing={16} halign={Gtk.Align.CENTER}>
    <label className="big-time" label={bind(elapsed).as(formatMs)} />
    <box spacing={8} halign={Gtk.Align.CENTER}>
      <button className="ctrl-btn"
        onClicked={() => running.get() ? stop() : start()}
        label={bind(running).as(r => r ? "Pause" : "Start")}
      />
      <button className="ctrl-btn secondary" onClicked={reset} label="Reset" />
    </box>
  </box>
}

// ---- Timer ----
function Timer() {
  const running = Variable(false)
  const remaining = Variable(0)
  const inputMin = Variable("0")
  const inputSec = Variable("0")
  let interval: any = null

  const start = () => {
    const total = parseInt(inputMin.get()) * 60000 + parseInt(inputSec.get()) * 1000
    if (total <= 0) return
    remaining.set(total)
    running.set(true)
    interval = setInterval(() => {
      const next = remaining.get() - 100
      if (next <= 0) {
        remaining.set(0)
        running.set(false)
        clearInterval(interval)
      } else {
        remaining.set(next)
      }
    }, 100)
  }
  const stop = () => { running.set(false); clearInterval(interval) }
  const reset = () => { stop(); remaining.set(0) }

  const formatTimer = (ms: number) => {
    const m = Math.floor(ms / 60000)
    const s = Math.floor((ms % 60000) / 1000)
    return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`
  }

  return <box className="tab-content" vertical spacing={16} halign={Gtk.Align.CENTER}>
    {bind(running).as(r => r || remaining.get() > 0
      ? <label className="big-time" label={bind(remaining).as(formatTimer)} />
      : <box spacing={8} halign={Gtk.Align.CENTER}>
        <entry className="time-input"
          text={bind(inputMin)}
          onChanged={e => inputMin.set(e.text)}
          placeholderText="min"
          maxWidthChars={3}
        />
        <label label=":" className="time-sep" />
        <entry className="time-input"
          text={bind(inputSec)}
          onChanged={e => inputSec.set(e.text)}
          placeholderText="sec"
          maxWidthChars={3}
        />
      </box>
    )}
    <box spacing={8} halign={Gtk.Align.CENTER}>
      <button className="ctrl-btn"
        onClicked={() => running.get() ? stop() : start()}
        label={bind(running).as(r => r ? "Pause" : "Start")}
      />
      <button className="ctrl-btn secondary" onClicked={reset} label="Reset" />
    </box>
  </box>
}

// ---- Головне вікно ----
export default function ClockMenu(gdkmonitor: Gdk.Monitor) {
  const { TOP } = Astal.WindowAnchor
  const visible = Windows.get("clockmenu")
  const tab = Variable<Tab>("stopwatch")

  const tabs: { id: Tab, label: string }[] = [
    { id: "stopwatch", label: "Stopwatch" },
    { id: "timer", label: "Timer" },
  ]

  return <window
    namespace="ags-clockmenu"
    gdkmonitor={gdkmonitor}
    anchor={TOP}
    exclusivity={Astal.Exclusivity.NORMAL}
    visible={bind(visible)}
    application={App}
    marginTop={5}
    keymode={Astal.Keymode.ON_DEMAND}
    onKeyPressEvent={(_, event) => {
      if (event.get_keyval()[1] === 65307) Windows.close("clockmenu")
    }}
  >
    <box className="clock-menu" vertical spacing={12}>
      <box className="clock-tabs" spacing={4} halign={Gtk.Align.CENTER}>
        {tabs.map(t =>
          <button
            className={bind(tab).as(ct => ct === t.id ? "tab-btn active" : "tab-btn")}
            onClicked={() => tab.set(t.id)}
            label={t.label}
          />
        )}
      </box>
      {bind(tab).as(t => t === "stopwatch" ? <Stopwatch /> : <Timer />)}
    </box>
  </window>
}