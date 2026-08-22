import { App, Astal, Gtk, Gdk } from "astal/gtk3"
import { Variable, bind, execAsync } from "astal"
import { Windows } from "../../services/windows"

type ClipEntry = { index: number; preview: string; full: string }

function parseEntries(raw: string): ClipEntry[] {
  return raw
    .trim()
    .split("\n")
    .filter(Boolean)
    .slice(0, 50)
    .map(line => {
      const tab = line.indexOf("\t")
      const index = parseInt(line.slice(0, tab))
      const full = line.slice(tab + 1)
      const preview = full.replace(/\s+/g, " ").trim().slice(0, 60)
      return { index, preview, full }
    })
}

export default function Clipboard(gdkmonitor: Gdk.Monitor) {
  const { TOP, RIGHT } = Astal.WindowAnchor
  const visible = Windows.get("clipboard")

  const entries = Variable<ClipEntry[]>([])
  const search = Variable("")
  const loading = Variable(false)

  visible.subscribe(v => {
    if (!v) { search.set(""); return }
    loading.set(true)
    execAsync(["bash", "-c", "cliphist list"])
      .then(out => { entries.set(parseEntries(out)); loading.set(false) })
      .catch(() => { entries.set([]); loading.set(false) })
  })

  const clipLine = (entry: ClipEntry) => entry.index + "\t" + entry.full

  const copyEntry = (entry: ClipEntry) => {
    execAsync(["bash", "-c",
      `printf '%s' ${JSON.stringify(clipLine(entry))} | cliphist decode | wl-copy`
    ]).catch(() => { })
    Windows.close("clipboard")
  }

  const pasteEntry = (entry: ClipEntry) => {
    Windows.close("clipboard")
    execAsync(["bash", "-c",
      `sleep 0.12 && printf '%s' ${JSON.stringify(clipLine(entry))} | cliphist decode | wl-copy && wtype -M ctrl v`
    ]).catch(() => { })
  }

  const deleteEntry = (entry: ClipEntry) => {
    execAsync(["bash", "-c",
      `printf '%s' ${JSON.stringify(entry.index + "\t" + entry.full)} | cliphist delete`
    ]).then(() =>
      execAsync(["bash", "-c", "cliphist list"])
        .then(out => entries.set(parseEntries(out)))
    ).catch(() => { })
  }

  return <window
    name="clipboard"
    namespace="ags-clipboard"
    gdkmonitor={gdkmonitor}
    anchor={TOP | RIGHT}
    exclusivity={Astal.Exclusivity.NORMAL}
    visible={bind(visible)}
    application={App}
    margin={5, 5, 5, 8}
    marginEnd={8}
    keymode={Astal.Keymode.ON_DEMAND}
    onKeyPressEvent={(_, event) => {
      if (event.get_keyval()[1] === 65307) Windows.close("clipboard")
    }}
  >
    <box className="clipboard" vertical spacing={10}>

      {/* Хедер */}
      <box className="clip-header" spacing={8}>
        <label className="clip-icon" label="󰅌" />
        <label className="clip-title" label="Clipboard"
          hexpand halign={Gtk.Align.START} />
        <button className="clip-clear-btn"
          onClicked={() =>
            execAsync(["cliphist", "wipe"])
              .then(() => entries.set([]))
              .catch(() => { })
          }
        >
          <label label="󰆴" />
        </button>
      </box>

      {/* Пошук */}
      <entry
        className="clip-search"
        placeholderText="Пошук..."
        text={bind(search)}
        onChanged={e => search.set(e.text)}
      />

      {/* Список */}
      <box vertical spacing={4} heightRequest={320}>
        {bind(entries).as(all => {
          const q = search.get().toLowerCase()
          const filtered = q
            ? all.filter(e => e.preview.toLowerCase().includes(q))
            : all

          if (filtered.length === 0)
            return [<label className="clip-empty"
              label={all.length === 0 ? "Clipboard is empty" : "No results"}
              halign={Gtk.Align.CENTER}
            />]

          return filtered.map(entry =>
            <box className="clip-item" spacing={4}>
              <button className="clip-select-btn"
                hexpand
                onClicked={() => pasteEntry(entry)}
              >
                <label className="clip-preview"
                  label={entry.preview || "(порожньо)"}
                  halign={Gtk.Align.START}
                  ellipsize={3}
                  maxWidthChars={34}
                />
              </button>
              <button className="clip-copy-btn"
                tooltipText="Копіювати"
                onClicked={() => copyEntry(entry)}
              >
                <label label="󰆏" />
              </button>
              <button className="clip-delete-btn"
                tooltipText="Видалити"
                onClicked={() => deleteEntry(entry)}
              >
                <label label="󰅖" />
              </button>
            </box>
          )
        })}
      </box>

    </box>
  </window>
}