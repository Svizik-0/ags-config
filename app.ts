//app.ts
import { App } from "astal/gtk3"
import style from "./style.scss"
import Bar from "./widget/Bar/index"
import Calendar from "./widget/Calendar/index"
import ClockMenu from "./widget/ClockMenu/index"
import MediaPlayer from "./widget/MediaPlayer/index"
import NotifCenter from "./widget/NotifCenter/index"
import NotifPopup from "./widget/NotifPopup/index"
import ControlCenter from "./widget/ControlCenter/index"
import SysInfo from "./widget/SysInfo/index"
import Clipboard from "./widget/Clipboard/index"
import Launcher from "./widget/Launcher/index"
import Wallpaper from "./widget/Wallpaper/index"
import ThemeSwitcher from "./widget/ThemeSwitcher/index"

App.start({
  css: style,
  main() {
    App.get_monitors().map(Bar)
    App.get_monitors().map(Calendar)
    App.get_monitors().map(ClockMenu)
    App.get_monitors().map(MediaPlayer)
    App.get_monitors().map(NotifCenter)
    App.get_monitors().map(NotifPopup)
    App.get_monitors().map(ControlCenter)
    App.get_monitors().map(SysInfo)
    App.get_monitors().map(Clipboard)
    App.get_monitors().map(Launcher)
    App.get_monitors().map(Wallpaper)
    App.get_monitors().map(ThemeSwitcher)
  },
})