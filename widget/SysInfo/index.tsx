import { App, Astal, Gtk, Gdk } from "astal/gtk3"
import { Variable, bind } from "astal"
import { Windows } from "../../services/windows"

// ---- Progress bar через box ----
function ProgressBar({ value, max }: {
  value: Variable<number>
  max: Variable<number> | number
}) {
  const getMax = () => max instanceof Variable ? max.get() : max

  return <box className="si-progress-track" hexpand>
    <box
      className="si-progress-fill"
      hexpand={false}
      widthRequest={bind(value).as(v => {
        const pct = Math.min(v / Math.max(getMax(), 0.001), 1)
        return Math.round(pct * 240)
      })}
    />
  </box>
}

// ---- Рядок з прогрес баром ----
function BarRow({ icon, label, value, max, unit, colorize = false }: {
  icon: string
  label: string
  value: Variable<number>
  max: Variable<number> | number
  unit: string
  colorize?: boolean
}) {
  const getMax = () => max instanceof Variable ? max.get() : max

  return <box className="si-bar-row" vertical spacing={4}>
    <box spacing={10}>
      <label className="si-icon" label={icon} />
      <label className="si-label" label={label}
        hexpand halign={Gtk.Align.START} />
      <label
        className={colorize
          ? bind(value).as(v => {
            const pct = v / getMax() * 100
            if (pct > 80) return "si-value hot"
            if (pct > 60) return "si-value warm"
            return "si-value"
          })
          : "si-value"
        }
        label={bind(value).as(v => `${v}${unit}`)}
      />
    </box>
    <ProgressBar value={value} max={max} />
  </box>
}

export default function SysInfo(gdkmonitor: Gdk.Monitor) {
  const { TOP, LEFT } = Astal.WindowAnchor
  const visible = Windows.get("sysinfo")

  const gpuName = Variable("RTX 4060")
  const gpuLoad = Variable(0)
  const gpuTemp = Variable(0)
  const gpuMemUsed = Variable(0)
  const gpuMemTotal = Variable(8)

  const cpuLoad = Variable(0)
  const cpuTemp = Variable(0)
  let prevCpuTotal = 0
  let prevCpuIdle = 0

  const ramUsed = Variable(0)
  const ramTotal = Variable(16)

  const diskUsed = Variable(0)
  const diskTotal = Variable(1000)
  const diskFree = Variable("")

  const uptime = Variable("")

  Variable("").poll(2000, ["bash", "-c",
    "nvidia-smi --query-gpu=name,utilization.gpu,temperature.gpu,memory.used,memory.total --format=csv,noheader,nounits"
  ]).subscribe((out: string) => {
    const [name, load, temp, memUsed, memTotal] = out.trim().split(", ")
    gpuName.set(name.trim())
    gpuLoad.set(parseInt(load))
    gpuTemp.set(parseInt(temp))
    gpuMemUsed.set(Math.round(parseInt(memUsed) / 1024 * 10) / 10)
    gpuMemTotal.set(Math.round(parseInt(memTotal) / 1024))
  })

  Variable("").poll(2000, ["bash", "-c",
    "awk 'NR==1{idle=$5+$6; total=0; for(i=2;i<=NF;i++) total+=$i; print total, idle}' /proc/stat"
  ]).subscribe((out: string) => {
    const [total, idle] = out.trim().split(/\s+/).map(Number)
    if (!total || !idle) return

    const totalDelta = total - prevCpuTotal
    const idleDelta = idle - prevCpuIdle
    prevCpuTotal = total
    prevCpuIdle = idle

    if (totalDelta <= 0) return
    const load = (1 - idleDelta / totalDelta) * 100
    cpuLoad.set(Math.max(0, Math.min(100, Math.round(load))))
  })

  Variable("").poll(5000, ["bash", "-c",
    "cat /sys/class/hwmon/hwmon*/temp1_input 2>/dev/null | sort -n | tail -1 | awk '{print int($1/1000)}'"
  ]).subscribe((out: string) => {
    cpuTemp.set(parseInt(out.trim()) || 0)
  })

  // RAM через /proc/meminfo — працює незалежно від мови
  Variable("").poll(3000, ["bash", "-c",
    "awk '/MemTotal/{t=$2} /MemAvailable/{a=$2} END{print (t-a)/1024/1024, t/1024/1024}' /proc/meminfo"
  ]).subscribe((out: string) => {
    const parts = out.trim().split(" ")
    if (parts.length < 2) return
    ramUsed.set(Math.round(parseFloat(parts[0]) * 10) / 10)
    ramTotal.set(Math.round(parseFloat(parts[1]) * 10) / 10)
  })

  Variable("").poll(30000, ["bash", "-c",
    "df -BG / | tail -1 | awk '{print $3, $2, $4}' | tr -d 'G'"
  ]).subscribe((out: string) => {
    const [used, total, free] = out.trim().split(" ")
    diskUsed.set(parseInt(used))
    diskTotal.set(parseInt(total))
    diskFree.set(`${free}G`)
  })

  Variable("").poll(60000, ["bash", "-c",
    "uptime -p | sed 's/up //'"
  ]).subscribe((out: string) => {
    uptime.set(out.trim())
  })

  return <window
    namespace="ags-sysinfo"
    gdkmonitor={gdkmonitor}
    anchor={TOP | LEFT}
    exclusivity={Astal.Exclusivity.NORMAL}
    visible={bind(visible)}
    application={App}
    margin={5, 0, 5, 8}
    marginStart={8}
    keymode={Astal.Keymode.ON_DEMAND}
    onKeyPressEvent={(_, event) => {
      if (event.get_keyval()[1] === 65307) Windows.close("sysinfo")
    }}
  >
    <box className="sysinfo" vertical spacing={14}>

      <box className="si-header" spacing={8}>
        <label className="si-title" label="System"
          hexpand halign={Gtk.Align.START} />
        <label className="si-uptime" label={bind(uptime)} />
      </box>

      <box className="si-divider" />

      <box className="si-section" vertical spacing={8}>
        <label className="si-section-title" label={bind(gpuName)} />
        <BarRow icon="󰢮" label="GPU Load"
          value={gpuLoad} max={100} unit="%" colorize />
        <BarRow icon="󰔏" label="GPU Temp"
          value={gpuTemp} max={100} unit="°C" colorize />
        <BarRow icon="󰍛" label="VRAM"
          value={gpuMemUsed} max={gpuMemTotal} unit="GB" />
      </box>

      <box className="si-divider" />

      <box className="si-section" vertical spacing={8}>
        <label className="si-section-title" label="Intel i7-13650HX" />
        <BarRow icon="󰻠" label="CPU Load"
          value={cpuLoad} max={100} unit="%" colorize />
        <BarRow icon="󰔏" label="CPU Temp"
          value={cpuTemp} max={100} unit="°C" colorize />
      </box>

      <box className="si-divider" />

      <box className="si-section" vertical spacing={8}>
        <label className="si-section-title" label="Memory" />
        <BarRow icon="󰑭" label="RAM"
          value={ramUsed} max={ramTotal} unit="GB" />
        <box className="si-row" spacing={10}>
          <label className="si-icon" label="󰍛" />
          <label className="si-label" label="Total"
            hexpand halign={Gtk.Align.START} />
          <label className="si-value"
            label={bind(ramTotal).as(v => `${v}GB`)} />
        </box>
      </box>

      <box className="si-divider" />

      <box className="si-section" vertical spacing={8}>
        <label className="si-section-title" label="Storage" />
        <BarRow icon="󰋊" label="Used"
          value={diskUsed} max={diskTotal} unit="G" />
        <box className="si-row" spacing={10}>
          <label className="si-icon" label="󰆓" />
          <label className="si-label" label="Free"
            hexpand halign={Gtk.Align.START} />
          <label className="si-value" label={bind(diskFree)} />
        </box>
      </box>

    </box>
  </window>
}
