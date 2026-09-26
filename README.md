# ags-config

Персональна конфігурація **Astal / AGS** (Aylur's Gtk Shell) для Wayland-десктопу.

## Особливості

- **Bar** — верхня/нижня панель
- **Launcher** — пошук і запуск додатків (з підтримкою pinned apps)
- **Control Center** — швидкі налаштування (мережа, звук, яскравість тощо)
- **Notification Center + Popup** — центр сповіщень і спливаючі повідомлення
- **Media Player** — керування музикою / відео
- **Calendar + Clock Menu** — календар і меню годинника
- **SysInfo** — системна інформація
- **Clipboard** — історія буфера обміну
- **Wallpaper** — вибір і зміна шпалер
- **Theme Switcher** — перемикач тем
- **Night Mode** — нічний режим

## Структура

.
├── app.ts                 # Точка входу
├── style.scss             # Головний файл стилів
├── pinned-apps.json       # Закріплені додатки в лаунчері
├── widget/                # Усі віджети
│   ├── Bar/
│   ├── Launcher/
│   ├── ControlCenter/
│   ├── NotifCenter/
│   ├── NotifPopup/
│   ├── MediaPlayer/
│   ├── Calendar/
│   ├── ClockMenu/
│   ├── SysInfo/
│   ├── Clipboard/
│   ├── Wallpaper/
│   └── ThemeSwitcher/
├── services/              # Сервіси
│   ├── nightmode.ts
│   ├── wallpaper.ts
│   └── windows.ts
├── lib/                   # Утиліти, іконки, типи
└── scss/                  # Стилі окремих модулів


## Вимоги

- [Astal](https://github.com/Aylur/astal) / AGS
- Dart Sass (`dart-sass`)
- GJS
- Wayland compositor (рекомендовано Hyprland)

## Встановлення

```bash
# Клонування
git clone https://github.com/Svizik-0/ags-config.git ~/.config/ags

# Або якщо вже є папка
cd ~/.config/ags
git pull

