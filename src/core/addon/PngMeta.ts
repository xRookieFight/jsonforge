/**
 * Minimal PNG reading: only the IHDR header, to learn width and height.
 *
 * The base_size of a nine-slice file has to be the REAL size of the PNG, so it
 * is read from the bytes instead of trusting what the editor stored.
 */

const PNG_MAGIC = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];

/** Extracts [width, height] from the IHDR chunk. Null when not a valid PNG. */
export function readPngSize(bytes: Uint8Array): [number, number] | null {
  if (bytes.length < 24) return null;
  for (let i = 0; i < PNG_MAGIC.length; i++) {
    if (bytes[i] !== PNG_MAGIC[i]) return null;
  }
  // After the signature (8 bytes): length(4) + "IHDR"(4) + width(4) + height(4)
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const width = view.getUint32(16, false);
  const height = view.getUint32(20, false);
  if (!width || !height) return null;
  return [width, height];
}

/** Converts a data URL (`data:image/png;base64,...`) into bytes. */
export function dataUrlToBytes(dataUrl: string): Uint8Array {
  const comma = dataUrl.indexOf(",");
  const base64 = comma === -1 ? dataUrl : dataUrl.slice(comma + 1);
  const binary = atob(base64);
  const out = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) out[i] = binary.charCodeAt(i);
  return out;
}

/** Reads any URL (data:, blob: or http) as bytes. */
export async function fetchBytes(url: string): Promise<Uint8Array> {
  if (url.startsWith("data:")) return dataUrlToBytes(url);
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Failed to read ${url}: HTTP ${res.status}`);
  return new Uint8Array(await res.arrayBuffer());
}
