import { App, Astal, Gtk, Gdk } from "astal/gtk3"
import { Variable, bind } from "astal"
import Notifd from "gi://AstalNotifd"
import { Windows } from "../../services/windows"
import { stripHtml } from "../../lib/utils"
import { Icons } from "../../lib/icons"
import type { Notification } from "../../lib/types"

// ---- Картка нотифікації ----
function NotifCard({ n }: { n: Notification }) {
  const expanded = Variable(false)
  const time = new Date(n.time * 1000)
    .toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })

  // Іконка апп — перша літера назви
  const appInitial = (n.app_name ?? "?")[0].toUpperCase()

  return <box className="notif-card" vertical>
    {/* Головний рядок */}
    <button className="notif-card-btn"
      onClicked={() => expanded.set(!expanded.get())}
    >
      <box spacing={10}>
        {/* Іконка */}
        <box className="notif-app-icon" valign={Gtk.Align.START}>
          <label label={appInitial} />
        </box>

        <box vertical hexpand spacing={2}>
          {/* Рядок: назва апп + час + стрілка */}
          <box spacing={6}>
            <label className="notif-app"
              label={stripHtml(n.app_name ?? "Unknown")}
              halign={Gtk.Align.START}
              hexpand
            />
            <label className="notif-time" label={time} />
            <label className="notif-chevron"
              label={bind(expanded).as(e => e ? "󰅃" : "󰅀")}
            />
          </box>

          {/* Summary */}
          <label className="notif-summary"
            label={stripHtml(n.summary ?? "")}
            halign={Gtk.Align.START}
            ellipsize={3}
            maxWidthChars={32}
          />

          {/* Body — тільки якщо згорнуто і є body */}
          {n.body && bind(expanded).as(e => !e
            ? <label className="notif-body-preview"
              label={stripHtml(n.body)}
              halign={Gtk.Align.START}
              ellipsize={3}
              maxWidthChars={32}
            />
            : <box />
          )}
        </box>
      </box>
    </button>

    {/* Розгорнутий вміст */}
    {bind(expanded).as(e => e
      ? <box className="notif-expanded" vertical spacing={8}>
        {n.body &&
          <label className="notif-body"
            label={stripHtml(n.body)}
            halign={Gtk.Align.START}
            wrap
          />
        }
        <button className="notif-dismiss-btn"
          halign={Gtk.Align.CENTER}
          onClicked={() => n.dismiss()}
        >
          <label label="Close" />
        </button>
      </box>
      : <box />
    )}
  </box>
}

// ---- Головне вікно ----
export default function NotifCenter(gdkmonitor: Gdk.Monitor) {
  const notifd = Notifd.get_default()
  const { RIGHT, TOP } = Astal.WindowAnchor
  const visible = Windows.get("notifcenter")
  const silenced = Variable(false)

  return <window
    namespace="ags-notifcenter"
    gdkmonitor={gdkmonitor}
    anchor={RIGHT | TOP}
    exclusivity={Astal.Exclusivity.NORMAL}
    visible={bind(visible)}
    application={App}
    margin={5, 5, 5, 8}
    marginEnd={8}
    keymode={Astal.Keymode.ON_DEMAND}
    onKeyPressEvent={(_, event) => {
      if (event.get_keyval()[1] === 65307) Windows.close("notifcenter")
    }}
  >
    <box className="notif-center" vertical spacing={10}>

      {/* Хедер */}
      <box className="notif-header" spacing={8}>
        <label className="notif-title"
          label="Notifications"
          hexpand halign={Gtk.Align.START}
        />
        <button
          className={bind(silenced).as(s =>
            s ? "notif-action-btn active" : "notif-action-btn"
          )}
          onClicked={() => silenced.set(!silenced.get())}
        >
          <box spacing={4}>
            <label label="󰂛" />
            <label label="Silence" />
          </box>
        </button>
        <button className="notif-action-btn"
          onClicked={() => notifd.notifications.forEach(n => n.dismiss())}
        >
          <box spacing={4}>
            <label label="󰆴" />
            <label label="Clear" />
          </box>
        </button>
      </box>

      {/* Список */}
      <box vertical spacing={6}>
        {bind(notifd, "notifications").as(notifs =>
          notifs.length === 0
            ? <label className="notif-empty"
              label="No notifications"
              halign={Gtk.Align.CENTER}
            />
            : notifs.map(n => <NotifCard n={n} />)
        )}
      </box>

    </box>
  </window>
}