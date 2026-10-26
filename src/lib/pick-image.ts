// Native photo picker. Returns a data URL, null when the user cancels, or
// "fallback" when not native / the plugin failed so callers use the file input.
export type PickResult = string | null | "fallback";

function isNative() {
  if (typeof window === "undefined") return false;
  const cap = (window as { Capacitor?: { isNativePlatform?: () => boolean } }).Capacitor;
  return Boolean(cap?.isNativePlatform?.());
}

export async function pickImageNative(): Promise<PickResult> {
  if (!isNative()) return "fallback";
  try {
    const { Camera, CameraResultType, CameraSource } = await import("@capacitor/camera");
    try {
      const perm = await Camera.checkPermissions();
      if (perm.camera === "denied" && perm.photos === "denied") {
        throw new Error("Camera and photo access are turned off. Enable them in Settings → InstaQuote.");
      }
    } catch (e) {
      if (e instanceof Error && e.message.includes("Settings")) throw e;
    }
    const photo = await Camera.getPhoto({
      source: CameraSource.Prompt,
      resultType: CameraResultType.DataUrl,
      quality: 80,
      width: 1024,
      correctOrientation: true,
      promptLabelPhoto: "Choose from Library",
      promptLabelPicture: "Take Photo",
    });
    return photo.dataUrl ?? null;
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    if (/cancel/i.test(msg)) return null;
    if (msg.includes("Settings")) throw e;
    console.warn("Native camera failed, using file picker", msg);
    return "fallback";
  }
}
