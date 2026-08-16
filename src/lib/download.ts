/**
 * Cross-platform file download.
 *
 * On the web, an <a download> click is all that is needed. Inside a Capacitor
 * WebView it does nothing at all: the WebView has no download manager, so the
 * blob URL is opened and silently discarded. That is why "download" appeared to
 * work in the app — the document rendered — but no file ever landed on the
 * device.
 *
 * On native we therefore write the bytes to the app's Documents directory with
 * @capacitor/filesystem and then hand the saved file to the OS share sheet, so
 * the user can save it to Files/Drive, send it to WhatsApp, print it, etc.
 *
 * Both plugins are imported dynamically so the web bundle never pays for them.
 */

import { Capacitor } from '@capacitor/core';

/** Strip characters that are illegal in filenames on Android/iOS. */
function safeFileName(name: string): string {
  return name.replace(/[\\/:*?"<>|]+/g, '-').replace(/\s+/g, ' ').trim();
}

/** Blob -> base64 (no data: prefix), which is what Filesystem.writeFile wants. */
function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(reader.error ?? new Error('Could not read file'));
    reader.onload = () => {
      const result = String(reader.result ?? '');
      // result looks like "data:<mime>;base64,XXXX" — keep only XXXX
      const comma = result.indexOf(',');
      resolve(comma >= 0 ? result.slice(comma + 1) : result);
    };
    reader.readAsDataURL(blob);
  });
}

export interface DownloadResult {
  /** 'web' used an anchor click; 'native' wrote a file and opened the share sheet. */
  via: 'web' | 'native';
  /** Absolute device path, native only. */
  uri?: string;
}

/**
 * Save `blob` as `fileName`, using whichever mechanism the platform supports.
 * Throws on failure so callers can surface a real error rather than a silent
 * no-op.
 */
export async function downloadBlob(
  blob: Blob,
  fileName: string,
  opts: { shareTitle?: string } = {}
): Promise<DownloadResult> {
  const name = safeFileName(fileName);

  if (!Capacitor.isNativePlatform()) {
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = name;
    // Firefox requires the anchor to be in the document for the click to count.
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    // Revoking straight away can cancel the transfer before it starts.
    setTimeout(() => URL.revokeObjectURL(url), 10000);
    return { via: 'web' };
  }

  const [{ Filesystem, Directory, Encoding }, { Share }] = await Promise.all([
    import('@capacitor/filesystem'),
    import('@capacitor/share'),
  ]);

  const isText = /^text\/|application\/(json|xml)/.test(blob.type);
  const data = isText ? await blob.text() : await blobToBase64(blob);

  const written = await Filesystem.writeFile({
    path: name,
    data,
    directory: Directory.Documents,
    encoding: isText ? Encoding.UTF8 : undefined,
    recursive: true,
  });

  // Hand it to the OS so the user can put it wherever they want. If the share
  // sheet is unavailable the file is still saved, so this must not throw.
  try {
    await Share.share({
      title: opts.shareTitle ?? name,
      files: [written.uri],
    });
  } catch {
    /* user dismissed the sheet, or sharing is unsupported — file is saved */
  }

  return { via: 'native', uri: written.uri };
}

/**
 * Save an HTML document as a file. Used by the cause list and expense exports,
 * which build a printable HTML string.
 *
 * On the web we keep using the print dialog (users pick "Save as PDF"), because
 * that produces a real PDF. A Capacitor WebView has no print dialog, so there
 * we save the HTML itself — it opens in any browser and can be printed from
 * there.
 */
export async function saveHtmlDocument(
  html: string,
  fileName: string,
  opts: { shareTitle?: string } = {}
): Promise<DownloadResult> {
  const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
  return downloadBlob(blob, fileName.endsWith('.html') ? fileName : `${fileName}.html`, opts);
}

/** True when print-to-PDF via a popup window is actually available. */
export const canPrintToPdf = (): boolean => !Capacitor.isNativePlatform();
