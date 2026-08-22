import GLib from "gi://GLib";

const WALLPAPER_DIR = `${GLib.get_home_dir()}/Pictures/Wallpapers`;

function getWallpapers(): string[] {
  const dir = Gio.File.new_for_path(WALLPAPER_DIR);
  const enumerator = dir.enumerate_children(
    "standard::name,standard::content-type",
    Gio.FileQueryInfoFlags.NONE,
    null
  );

  const files: string[] = [];
  let info: Gio.FileInfo | null;

  while ((info = enumerator.next_file(null)) !== null) {
    const name = info.get_name();
    if (/\.(jpg|jpeg|png|webp)$/i.test(name)) {
      files.push(`${WALLPAPER_DIR}/${name}`);
    }
  }

  return files.sort();
}

function setWallpaper(path: string) {
  // для swww:
  Utils.execAsync(`swww img ${path} --transition-type wipe --transition-angle 30`);
  // або для hyprpaper — розкоментуй:
  // Utils.execAsync(`hyprctl hyprpaper wallpaper "eDP-1,${path}"`);

  // зберегти поточну шпалеру
  Utils.exec(`bash -c "echo '${path}' > ${GLib.get_home_dir()}/.current_wallpaper"`);
}

function getCurrentWallpaper(): string {
  const path = `${GLib.get_home_dir()}/.current_wallpaper`;
  try {
    return Utils.readFile(path).trim();
  } catch {
    return "";
  }
}

export { getWallpapers, setWallpaper, getCurrentWallpaper, WALLPAPER_DIR };