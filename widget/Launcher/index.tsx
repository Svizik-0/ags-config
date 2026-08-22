import { App, Astal, Gtk, Gdk } from "astal/gtk3"
import { Variable, bind } from "astal"
import Apps from "gi://AstalApps?version=0.1"
import { Windows } from "../../services/windows"
import GLib from "gi://GLib"
import Gio from "gi://Gio"

const MAX_RESULTS = 10
const PINNED_FILE = `${GLib.get_user_config_dir()}/ags/pinned-apps.json`

const apps = new Apps.Apps()

function loadPinned(): string[] {
    try {
        const file = Gio.File.new_for_path(PINNED_FILE)
        const [ok, contents] = file.load_contents(null)
        if (ok) return JSON.parse(new TextDecoder().decode(contents))
    } catch {}
    return ["firefox", "ghostty", "org.gnome.Nautilus", "code", "org.telegram.desktop"]
}

function savePinned(list: string[]) {
    try {
        const file = Gio.File.new_for_path(PINNED_FILE)
        const dir = file.get_parent()
        if (!dir?.query_exists(null)) dir?.make_directory_with_parents(null)
        file.replace_contents(
            new TextEncoder().encode(JSON.stringify(list)),
            null, false,
            Gio.FileCreateFlags.REPLACE_DESTINATION,
            null
        )
    } catch (e) {
        print("savePinned error:", e)
    }
}

const pinnedIds = Variable<string[]>(loadPinned())

function isPinned(app: Apps.Application): boolean {
    return pinnedIds.get().some(id =>
        app.entry?.toLowerCase().replace(".desktop", "") === id.toLowerCase() ||
        app.name?.toLowerCase() === id.toLowerCase()
    )
}

function togglePin(app: Apps.Application) {
    const id = app.entry?.replace(".desktop", "") || app.name
    if (!id) return
    const current = pinnedIds.get()
    const next = isPinned(app)
        ? current.filter(p => p.toLowerCase() !== id.toLowerCase())
        : [...current, id]
    pinnedIds.set(next)
    savePinned(next)
}

function getPinned(): Apps.Application[] {
    return pinnedIds.get()
        .map(id => apps.list.find(a =>
            a.entry?.toLowerCase().replace(".desktop", "") === id.toLowerCase() ||
            a.name?.toLowerCase() === id.toLowerCase()
        ))
        .filter(Boolean) as Apps.Application[]
}

function filterApps(q: string): Apps.Application[] {
    const lower = q.toLowerCase()
    return apps.list
        .filter(a =>
            a.name?.toLowerCase().includes(lower) ||
            a.description?.toLowerCase().includes(lower)
        )
        .slice(0, MAX_RESULTS)
}

function AppItem({ app, onLaunch, index, selectedIndex }: {
    app: Apps.Application
    onLaunch: () => void
    index: number
    selectedIndex: Variable<number>
}) {
    return <button
        className="launcher-item"
        onButtonReleaseEvent={(self, event) => {
            const btn = event.get_button()[1]
            if (btn === 1) {
                app.launch()
                onLaunch()
            } else if (btn === 3) {
                togglePin(app)
            }
            return false
        }}
        setup={(self) => {
            selectedIndex.subscribe(s => self.toggleClassName("selected", s === index))
        }}
    >
        <box spacing={12} valign={Gtk.Align.CENTER}>
            <icon className="launcher-item-icon" icon={app.iconName || "application-x-executable"} />
            <box vertical spacing={2} valign={Gtk.Align.CENTER}>
                <label className="launcher-item-name" label={app.name} xalign={0} truncate />
                {app.description
                    ? <label className="launcher-item-desc" label={app.description} xalign={0} truncate />
                    : <box />}
            </box>
            {bind(pinnedIds).as(() =>
                isPinned(app)
                    ? <icon className="launcher-pin-icon" icon="starred-symbolic" />
                    : <box />
            )}
        </box>
    </button>
}

export default function Launcher(gdkmonitor: Gdk.Monitor) {
    const query = Variable("")
    const visible = Windows.get("launcher")
    const selectedIndex = Variable(0)
    let resetting = false

    const results = query((q) =>
        q.trim() === "" ? apps.list.slice(0, MAX_RESULTS) : filterApps(q)
    )

    results.subscribe(() => selectedIndex.set(0))

    function close() {
        Windows.close("launcher")
        query.set("")
        selectedIndex.set(0)
        App.get_window("launcher")?.hide()
    }

    return <window
        gdkmonitor={gdkmonitor}
        name="launcher"
        namespace="launcher"
        layer={Astal.Layer.OVERLAY}
        exclusivity={Astal.Exclusivity.IGNORE}
        keymode={Astal.Keymode.EXCLUSIVE}
        visible={bind(visible)}
        application={App}
    >
        <box
            className="launcher-overlay"
            halign={Gtk.Align.CENTER}
            valign={Gtk.Align.START}
            vertical
            marginTop={120}
        >
            <box className="launcher-search-wrap">
                <icon className="launcher-search-icon" icon="system-search-symbolic" />
                <entry
                    className="launcher-entry"
                    placeholderText="Пошук програм..."
                    hexpand
                    onChanged={(self) => {
                        if (resetting) return
                        query.set(self.text)
                    }}
                    onActivate={() => {
                        const list = results.get()
                        const app = list[selectedIndex.get()]
                        if (app) { app.launch(); close() }
                    }}
                    onKeyPressEvent={(_, event) => {
                        const key = event.get_keyval()[0]
                        const len = results.get().length
                        const cur = selectedIndex.get()
                        if (key === Gdk.KEY_Down) {
                            selectedIndex.set(Math.min(cur + 1, len - 1))
                            return true
                        }
                        if (key === Gdk.KEY_Up) {
                            selectedIndex.set(Math.max(cur - 1, 0))
                            return true
                        }
                        if (key === Gdk.KEY_Escape) {
                            close()
                            return true
                        }
                        return false
                    }}
                    setup={(self) => {
                        visible.subscribe((v) => {
                            if (v) {
                                resetting = true
                                self.set_text("")
                                query.set("")
                                resetting = false
                                selectedIndex.set(0)
                                self.grab_focus()
                            }
                        })
                    }}
                />
            </box>

            <box
                className="launcher-pinned"
                vertical
                visible={bind(query).as(q => q.trim() === "")}
            >
                <label className="launcher-section-label" label="Закріплені (ПКМ у списку щоб закріпити)" xalign={0} />
                <box spacing={8} halign={Gtk.Align.START}>
                    {bind(pinnedIds).as(() => getPinned().map(app => (
                        <button
                            className="launcher-pinned-item"
                            tooltipText={app.name}
                            onButtonReleaseEvent={(_, event) => {
                                const btn = event.get_button()[1]
                                if (btn === 1) { app.launch(); close() }
                                else if (btn === 3) { togglePin(app) }
                                return false
                            }}
                        >
                            <icon icon={app.iconName || "application-x-executable"} />
                        </button>
                    )))}
                </box>
            </box>

            <scrollable
                className="launcher-results"
                vscrollbarPolicy={Gtk.PolicyType.AUTOMATIC}
                hscrollbarPolicy={Gtk.PolicyType.NEVER}
                heightRequest={400}
            >
                <box vertical>
                    {bind(results).as(list => list.map((app, i) =>
                        <AppItem
                            app={app}
                            onLaunch={close}
                            index={i}
                            selectedIndex={selectedIndex}
                        />
                    ))}
                </box>
            </scrollable>
        </box>
    </window>
}