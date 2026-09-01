export const APP_DATA_CHANGED = "app:data-changed";

export function notifyAppDataChanged() {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent(APP_DATA_CHANGED));
  }
}
