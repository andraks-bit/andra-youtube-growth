// Document import helpers: PDF text extraction (serverless-safe via unpdf) and
// Dropbox share-link resolution. Used by /api/host/import-doc + import-dropbox.

const UA = 'Mozilla/5.0 (compatible; BoatHire24Importer/1.0; +https://boathire24.com)'

export async function pdfToText(buf: ArrayBuffer | Uint8Array): Promise<string> {
  // Lazy import keeps unpdf (and its bundled pdf.js) out of the cold-start path
  // for routes that don't touch PDFs.
  const { getDocumentProxy, extractText } = await import('unpdf')
  const bytes = buf instanceof Uint8Array ? buf : new Uint8Array(buf)
  const pdf = await getDocumentProxy(bytes)
  const { text } = await extractText(pdf, { mergePages: true })
  return Array.isArray(text) ? text.join('\n') : String(text ?? '')
}

// Turn a Dropbox share URL into a direct-download URL.
//   .../s/abc/file.pdf?dl=0   → ?dl=1
//   www.dropbox.com/...       → dl.dropboxusercontent.com/...
// Scl folder links (/scl/fo/) are left as-is and forced to dl=1 (Dropbox serves a zip).
export function resolveDropboxDirect(raw: string): string {
  let u: URL
  try { u = new URL(raw.trim()) } catch { throw new Error('Enter a valid Dropbox link') }
  if (!/(^|\.)dropbox\.com$/.test(u.hostname) && u.hostname !== 'dl.dropboxusercontent.com') {
    throw new Error('That is not a Dropbox link')
  }
  u.hostname = 'dl.dropboxusercontent.com'
  u.searchParams.set('dl', '1')
  return u.toString()
}

export interface FetchedDoc { kind: 'pdf' | 'html' | 'text'; bytes: ArrayBuffer; contentType: string; filename: string }

export async function fetchDocument(url: string, timeoutMs = 20000): Promise<FetchedDoc> {
  const res = await fetch(url, { headers: { 'User-Agent': UA }, redirect: 'follow', signal: AbortSignal.timeout(timeoutMs) })
  if (!res.ok) throw new Error(`The link returned HTTP ${res.status}`)
  const contentType = (res.headers.get('content-type') ?? '').toLowerCase()
  const disp = res.headers.get('content-disposition') ?? ''
  const filename = (disp.match(/filename\*?=(?:UTF-8'')?["']?([^"';]+)/i)?.[1] ?? new URL(url).pathname.split('/').pop() ?? 'document').slice(0, 120)
  const bytes = await res.arrayBuffer()
  if (bytes.byteLength > 25_000_000) throw new Error('That file is too large (max 25 MB)')
  const looksPdf = contentType.includes('pdf') || /\.pdf(\?|$)/i.test(url) || /\.pdf$/i.test(filename) ||
    new Uint8Array(bytes.slice(0, 5)).reduce((s, c) => s + String.fromCharCode(c), '') === '%PDF-'
  const kind: FetchedDoc['kind'] = looksPdf ? 'pdf' : contentType.includes('html') ? 'html' : 'text'
  return { kind, bytes, contentType, filename }
}
