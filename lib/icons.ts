// Всі іконки в одному місці — легко міняти шрифт/іконки глобально

export const Icons = {
  battery: {
    full: "󰁹",
    high: "󰂀",
    medium: "󰁿",
    low: "󰁽",
    critical: "󰁻",
    empty: "󰁺",
    charging: "󰂄",
  },
  network: {
    wifi_full: "󰤨",
    wifi_high: "󰤥",
    wifi_medium: "󰤢",
    wifi_low: "󰤟",
    wifi_off: "󰤭",
    wired: "󰈀",
    disconnected: "󰤭",
  },
  media: {
    play: "󰐊",
    pause: "󰏤",
    next: "󰒭",
    prev: "󰒮",
    shuffle: "󰒝",
    repeat: "󰑖",
    note: "󰝚",
  },
  notif: {
    bell: "󰂚",
    bell_off: "󰂛",
    close: "󰅖",
  },
  system: {
    nix: "󱄅",
    power: "󰐥",
    reboot: "󰜉",
    suspend: "󰤄",
    lock: "󰌾",
  },
  arrow: {
    up: "󰅂",
    down: "󰅀",
    left: "‹",
    right: "›",
  },
} as const