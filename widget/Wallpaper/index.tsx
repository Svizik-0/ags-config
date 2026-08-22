import { App, Astal, Gtk, Gdk } from "astal/gtk3"
import { Variable, bind } from "astal"
import { execAsync } from "astal"
import GLib from "gi://GLib"
import Gio from "gi://Gio"
import GdkPixbuf from "gi://GdkPixbuf"
import { Windows } from "../../services/windows"

// ── Налаштування ─────────────────────────────────────────
const WALLPAPER_DIR = `${GLib.get_home_dir()}/Pictures/Wallpapers`
const CURRENT_FILE = `${GLib.get_home_dir()}/.cache/current_wallpaper`

const THUMB_W = 190
const THUMB_H = 107

// ── Утиліти ──────────────────────────────────────────────
function getWallpapers(): string[] {
  const dir = Gio.File.new_for_path(WALLPAPER_DIR)
  try {
    if (!dir.query_exists(null)) return []
    const enumerator = dir.enumerate_children(
      "standard::name", Gio.FileQueryInfoFlags.NONE, null
    )
    const files: string[] = []
    let info: Gio.FileInfo | null
    while ((info = enumerator.next_file(null)) !== null) {
      const name = info.get_name()
      if (/\.(jpg|jpeg|png|webp|gif)$/i.test(name))
        files.push(`${WALLPAPER_DIR}/${name}`)
    }
    enumerator.close(null)
    return files.sort()
  } catch (e) {
    console.error("getWallpapers error:", e)
    return []
  }
}

function readCurrentWallpaper(): string {
  try {
    const [ok, contents] = GLib.file_get_contents(CURRENT_FILE)
    if (ok) return new TextDecoder().decode(contents).trim()
  } catch { }
  return ""
}

function saveCurrentWallpaper(path: string) {
  try { GLib.file_set_contents(CURRENT_FILE, path + "\n") } catch { }
}

function applyWallpaper(path: string) {
  execAsync(["bash", "-c", `awww img "${path}" --transition-type wipe --transition-angle 30 --transition-duration 1`])
    .then(() => saveCurrentWallpaper(path))
    .catch(err => console.error("awww error:", err?.message ?? String(err)))
}

// ── Cover-fit pixbuf ─────────────────────────────────────
function loadCoverPixbuf(path: string): GdkPixbuf.Pixbuf | null {
  try {
    const orig = GdkPixbuf.Pixbuf.new_from_file(path)
    if (!orig) return null
    const ow = orig.get_width()
    const oh = orig.get_height()
    const scale = Math.max(THUMB_W / ow, THUMB_H / oh)
    const sw = Math.round(ow * scale)
    const sh = Math.round(oh * scale)
    const scaled = orig.scale_simple(sw, sh, GdkPixbuf.InterpType.BILINEAR)
    if (!scaled) return null
    const ox = Math.round((sw - THUMB_W) / 2)
    const oy = Math.round((sh - THUMB_H) / 2)
    return scaled.new_subpixbuf(ox, oy, THUMB_W, THUMB_H)
  } catch {
    return null
  }
}

// ── Мініатюра ────────────────────────────────────────────
function WallpaperThumb({
  path,
  current,
  focused,
}: {
  path: string
  current: Variable<string>
  focused: Variable<string>
}) {
  const pixbuf = loadCoverPixbuf(path)
  const name = path.split("/").pop()!.replace(/\.[^.]+$/, "")

  return (
    <button
      className={bind(focused).as(f => {
        const c = current.get()
        if (c === path && f === path) return "wp-thumb active focused"
        if (c === path) return "wp-thumb active"
        if (f === path) return "wp-thumb focused"
        return "wp-thumb"
      })}
      tooltipText={name}
      onClicked={() => {
        current.set(path)
        focused.set(path)
        applyWallpaper(path)
      }}
    >
      <box vertical spacing={5}>
        <drawingarea
          widthRequest={THUMB_W}
          heightRequest={THUMB_H}
          setup={da => {
            da.connect("draw", (_, cr) => {
              if (pixbuf) {
                Gdk.cairo_set_source_pixbuf(cr, pixbuf, 0, 0)
                cr.paint()
              } else {
                cr.setSourceRGBA(0.17, 0.17, 0.17, 1)
                cr.rectangle(0, 0, THUMB_W, THUMB_H)
                cr.fill()
              }
            })
          }}
        />
        <label
          className="wp-thumb-label"
          label={name}
          ellipsize={3}
          maxWidthChars={18}
          halign={Gtk.Align.CENTER}
        />
      </box>
    </button>
  )
}

// ── Головне меню ─────────────────────────────────────────
export default function Wallpaper(gdkmonitor: Gdk.Monitor) {
  const visible = Windows.get("wallpaper")
  const current = Variable(readCurrentWallpaper())
  const focused = Variable(readCurrentWallpaper())
  const list = Variable<string[]>([])

  list.set(getWallpapers())

  bind(visible).subscribe(v => {
    if (v) {
      list.set(getWallpapers())
      focused.set(current.get())
    }
  })

  return (
    <window
      name="wallpaper"
      namespace="ags-wallpaper"
      gdkmonitor={gdkmonitor}
      anchor={Astal.WindowAnchor.BOTTOM}
      exclusivity={Astal.Exclusivity.NORMAL}
      layer={Astal.Layer.OVERLAY}
      visible={bind(visible)}
      application={App}
      marginBottom={40}
      className="wallpaper-menu"
      keymode={Astal.Keymode.ON_DEMAND}
      onKeyPressEvent={(_, event) => {
        const key = event.get_keyval()[1]
        const items = list.get()
        const idx = items.indexOf(focused.get())

        if (key === 65361) { // ←
          const next = Math.max(0, idx < 0 ? 0 : idx - 1)
          focused.set(items[next])
          return true
        }
        if (key === 65363) { // →
          const next = Math.min(items.length - 1, idx < 0 ? 0 : idx + 1)
          focused.set(items[next])
          return true
        }
        if (key === 65293 || key === 65421) { // Enter
          const path = focused.get()
          if (path) {
            current.set(path)
            applyWallpaper(path)
          }
          return true
        }
        if (key === 65307) { // Escape
          Windows.close("wallpaper")
          return true
        }
        return false
      }}
    >
      <box className="wallpaper-container" vertical halign={Gtk.Align.CENTER} spacing={8}>
        <scrollable
          className="wp-scroll"
          vscroll={Gtk.PolicyType.NEVER}
          hscroll={Gtk.PolicyType.AUTOMATIC}
          widthRequest={848}
          setup={self => {
            self.connect("scroll-event", (_: any, event: Gdk.EventScroll) => {
              const [, , dy] = event.get_scroll_deltas()
              const adj = self.hadjustment
              adj.value = Math.max(
                adj.lower,
                Math.min(adj.upper - adj.pageSize, adj.value + dy * 60)
              )
              return true
            })
            bind(focused).subscribe(path => {
              const items = list.get()
              const idx = items.indexOf(path)
              if (idx < 0) return
              const itemW = THUMB_W + 12
              const target = idx * itemW - (848 / 2) + itemW / 2
              self.hadjustment.value = Math.max(0, target)
            })
          }}
        >
          {bind(list).as(items =>
            <box spacing={12} marginTop={4} marginBottom={4}>
              {items.map(path => (
                <WallpaperThumb path={path} current={current} focused={focused} />
              ))}
            </box>
          )}
        </scrollable>
      </box>
    </window>
  )
}