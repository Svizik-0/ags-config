import { Variable, bind } from "astal"
import { Gtk } from "astal/gtk3"
import { Windows } from "../../../services/windows"

export default function GpuButton() {
  const gpuLoad = Variable("0%")
  const gpuTemp = Variable("0°")

  Variable("").poll(2000, ["bash", "-c",
    "nvidia-smi --query-gpu=utilization.gpu,temperature.gpu --format=csv,noheader,nounits"
  ]).subscribe((out: string) => {
    const [load, temp] = out.trim().split(", ")
    gpuLoad.set(`${load}%`)
    gpuTemp.set(`${temp}°`)
  })

  return <button
    className="gpu-bar-btn"
    valign={Gtk.Align.CENTER}
    onClicked={() => Windows.toggle("sysinfo")}
  >
    <box spacing={6}>
      <label className="gpu-bar-icon" label="󰢮" />
      <label
        className={bind(gpuLoad).as(l => {
          const v = parseInt(l)
          if (v > 80) return "gpu-bar-load high"
          if (v > 50) return "gpu-bar-load mid"
          return "gpu-bar-load"
        })}
        label={bind(gpuLoad)}
      />
      <label className="gpu-bar-sep" label="·" />
      <label
        className={bind(gpuTemp).as(t => {
          const v = parseInt(t)
          if (v > 80) return "gpu-bar-temp hot"
          if (v > 65) return "gpu-bar-temp warm"
          return "gpu-bar-temp"
        })}
        label={bind(gpuTemp)}
      />
    </box>
  </button>
}