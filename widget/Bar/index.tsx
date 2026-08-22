import { App, Astal, Gtk, Gdk } from "astal/gtk3"
import Workspaces from "./components/Workspaces"
import Clock from "./components/Clock"
import BatteryBar from "./components/Battery"
import NetworkIndicator from "./components/Network"
import KeyboardLayout from "./components/KeyboardLayout"
import NotifButton from "./components/NotifButton"
import MediaButton from "./components/MediaButton"
import NixButton from "./components/NixButton"
import GpuButton from "./components/GpuButton"
import ClipboardButton from "./components/ClipboardButton"
import { Windows } from "../../services/windows"

const { TOP, LEFT, RIGHT } = Astal.WindowAnchor

export default function Bar(gdkmonitor: Gdk.Monitor) {
  return (
    <window
      gdkmonitor={gdkmonitor}
      namespace="ags-bar"
      exclusivity={Astal.Exclusivity.EXCLUSIVE}
      layer={Astal.Layer.TOP}
      anchor={TOP | LEFT | RIGHT}
      application={App}
      heightRequest={37}
    >
      <centerbox>
        {/* Лівий бік */}
        <box halign={Gtk.Align.START} spacing={6} margin={6} marginStart={8}>
          <box className="workspaces-island">
            <Workspaces />
          </box>
          <MediaButton />
          <GpuButton />
        </box>

        {/* Центр */}
        <box halign={Gtk.Align.CENTER} valign={Gtk.Align.CENTER}>
          <Clock />
        </box>

        {/* Правий бік */}
        <box halign={Gtk.Align.END} margin={6} marginEnd={8} spacing={4}>
          <box className="system-island" spacing={4}>
            <box className="sys-group">
              <NotifButton />
            </box>
            <ClipboardButton />
            <box className="sys-item" valign={Gtk.Align.CENTER}>
              <KeyboardLayout />
            </box>
            <box className="sys-item" valign={Gtk.Align.CENTER}>
              <NetworkIndicator />
            </box>
            <box className="sys-item" valign={Gtk.Align.CENTER}>
              <BatteryBar />
            </box>
            <button
              className="sys-item nix-item"
              valign={Gtk.Align.CENTER}
              onClicked={() => Windows.toggle("controlcenter")}
            >
              <NixButton />
            </button>
          </box>
        </box>
      </centerbox>
    </window>
  )
}