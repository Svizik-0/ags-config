import { App, Astal, Gtk, Gdk } from "astal/gtk3"
import Mpris from "gi://AstalMpris"
import { Windows } from "../../services/windows"
import { formatTime } from "../../lib/utils"
import { Icons } from "../../lib/icons"
import { bind, Variable } from "astal"
import Cava from "gi://AstalCava"

type MprisPlayer = InstanceType<typeof Mpris.Player>

const cava = Cava.get_default()
cava.bars = 25

function isActivePlayer(player: MprisPlayer) {
  const finished = player.length > 0 &&
    player.position >= player.length - 1 &&
    player.playbackStatus !== Mpris.PlaybackStatus.PLAYING

  return Boolean(player.title) &&
    !finished &&
    player.playbackStatus !== Mpris.PlaybackStatus.STOPPED
}

function closePlayer(player: MprisPlayer) {
  if (player.canQuit) player.quit()
  else player.stop()
}

function coverArtCss(coverArt?: string | null) {
  if (!coverArt) return ""
  return `background-image: url('${coverArt.replace(/\\/g, "\\\\").replace(/'/g, "\\'")}');`
}

function CavaRing({ player, size = 88 }: { player: MprisPlayer, size?: number }) {
  const cx = size / 2
  const cy = size / 2
  const innerR = size / 2 - 8
  const barW = 4

  return <drawingarea
    className="media-cava-ring"
    widthRequest={size}
    heightRequest={size}
    setup={(area) => {
      let r = 0.18, g = 0.71, b = 0.6

      const readColor = () => {
        const styleCtx = area.get_style_context()

        const [found, c] = styleCtx.lookup_color("caret_color")
        if (found && (c.red + c.green + c.blue) > 0.05) {
          r = c.red; g = c.green; b = c.blue
          return
        }

        // ← БАГ БУВ ТУТ: треба присвоїти c, а не хардкодити fallback
        const fg = styleCtx.get_color(0)
        if (fg.red + fg.green + fg.blue > 0.05) {
          r = fg.red; g = fg.green; b = fg.blue
        }
        // якщо і тут чорний — залишаємо дефолтний teal вище
      }

      area.connect("realize", () => {
        const styleCtx = area.get_style_context()
        const [found, c] = styleCtx.lookup_color("caret_color")
        const fg = styleCtx.get_color(0)
        print(`caret_color found=${found} r=${c?.red} g=${c?.green} b=${c?.blue}`)
        print(`get_color r=${fg.red} g=${fg.green} b=${fg.blue}`)
        readColor()
        area.queue_draw()
      })

      area.connect("draw", (_area, cr) => {
        const isPlaying = player.playbackStatus === Mpris.PlaybackStatus.PLAYING
        const values = isPlaying ? cava.get_values() : new Array(cava.bars).fill(0)

        cr.setLineWidth(barW)
        cr.setLineCap(1)

        values.forEach((level, i) => {
          const angle = (i / values.length) * Math.PI * 2 - Math.PI / 2
          const barLen = 0.5 + level * 12
          const x1 = cx + Math.cos(angle) * innerR
          const y1 = cy + Math.sin(angle) * innerR
          const x2 = cx + Math.cos(angle) * (innerR + barLen)
          const y2 = cy + Math.sin(angle) * (innerR + barLen)
          cr.setSourceRGBA(r, g, b, isPlaying ? 1 : 0.22)
          cr.moveTo(x1, y1)
          cr.lineTo(x2, y2)
          cr.stroke()
        })

        return false
      })

      const cavaHandler = cava.connect("notify::values", () => {
        if (player.playbackStatus === Mpris.PlaybackStatus.PLAYING) area.queue_draw()
      })

      const statusHandler = player.connect("notify::playback-status", () => area.queue_draw())

      area.connect("destroy", () => {
        cava.disconnect(cavaHandler)
        player.disconnect(statusHandler)
      })
    }}
  />
}

// ---- Прогрес / "немає тривалості" ----
function ProgressArea({ player }: { player: MprisPlayer }) {
  const hasDuration = bind(player, "length").as(l => l > 0)
  const noDuration = bind(player, "length").as(l => !(l > 0))

  return <box hexpand>
    <box className="media-progress" vertical spacing={3} hexpand visible={hasDuration}>
      <slider
        className="media-slider"
        hexpand
        sensitive={false}
        min={0}
        max={bind(player, "length").as(l => l > 0 ? l : 1)}
        value={bind(player, "position")}
      />
      <box>
        <label
          className="media-time"
          label={bind(player, "position").as(formatTime)}
          halign={Gtk.Align.START}
          hexpand
        />
        <label
          className="media-time"
          label={bind(player, "length").as(formatTime)}
          halign={Gtk.Align.END}
        />
      </box>
    </box>

    <box className="media-progress live" hexpand valign={Gtk.Align.CENTER} visible={noDuration}>
      <label
        className={bind(player, "playbackStatus").as(s =>
          s === Mpris.PlaybackStatus.PLAYING ? "media-live-dot playing" : "media-live-dot"
        )}
        label="●"
      />
      <label className="media-live-text" label="LIVE" halign={Gtk.Align.START} hexpand />
    </box>
  </box>
}

// ---- Один плеєр ----
function Player({ player }: { player: MprisPlayer }) {
  const subtitle = Variable.derive(
    [bind(player, "artist"), bind(player, "album")],
    (artist, album) => [artist, album].filter(Boolean).join(" • ") || "Unknown"
  )

  return <box className="media-player" spacing={14}>
    <overlay valign={Gtk.Align.CENTER}>
      <CavaRing player={player} size={88} />
      <box
        className="media-cover"
        overlay
        halign={Gtk.Align.CENTER}
        valign={Gtk.Align.CENTER}
        css={bind(player, "coverArt").as(coverArtCss)}
      >
        <label
          className="media-cover-icon"
          label={Icons.media.note}
          visible={bind(player, "coverArt").as(c => !c)}
          halign={Gtk.Align.CENTER}
          valign={Gtk.Align.CENTER}
        />
      </box>
    </overlay>


    <box className="media-info" vertical spacing={6} hexpand valign={Gtk.Align.CENTER}>
      <box className="media-player-header" spacing={8}>
        <label
          className="media-player-source"
          label={player.identity ?? "Media player"}
          halign={Gtk.Align.START}
          hexpand
          ellipsize={3}
        />
        <button
          className={bind(player, "canQuit").as(can =>
            can ? "media-close-btn" : "media-close-btn stop"
          )}
          onClicked={() => closePlayer(player)}
        >
          <label label={Icons.notif.close} />
        </button>
      </box>

      <label
        className="media-title"
        label={bind(player, "title").as(t => t ?? "Unknown")}
        halign={Gtk.Align.START}
        ellipsize={3}
      />
      <label
        className="media-artist"
        label={bind(subtitle)}
        halign={Gtk.Align.START}
        ellipsize={3}
      />

      <box className="media-bottom" spacing={10}>
        <ProgressArea player={player} />

        <box className="media-controls" spacing={4}>
          <button
            className={bind(player, "shuffleStatus").as(s =>
              s === Mpris.Shuffle.ON ? "media-btn active" : "media-btn"
            )}
            onClicked={() => player.shuffle()}
          >
            <label label={Icons.media.shuffle} />
          </button>

          <button className="media-btn" onClicked={() => player.previous()}>
            <label label={Icons.media.prev} />
          </button>

          <button className="media-btn play" onClicked={() => player.play_pause()}>
            <label label={bind(player, "playbackStatus").as(s =>
              s === Mpris.PlaybackStatus.PLAYING
                ? Icons.media.pause
                : Icons.media.play
            )} />
          </button>

          <button className="media-btn" onClicked={() => player.next()}>
            <label label={Icons.media.next} />
          </button>

          <button
            className={bind(player, "loopStatus").as(l =>
              l !== Mpris.Loop.NONE ? "media-btn active" : "media-btn"
            )}
            onClicked={() => player.loop()}
          >
            <label label={Icons.media.repeat} />
          </button>
        </box>
      </box>
    </box>
  </box>
}

// ---- Список плеєрів ----
function PlayerList({ players }: { players: MprisPlayer[] }) {
  const activePlayers = Variable.derive(
    players.flatMap(player => [
      bind(player, "title"),
      bind(player, "length"),
      bind(player, "playbackStatus"),
    ]),
    () => players.filter(isActivePlayer)
  )

  return <box vertical>
    {bind(activePlayers).as(active => active.length === 0
      ? <label className="media-empty" label="No media playing" />
      : <box className="media-player-list" vertical spacing={10}>
        {active.map(player => <Player player={player} />)}
      </box>
    )}
  </box>
}

// ---- Головне вікно ----
export default function MediaPlayer(gdkmonitor: Gdk.Monitor) {
  const { TOP, LEFT } = Astal.WindowAnchor
  const visible = Windows.get("mediaplayer")
  const mpris = Mpris.get_default()

  return <window
    namespace="ags-mediaplayer"
    gdkmonitor={gdkmonitor}
    anchor={TOP | LEFT}
    exclusivity={Astal.Exclusivity.NORMAL}
    visible={bind(visible)}
    application={App}
    margin={5, 0, 5, 8}
    marginStart={8}
    keymode={Astal.Keymode.ON_DEMAND}
    onKeyPressEvent={(_, event) => {
      if (event.get_keyval()[1] === 65307) Windows.close("mediaplayer")
    }}
  >
    <box className="media-window" vertical spacing={8}>
      {bind(mpris, "players").as(players =>
        <PlayerList players={players} />
      )}
    </box>
  </window>
}