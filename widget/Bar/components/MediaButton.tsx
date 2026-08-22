import { Gtk } from "astal/gtk3"
import { bind, Variable } from "astal"
import Mpris from "gi://AstalMpris"
import { Windows } from "../../../services/windows"

type MprisPlayer = InstanceType<typeof Mpris.Player>

function formatTitle(title: string | null, artist: string | null, extra: number) {
  const shortArtist = artist ? `${artist.split(" ")[0]} — ` : ""
  const t = title ?? ""
  const shortTitle = t.length > 9 ? t.slice(0, 9) + "…" : t
  const more = extra > 0 ? ` +${extra}` : ""
  return `${shortArtist}${shortTitle}${more}`
}

// Обираємо плеєра: спочатку той, хто реально грає, інакше перший з метаданими
function pickPlayer(players: MprisPlayer[]) {
  const active = players.filter(p => !!p.title)
  if (active.length === 0) return null

  const playing = active.find(p => p.playbackStatus === Mpris.PlaybackStatus.PLAYING)
  const player = playing ?? active[0]

  return { player, extra: active.length - 1 }
}

// ---- Cava, ізольовано та безпечно ----
let cava: any = null
try {
  const Cava = (await import("gi://AstalCava")).default
  cava = Cava.get_default()
} catch (e) {
  console.error("AstalCava unavailable:", e)
}

function downsample(values: number[], count: number) {
  const chunk = values.length / count
  return Array.from({ length: count }, (_, i) => {
    const start = Math.floor(i * chunk)
    const end = Math.max(Math.floor((i + 1) * chunk), start + 1)
    const slice = values.slice(start, end)
    return slice.reduce((a, b) => a + b, 0) / slice.length
  })
}

function CavaBars() {
  if (!cava) return <box />

  return <box className="media-cava" spacing={2} valign={Gtk.Align.CENTER}>
    {bind(cava, "values").as(values =>
      downsample(values as number[], 6).map(v => (
        <box
          className="cava-bar"
          valign={Gtk.Align.END}
          css={`min-height: ${Math.max(2, Math.round(v * 14))}px;`}
        />
      ))
    )}
  </box>
}

export default function MediaButton() {
  const mpris = Mpris.get_default()

  const active = Variable(pickPlayer(mpris.players)).poll(
    1000,
    () => pickPlayer(mpris.players)
  )

  return <button
    className="media-bar-btn"
    valign={Gtk.Align.CENTER}
    onClicked={() => Windows.toggle("mediaplayer")}
    onDestroy={() => active.drop()}
  >
    {active(state => {
      if (!state) return <label className="media-bar-label" label="No media" />

      return <box spacing={4} valign={Gtk.Align.CENTER}>
        <box className="media-bar-dot" />
        <label
          className="media-bar-label"
          label={formatTitle(state.player.title, state.player.artist, state.extra)}
        />
        <CavaBars />
      </box>
    })}
  </button>
}