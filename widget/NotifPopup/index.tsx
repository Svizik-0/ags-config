import { App, Astal, Gtk, Gdk } from "astal/gtk3"
import { Variable, bind } from "astal"
import Notifd from "gi://AstalNotifd"
import { stripHtml } from "../../lib/utils"
import { Icons } from "../../lib/icons"
import type { Notification } from "../../lib/types"

const POPUP_TIMEOUT = 5000

function NotifPopupCard({
  n,
  onDismiss,
}: {
  n: Notification
  onDismiss: () => void
}) {
  const time = new Date(n.time * 1000)
    .toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })

  return <box className="notif-popup-card" spacing={8}>
    <box vertical spacing={4} hexpand>
      <box spacing={8}>
        <label className="notif-app"
          label={stripHtml(n.app_name ?? "Unknown")}
          halign={Gtk.Align.START}
        />
        <label className="notif-time"
          label={time}
          halign={Gtk.Align.END}
          hexpand
        />
      </box>
      <label className="notif-summary"
        label={stripHtml(n.summary ?? "")}
        halign={Gtk.Align.START}
        wrap
      />
      {n.body
        ? <label className="notif-body"
          label={stripHtml(n.body)}
          halign={Gtk.Align.START}
          wrap
        />
        : <box />
      }
    </box>
    <button className="notif-close"
      valign={Gtk.Align.START}
      onClicked={onDismiss}
    >
      <label label={Icons.notif.close} />
    </button>
  </box>
}

export default function NotifPopup(gdkmonitor: Gdk.Monitor) {
  const notifd = Notifd.get_default()
  // По центру зверху
  const { TOP } = Astal.WindowAnchor

  const popups = Variable<Notification[]>([])

  const dismiss = (id: number) => {
    popups.set(popups.get().filter(n => n.id !== id))
  }

  notifd.connect("notified", (_, id) => {
    const n = notifd.get_notification(id)
    if (!n) return
    popups.set([...popups.get(), n])
    setTimeout(() => dismiss(id), POPUP_TIMEOUT)
  })

  return <window
    gdkmonitor={gdkmonitor}
    anchor={TOP}
    exclusivity={Astal.Exclusivity.NORMAL}
    application={App}
    marginTop={5}
    layer={Astal.Layer.OVERLAY}
  >
    <box className="notif-popup-list" vertical spacing={8}
      halign={Gtk.Align.CENTER}
    >
      {bind(popups).as(ps =>
        ps.map(n =>
          <NotifPopupCard
            n={n}
            onDismiss={() => dismiss(n.id)}
          />
        )
      )}
    </box>
  </window>
}