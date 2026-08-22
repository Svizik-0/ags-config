import { App, Astal, Gtk, Gdk } from "astal/gtk3"
import { execAsync } from "astal/process"
import { readFile } from "astal/file"
import { Variable, bind, derive } from "astal"
import GLib from "gi://GLib"
import Gio from "gi://Gio"
import { Windows } from "../../services/windows"

const THEMES_DIR = `${GLib.get_home_dir()}/.config/themes`
const PRESETS_DIR = `${THEMES_DIR}/presets`
const FONTS_DIR = `${THEMES_DIR}/fonts`
const OVERRIDES = `${THEMES_DIR}/overrides.json`
const CURRENT_WALL = `${GLib.get_home_dir()}/.cache/current_wallpaper`

type Category = "theme" | "fonts" | "wallpaper" | "decorations"
type AppTarget = "all" | "ghostty" | "obsidian" | "gtk" | "hyprland" | "ags"
type Level = "category" | "app" | "preset" | "wallpaper-theme"

interface AppOverride { theme: string | null; font: string | null; frozen: boolean }
interface Overrides { global_theme: string; global_font: string; apps: Record<string, AppOverride> }
interface Preset { id: string; name: string; dark: boolean }

const APP_LABELS: Record<AppTarget, string> = {
  all: "All apps", ghostty: "Ghostty", obsidian: "Obsidian",
  gtk: "GTK 3/4", hyprland: "Hyprland", ags: "AGS",
}
const APPS: AppTarget[] = ["all", "ghostty", "obsidian", "gtk", "hyprland", "ags"]

function readDir(path: string): Preset[] {
  try {
    const dir = Gio.File.new_for_path(path)
    const en = dir.enumerate_children("standard::name", Gio.FileQueryInfoFlags.NONE, null)
    const result: Preset[] = []
    let info: Gio.FileInfo | null
    while ((info = en.next_file(null)) !== null) {
      const filename = info.get_name()
      if (!filename.endsWith(".json")) continue
      const id = filename.replace(".json", "")
      try {
        const data = JSON.parse(readFile(`${path}/${filename}`))
        result.push({ id, name: data.meta?.name ?? id, dark: data.meta?.dark ?? true })
      } catch { }
    }
    return result.sort((a, b) => a.name.localeCompare(b.name))
  } catch { return [] }
}

function readOverrides(): Overrides {
  try { return JSON.parse(readFile(OVERRIDES)) }
  catch {
    return {
      global_theme: "gruvbox-teal",
      global_font: "hasklug",
      apps: {
        ghostty: { theme: null, font: null, frozen: false },
        obsidian: { theme: null, font: null, frozen: false },
        gtk: { theme: null, font: null, frozen: false },
        hyprland: { theme: null, font: null, frozen: false },
        ags: { theme: null, font: null, frozen: false },
      }
    }
  }
}

function readCurrentWallpaper(): string {
  try {
    const [ok, contents] = GLib.file_get_contents(CURRENT_WALL)
    if (ok) return new TextDecoder().decode(contents).trim()
  } catch { }
  return ""
}

function hasDynamicPreset(): boolean {
  return Gio.File.new_for_path(`${PRESETS_DIR}/wallpaper-dynamic.json`).query_exists(null)
}

export function toggleThemeSwitcher() {
  Windows.toggle("themeswitcher")
}

export default function ThemeSwitcher(gdkmonitor: Gdk.Monitor) {
  const level = Variable<Level>("category")
  const category = Variable<Category>("theme")
  const appTarget = Variable<AppTarget>("all")

  const overrides = Variable<Overrides>(readOverrides())
  const presets = Variable<Preset[]>(readDir(PRESETS_DIR))
  const fonts = Variable<Preset[]>(readDir(FONTS_DIR))
  const busy = Variable(false)
  const wpBusy = Variable(false)
  const wpStatus = Variable<"idle" | "extracting" | "saving">("idle")
  const wpHasPreset = Variable(hasDynamicPreset())
  const saveNameVar = Variable("")
  const showSaveInput = Variable(false)

  const refresh = () => {
    overrides.set(readOverrides())
    presets.set(readDir(PRESETS_DIR))
    fonts.set(readDir(FONTS_DIR))
    wpHasPreset.set(hasDynamicPreset())
  }

  const presetPageKey = derive(
    [overrides, category, appTarget],
    (o, cat, app) => ({ o, cat, app })
  )

  const runApply = (args: string): Promise<void> => {
    if (busy.get()) return Promise.resolve()
    busy.set(true)
    return execAsync(`bash ${THEMES_DIR}/theme-apply.sh ${args}`)
      .then(() => { refresh(); busy.set(false) })
      .catch(e => { print(`[ThemeSwitcher] error: ${e}`); busy.set(false) })
  }

  const toggleFreeze = (app: string) => {
    const frozen = overrides.get().apps[app]?.frozen ?? false
    runApply(frozen ? `--unfreeze ${app}` : `--freeze ${app}`)
  }

  const getActive = (cat: Category, app: AppTarget): string => {
    const o = overrides.get()
    if (cat === "fonts")
      return app === "all" ? o.global_font : (o.apps[app]?.font ?? o.global_font)
    return app === "all" ? o.global_theme : (o.apps[app]?.theme ?? o.global_theme)
  }

  const hasOverride = (cat: Category, app: AppTarget): boolean => {
    if (app === "all") return false
    const key = cat === "fonts" ? "font" : "theme"
    const val = overrides.get().apps[app]?.[key]
    return val !== null && val !== undefined
  }

  const applyPreset = (id: string) => {
    const cat = category.get()
    const app = appTarget.get()
    if (id === "__reset__") { runApply(`--clear-app ${app}`); return }
    if (cat === "theme")
      runApply(app === "all" ? `--global-theme ${id}` : `--app-theme ${app} ${id}`)
    else
      runApply(app === "all" ? `--global-font ${id}` : `--app-font ${app} ${id}`)
  }

  const goBack = () => {
    const l = level.get()
    if (l === "preset" || l === "wallpaper-theme") level.set("category")
    else if (l === "app") level.set("category")
  }

  const extractFromWallpaper = () => {
    const wall = readCurrentWallpaper()
    if (!wall) { wpStatus.set("idle"); return }
    wpStatus.set("extracting")
    wpBusy.set(true)
    execAsync(`bash ${THEMES_DIR}/theme-apply.sh --wallpaper "${wall}"`)
      .then(() => { refresh(); wpStatus.set("idle"); wpBusy.set(false) })
      .catch(e => { print(`[WallpaperTheme] error: ${e}`); wpStatus.set("idle"); wpBusy.set(false) })
  }

  const saveAsPreset = (name: string) => {
    if (!name.trim()) return
    wpStatus.set("saving")
    wpBusy.set(true)
    execAsync(`bash ${THEMES_DIR}/theme-apply.sh --save-preset "${name.trim()}"`)
      .then(() => {
        refresh()
        wpStatus.set("idle")
        wpBusy.set(false)
        showSaveInput.set(false)
        saveNameVar.set("")
      })
      .catch(e => { print(`[WallpaperTheme] save error: ${e}`); wpStatus.set("idle"); wpBusy.set(false) })
  }

  // ── Header ────────────────────────────────────────────
  const Header = () => (
    <box className="ts-header">
      {bind(level).as(l => l !== "category"
        ? <button className="ts-back-btn" onClicked={goBack}><label label="‹" /></button>
        : <box className="ts-header-spacer" />
      )}
      {bind(level).as(l => {
        if (l === "category") return <label className="ts-title" label="Appearance" hexpand xalign={0.5} />
        if (l === "app") return <label className="ts-title" label={category.get() === "theme" ? "Theme" : "Fonts"} hexpand xalign={0.5} />
        if (l === "wallpaper-theme") return <label className="ts-title" label="Wallpaper theme" hexpand xalign={0.5} />
        return <label className="ts-title" label={APP_LABELS[appTarget.get()]} hexpand xalign={0.5} />
      })}
      <button className="ts-close-btn" onClicked={() => Windows.close("themeswitcher")}>
        <label label="" />
      </button>
    </box>
  )

  // ── CategoryPage ─────────────────────────────────────
  const CategoryPage = () => (
    <box vertical className="ts-page">
      <label className="ts-section-label" label="STYLE" xalign={0} />
      <button className="ts-nav-item" onClicked={() => { category.set("theme"); level.set("app") }}>
        <box>
          <box className="ts-nav-icon-wrap" />
          <label className="ts-nav-label" label="Theme" hexpand xalign={0} />
        </box>
      </button>
      <button className="ts-nav-item" onClicked={() => { category.set("fonts"); level.set("app") }}>
        <box>
          <box className="ts-nav-icon-wrap" />
          <label className="ts-nav-label" label="Fonts" hexpand xalign={0} />
        </box>
      </button>

      <box className="ts-section-divider" />
      <label className="ts-section-label" label="WALLPAPER" xalign={0} />
      <button className="ts-nav-item" onClicked={() => level.set("wallpaper-theme")}>
        <box>
          <box className="ts-nav-icon-wrap" />
          <label className="ts-nav-label" label="Wallpaper theme" hexpand xalign={0} />
        </box>
      </button>

      <box className="ts-section-divider" />
      <label className="ts-section-label" label="COMING SOON" xalign={0} />
      <button className="ts-nav-item ts-future" sensitive={false}>
        <box>
          <box className="ts-nav-icon-wrap" />
          <label className="ts-nav-label" label="Decorations" hexpand xalign={0} />
          <label className="ts-future-badge" label="soon" />
        </box>
      </button>
    </box>
  )

  // ── AppPage ───────────────────────────────────────────
  const AppPage = () => (
    <box vertical className="ts-page">
      {APPS.map(app => (
        <button
          className="ts-nav-item"
          onClicked={() => { appTarget.set(app); level.set("preset") }}
          onButtonReleaseEvent={(_, e) => {
            if (e.get_button()[1] === 3 && app !== "all") { toggleFreeze(app); return true }
            return false
          }}
          setup={self => {
            const u = overrides.subscribe(o =>
              self.toggleClassName("frozen", o.apps[app]?.frozen ?? false)
            )
            self.toggleClassName("frozen", overrides.get().apps[app]?.frozen ?? false)
            self.connect("destroy", u)
          }}
        >
          <box>
            <label className="ts-nav-label" label={APP_LABELS[app]} hexpand xalign={0} />
            {bind(overrides).as(o =>
              o.apps[app]?.frozen
                ? <label className="ts-frozen-icon" label="󰌾" />
                : <box />
            )}
          </box>
        </button>
      ))}
    </box>
  )

  // ── PresetPage ───────────────────────────────────────
  const PresetPage = () => (
    <box vertical className="ts-page">
      {bind(presetPageKey).as(({ o: _o, cat, app }) => {
        const list = cat === "fonts" ? fonts.get() : presets.get()
        const items = [
          ...(app !== "all" ? [{ id: "__reset__", name: "← Use global", dark: true }] : []),
          ...list,
        ]
        return items.map(p => {
          const isReset = p.id === "__reset__"
          const isActive = isReset ? !hasOverride(cat, app) : getActive(cat, app) === p.id
          return (
            <button
              className={`ts-preset-item${isActive ? " active" : ""}`}
              onClicked={() => applyPreset(p.id)}
            >
              <box>
                <box className="ts-preset-indicator" />
                <label
                  className={`ts-preset-name${isReset ? " ts-reset-label" : ""}`}
                  label={p.name} hexpand xalign={0}
                />
                {isActive && !isReset && <label className="ts-check" label="" />}
              </box>
            </button>
          )
        })
      })}
    </box>
  )

  // ── WallpaperThemePage ────────────────────────────────
  const WallpaperThemePage = () => {
    const wall = readCurrentWallpaper()
    const wallName = wall ? wall.split("/").pop()!.replace(/\.[^.]+$/, "") : "no wallpaper"

    return (
      <box vertical className="ts-page ts-wp-page" spacing={0}>
        <box className="ts-wp-info" spacing={6}>
          <box className="ts-nav-icon-wrap">
            <label className="ts-nav-icon" label="" />
          </box>
          <label
            className="ts-wp-name"
            label={wallName}
            hexpand xalign={0}
            ellipsize={3}
            maxWidthChars={28}
          />
        </box>

        <box className="ts-wp-divider" />

        <button
          className="ts-wp-action"
          sensitive={bind(wpBusy).as(b => !b)}
          onClicked={extractFromWallpaper}
        >
          <box spacing={8}>
            <label label="" />
            {bind(wpStatus).as(s =>
              s === "extracting"
                ? <label label="Extracting colors…" hexpand xalign={0} className="ts-wp-action-label busy" />
                : <box vertical spacing={2}>
                  <label label="Extract from wallpaper" xalign={0} className="ts-wp-action-label" />
                  <label label="Generate & apply theme from current wallpaper" xalign={0} className="ts-wp-action-desc" />
                </box>
            )}
          </box>
        </button>

        <box vertical spacing={0}>
          <button
            className={bind(wpHasPreset).as(has =>
              has ? "ts-wp-action" : "ts-wp-action ts-wp-action-disabled"
            )}
            sensitive={bind(derive([wpBusy, wpHasPreset], (b, has) => !b && has))}
            onClicked={() => showSaveInput.set(!showSaveInput.get())}
          >
            <box spacing={8}>
              <label label="" />
              {bind(wpStatus).as(s =>
                s === "saving"
                  ? <label label="Saving…" hexpand xalign={0} className="ts-wp-action-label busy" />
                  : <box vertical spacing={2}>
                    <label label="Save as preset" xalign={0} className="ts-wp-action-label" />
                    <label label="Keep this palette for reuse later" xalign={0} className="ts-wp-action-desc" />
                  </box>
              )}
            </box>
          </button>

          {bind(showSaveInput).as(show => show
            ? <box className="ts-wp-save-row" spacing={6}>
              <entry
                className="ts-wp-save-input"
                placeholderText="Preset name…"
                hexpand
                text={bind(saveNameVar)}
                onChanged={self => saveNameVar.set(self.text)}
                onActivate={self => saveAsPreset(self.text)}
              />
              <button
                className="ts-wp-save-confirm"
                sensitive={bind(saveNameVar).as(n => n.trim().length > 0)}
                onClicked={() => saveAsPreset(saveNameVar.get())}
              >
                <label label="Save" />
              </button>
            </box>
            : <box />
          )}
        </box>

        {bind(wpHasPreset).as(has => !has
          ? <label className="ts-wp-hint" label="Extract a theme first to enable saving" wrap />
          : <box />
        )}
      </box>
    )
  }

  const visible = Windows.get("themeswitcher")

  return (
    <window
      gdkmonitor={gdkmonitor}
      name="themeswitcher"
      namespace="themeswitcher"
      layer={Astal.Layer.OVERLAY}
      exclusivity={Astal.Exclusivity.IGNORE}
      keymode={Astal.Keymode.ON_DEMAND}
      anchor={0 as Astal.WindowAnchor}
      visible={bind(visible)}
      application={App}
      onShow={() => { refresh(); level.set("category") }}
      onKeyPressEvent={(_, event) => {
        const key = event.get_keyval()[1]
        if (key === Gdk.KEY_Escape) {
          const l = level.get()
          if (l !== "category") { goBack(); return true }
          Windows.close("themeswitcher")
          return true
        }
        return false
      }}
    >
      <box className="theme-switcher" vertical marginBottom={8}>
        <Header />
        <box className="ts-body">
          {bind(level).as(l => {
            if (l === "category") return <CategoryPage />
            if (l === "app") return <AppPage />
            if (l === "wallpaper-theme") return <WallpaperThemePage />
            return <PresetPage />
          })}
        </box>
        {bind(busy).as(b => b
          ? <label className="ts-applying" label="Applying…" />
          : <box />
        )}
      </box>
    </window>
  )
}