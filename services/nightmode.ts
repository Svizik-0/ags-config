import { Variable, execAsync } from "astal"
import GLib from "gi://GLib"

const DEFAULT_TEMP = 4000
const DEBOUNCE_MS = 150

// ── Персистентність (переживає перезапуск ags) ──────────────────────────────
const STATE_DIR = `${GLib.get_user_state_dir()}/ags`
const STATE_FILE = `${STATE_DIR}/nightmode.json`

interface NightModeState {
  nightMode: boolean
  nightTemp: number
  autoSchedule: boolean
  startTime: string
  endTime: string
}

const DEFAULTS: NightModeState = {
  nightMode: false,
  nightTemp: DEFAULT_TEMP,
  autoSchedule: false,
  startTime: "21:30",
  endTime: "06:00",
}

function loadState(): NightModeState {
  try {
    const [ok, bytes] = GLib.file_get_contents(STATE_FILE)
    if (!ok) return DEFAULTS
    const text = new TextDecoder().decode(bytes)
    return { ...DEFAULTS, ...JSON.parse(text) }
  } catch {
    return DEFAULTS
  }
}

const initial = loadState()

export const nightMode = Variable(initial.nightMode)
export const nightTemp = Variable(initial.nightTemp)
export const autoSchedule = Variable(initial.autoSchedule)
export const startTime = Variable(initial.startTime)
export const endTime = Variable(initial.endTime)

let saveDebounce: any = null
function persist() {
  if (saveDebounce) clearTimeout(saveDebounce)
  saveDebounce = setTimeout(() => {
    try {
      GLib.mkdir_with_parents(STATE_DIR, 0o755)
      const data: NightModeState = {
        nightMode: nightMode.get(),
        nightTemp: nightTemp.get(),
        autoSchedule: autoSchedule.get(),
        startTime: startTime.get(),
        endTime: endTime.get(),
      }
      GLib.file_set_contents(STATE_FILE, new TextEncoder().encode(JSON.stringify(data)))
    } catch (e) {
      console.error("nightmode: failed to save state", e)
    }
  }, 300)
}

[nightMode, nightTemp, autoSchedule, startTime, endTime].forEach(v => v.subscribe(persist))

// ── IPC до вже запущеного hyprsunset (без kill/spawn) ───────────────────────
function sendTemperature(temp: number) {
  execAsync(["hyprctl", "hyprsunset", "temperature", `${temp}`]).catch(console.error)
}

function resetFilter() {
  execAsync(["hyprctl", "hyprsunset", "identity"]).catch(console.error)
}

let debounceId: any = null
function debouncedSend(temp: number) {
  if (debounceId) clearTimeout(debounceId)
  debounceId = setTimeout(() => {
    sendTemperature(temp)
    debounceId = null
  }, DEBOUNCE_MS)
}

nightMode.subscribe((on) => {
  if (debounceId) { clearTimeout(debounceId); debounceId = null }
  if (on) sendTemperature(nightTemp.get())
  else resetFilter()
})

nightTemp.subscribe((temp) => {
  if (!nightMode.get()) return
  debouncedSend(temp)
})

export function toggleNightMode() {
  nightMode.set(!nightMode.get())
}

// subscribe() реагує лише на МАЙБУТНІ зміни, не на початкове значення —
// тож стан, завантажений з файлу, потрібно застосувати до hyprsunset вручну одразу при старті.
if (nightMode.get()) sendTemperature(nightTemp.get())
else resetFilter()

// ── Валідація часу "HH:MM" ──────────────────────────────────────────────────
export function isValidTime(t: string): boolean {
  return /^([01]\d|2[0-3]):([0-5]\d)$/.test(t)
}

export function setStartTime(t: string) {
  if (isValidTime(t)) startTime.set(t)
}

export function setEndTime(t: string) {
  if (isValidTime(t)) endTime.set(t)
}

// ── Логіка розкладу ──────────────────────────────────────────────────────────
function toMinutes(t: string): number {
  const [h, m] = t.split(":").map(Number)
  return h * 60 + m
}

function isWithinSchedule(): boolean {
  const now = new Date()
  const nowMin = now.getHours() * 60 + now.getMinutes()
  const start = toMinutes(startTime.get())
  const end = toMinutes(endTime.get())
  if (start === end) return false
  if (start > end) return nowMin >= start || nowMin < end // через північ
  return nowMin >= start && nowMin < end
}

function checkSchedule() {
  if (!autoSchedule.get()) return
  const shouldBeOn = isWithinSchedule()
  if (shouldBeOn !== nightMode.get()) nightMode.set(shouldBeOn)
}

// Прив'язуємось до початку наступної хвилини (макс. затримка ~1с),
// далі — рівно раз на хвилину.
function scheduleMinuteTicks() {
  checkSchedule()
  const now = new Date()
  const msToNextMinute = 60_000 - (now.getSeconds() * 1000 + now.getMilliseconds())
  setTimeout(() => {
    checkSchedule()
    setInterval(checkSchedule, 60_000)
  }, msToNextMinute)
}

scheduleMinuteTicks()