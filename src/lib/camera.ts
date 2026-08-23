/**
 * Cross-platform image capture for Chamber AI's document-scan feature.
 *
 * On native (Android/iOS), @capacitor/camera opens the OS camera/gallery
 * picker and returns base64 directly — no filesystem round-trip needed.
 * On the web, there is no Capacitor camera; a plain <input type="file"
 * accept="image/*" capture="environment"> opens the device camera on phones
 * and a file picker on desktop, which is the standard web fallback.
 *
 * @capacitor/camera is imported dynamically so the web bundle never pays for
 * native camera code it can't use (same pattern as download.ts).
 */
import { Capacitor } from '@capacitor/core';

export interface CapturedImage {
  /** Base64 data, no "data:" prefix. */
  base64: string;
  mimeType: string;
  /** Convenience data: URL for <img src>. */
  dataUrl: string;
}

function toDataUrl(base64: string, mimeType: string): string {
  return `data:${mimeType};base64,${base64}`;
}

/** Opens the native camera or gallery picker. No-ops with a clear error on web. */
export async function captureFromCamera(source: 'camera' | 'gallery' = 'camera'): Promise<CapturedImage> {
  if (!Capacitor.isNativePlatform()) {
    throw new Error('Native camera is only available in the mobile app — use the file picker on web.');
  }

  const { Camera, CameraResultType, CameraSource } = await import('@capacitor/camera');

  const photo = await Camera.getPhoto({
    resultType: CameraResultType.Base64,
    source: source === 'camera' ? CameraSource.Camera : CameraSource.Photos,
    quality: 80,
    // Downscaling keeps the upload small and well under the backend's 15MB
    // cap — a full-resolution phone photo can otherwise be 8-12MB on its own.
    width: 1600,
  });

  if (!photo.base64String) {
    throw new Error('No image data was returned by the camera.');
  }

  const mimeType = photo.format ? `image/${photo.format}` : 'image/jpeg';
  return {
    base64: photo.base64String,
    mimeType,
    dataUrl: toDataUrl(photo.base64String, mimeType),
  };
}

/** Reads a browser File (from an <input type="file">) into a CapturedImage. */
export function fileToImage(file: File): Promise<CapturedImage> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(reader.error ?? new Error('Could not read the selected file'));
    reader.onload = () => {
      const result = String(reader.result ?? '');
      const comma = result.indexOf(',');
      const base64 = comma >= 0 ? result.slice(comma + 1) : result;
      const mimeType = file.type || 'image/jpeg';
      resolve({ base64, mimeType, dataUrl: toDataUrl(base64, mimeType) });
    };
    reader.readAsDataURL(file);
  });
}
