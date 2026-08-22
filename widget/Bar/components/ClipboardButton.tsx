import { execAsync, Variable, bind } from "astal"
import { Gtk } from "astal/gtk3"
import { Windows } from "../../../services/windows"

export default function ClipboardButton() {
  return <button
    className="sys-item"
    valign={Gtk.Align.CENTER}
    onClicked={() => Windows.toggle("clipboard")}
  >
    <label className="sys-icon" label="󰅌" />
  </button>
}