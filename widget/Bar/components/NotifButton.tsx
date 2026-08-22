import { Variable, bind } from "astal"
import Notifd from "gi://AstalNotifd"
import { Icons } from "../../../lib/icons"
import { Windows } from "../../../services/windows"

export default function NotifButton() {
  const notifd = Notifd.get_default()
  const count = Variable(0)

  notifd.connect("notified", () => count.set(notifd.notifications.length))
  notifd.connect("resolved", () => count.set(notifd.notifications.length))

  return (
    <button
      className="sys-item"
      valign={1} // Gtk.Align.CENTER
      onClicked={() => Windows.toggle("notifcenter")}
    >
      <box spacing={4}>
        <label className="sys-icon" label={Icons.notif.bell} />
        {bind(count).as(c => c > 0
          ? <label label={String(c)} />
          : <box />
        )}
      </box>
    </button>
  )
}