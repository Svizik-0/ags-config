import { App, Astal, Gtk, Gdk } from "astal/gtk3"
import { bind, Variable } from "astal"
import { Windows } from "../../services/windows"

// Mon-Sun порядок як в референсі
const DAYS = ["Mo", "Tu", "We", "Th", "Fr", "Sa", "Su"]
const MONTHS = [
  "January", "February", "March", "April",
  "May", "June", "July", "August",
  "September", "October", "November", "December"
]

function getDaysInMonth(year: number, month: number) {
  return new Date(year, month + 1, 0).getDate()
}

// Повертає 0=Mon, 6=Sun
function getFirstDayOfMonth(year: number, month: number) {
  const day = new Date(year, month, 1).getDay()
  return (day + 6) % 7  // конвертуємо Sun=0 → Mon=0
}

function CalGrid({ month, year }: { month: number, year: number }) {
  const today = new Date()
  const daysInMonth = getDaysInMonth(year, month)
  const firstDay = getFirstDayOfMonth(year, month)
  const cells: any[] = []

  // Дні попереднього місяця
  const prevMonthDays = getDaysInMonth(year, month === 0 ? 11 : month - 1)
  for (let i = firstDay - 1; i >= 0; i--)
    cells.push(
      <label
        className="cal-day other-month"
        label={String(prevMonthDays - i)}
        hexpand
        halign={Gtk.Align.CENTER}
      />
    )

  // Дні поточного місяця
  for (let d = 1; d <= daysInMonth; d++) {
    const isToday = today.getDate() === d
      && today.getMonth() === month
      && today.getFullYear() === year

    cells.push(
      <label
        className={isToday ? "cal-day today" : "cal-day"}
        label={String(d)}
        hexpand
        halign={Gtk.Align.CENTER}
      />
    )
  }

  // Дні наступного місяця
  const remaining = (7 - (cells.length % 7)) % 7
  for (let i = 1; i <= remaining; i++)
    cells.push(
      <label
        className="cal-day other-month"
        label={String(i)}
        hexpand
        halign={Gtk.Align.CENTER}
      />
    )

  const rows: any[] = []
  for (let i = 0; i < cells.length; i += 7)
    rows.push(
      <box className="cal-row" spacing={0}>
        {cells.slice(i, i + 7)}
      </box>
    )

  return <box vertical spacing={2}>{rows}</box>
}

export default function Calendar(gdkmonitor: Gdk.Monitor) {
  const { TOP } = Astal.WindowAnchor
  const visible = Windows.get("calendar")

  const now = new Date()
  const month = Variable(now.getMonth())
  const year = Variable(now.getFullYear())

  const prevMonth = () => {
    if (month.get() === 0) { month.set(11); year.set(year.get() - 1) }
    else month.set(month.get() - 1)
  }
  const nextMonth = () => {
    if (month.get() === 11) { month.set(0); year.set(year.get() + 1) }
    else month.set(month.get() + 1)
  }

  return <window
    namespace="ags-calendar"
    gdkmonitor={gdkmonitor}
    anchor={TOP}
    exclusivity={Astal.Exclusivity.NORMAL}
    visible={bind(visible)}
    application={App}
    marginTop={5}
    keymode={Astal.Keymode.ON_DEMAND}
    onKeyPressEvent={(_, event) => {
      if (event.get_keyval()[1] === 65307) Windows.close("calendar")
    }}
  >
    <box className="calendar" vertical spacing={4}>

      {/* Навігація */}
      <box className="cal-nav" spacing={4}>
        <button className="cal-nav-btn" onClicked={prevMonth}>
          <label label="‹" />
        </button>
        <label className="cal-month"
          label={bind(month).as(m => MONTHS[m])}
          hexpand halign={Gtk.Align.CENTER}
        />
        <label className="cal-year"
          label={bind(year).as(y => String(y))}
          halign={Gtk.Align.CENTER}
        />
        <button className="cal-nav-btn" onClicked={nextMonth}>
          <label label="›" />
        </button>
      </box>

      {/* Заголовки днів */}
      <box className="cal-weekdays" spacing={0}>
        {DAYS.map(d =>
          <label className="cal-weekday" label={d}
            hexpand halign={Gtk.Align.CENTER} />
        )}
      </box>

      {/* Сітка */}
      {bind(month).as(m => <CalGrid month={m} year={year.get()} />)}

      {/* Годинник */}
      <box className="cal-clock-section" vertical spacing={4}
        halign={Gtk.Align.CENTER}>
        <button className="cal-time-btn" onClicked={() => {
          Windows.close("calendar")
          Windows.toggle("clockmenu")
        }}>
          <label className="cal-big-time"
            label={Variable("").poll(1000, ["date", "+%H:%M:%S"])()} />
        </button>
        <label className="cal-big-date"
          label={Variable("").poll(1000, ["bash", "-c",
            "LC_TIME=C date '+%d.%m.%Y %A'"])()} />
      </box>

    </box>
  </window>
}