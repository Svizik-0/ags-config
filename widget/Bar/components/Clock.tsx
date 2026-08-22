import { Variable, bind } from "astal"
import { App, Astal, Gtk, Gdk } from "astal/gtk3"
import { Windows } from "../../../services/windows"

export default function Clock() {
  const time = Variable("").poll(1000, ["date", "+%H:%M"])
  const date = Variable("").poll(1000, ["bash", "-c", "LC_TIME=C date '+%A · %d/%m'"])

  return <button
    className="clock-island"
    valign={Gtk.Align.CENTER}
    onClicked={() => Windows.toggle("calendar")}
  >
    <box spacing={7}>
      <label className="clock-time" label={bind(time)} />
      <label className="clock-sep" label="•" />
      <label className="clock-date" label={bind(date)} />
    </box>
  </button>
}