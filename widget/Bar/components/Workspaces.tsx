import { Gtk } from "astal/gtk3"
import { bind } from "astal"
import Hyprland from "gi://AstalHyprland"

const hypr = Hyprland.get_default()

export default function Workspaces() {
  const focused = bind(hypr, "focusedWorkspace")

  return (
    <box
      className="workspaces-island"
      spacing={0}
      valign={Gtk.Align.CENTER}
    >
      {bind(hypr, "workspaces").as((wss: any[]) => {
        const sorted = wss.sort((a, b) => a.id - b.id)
        const result: any[] = []

        sorted.forEach((ws: any, i: number) => {
          result.push(
            <button
              setup={(self) => {
                const fw = hypr.focusedWorkspace
                self.className = fw && fw.id === ws.id ? "workspace active" : "workspace"

                focused.subscribe((fw: any) => {
                  const isActive = fw && fw.id === ws.id
                  const newClass = isActive ? "workspace active" : "workspace"
                  if (self.className !== newClass) {
                    self.className = newClass
                    self.get_style_context().invalidate()
                    self.queue_draw()
                  }
                })
              }}
              onClicked={() => hypr.dispatch("workspace", String(ws.id))}
              valign={Gtk.Align.CENTER}
            >
              <label label={String(ws.id)} />
            </button>
          )

          if (i < sorted.length - 1) {
            result.push(
              <label
                className="ws-sep"
                label="|"
                valign={Gtk.Align.CENTER}
              />
            )
          }
        })

        return result
      })}
    </box>
  )
}