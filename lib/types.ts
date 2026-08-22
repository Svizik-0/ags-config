import Notifd from "gi://AstalNotifd"

// Astal нотифікація
export type Notification = InstanceType<typeof Notifd.Notification>

// Дія нотифікації
export type NotifAction = {
  id: string
  label: string
}