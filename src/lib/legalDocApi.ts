import { BACKEND_URL } from '@/lib/api';
import { downloadBlob } from '@/lib/download';
import type { LegalDocType } from '@/lib/legalDocSchemas';

/**
 * Renders a legal document server-side and hands it to the platform's
 * download mechanism.
 *
 * Goes through downloadBlob() rather than a plain <a download> link — a
 * Capacitor WebView has no download manager, so a plain link silently does
 * nothing on the phone (see src/lib/download.ts and CONTEXT.md §3.4). That
 * bug already bit the causelist/document PDF exports once; this reuses the
 * fix instead of repeating the mistake.
 */
export async function generateLegalDocument(
  documentType: LegalDocType,
  fields: Record<string, unknown>,
  fileName: string
): Promise<void> {
  const res = await fetch(`${BACKEND_URL}/api/legal-docs/generate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ document_type: documentType, fields }),
  });

  if (!res.ok) {
    let message = `Could not generate the document (status ${res.status}).`;
    try {
      const data = await res.json();
      if (data?.error) message = data.error;
    } catch {
      // Response wasn't JSON (e.g. a proxy error page) — keep the generic message.
    }
    throw new Error(message);
  }

  const blob = await res.blob();
  const name = fileName.endsWith('.docx') ? fileName : `${fileName}.docx`;
  await downloadBlob(blob, name, { shareTitle: name });
}
