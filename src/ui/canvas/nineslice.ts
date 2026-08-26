/**
 * Nine-slice resize on raw pixels, the way the game stretches a UI texture:
 * corners stay untouched, edges stretch on one axis, the middle on both. CSS
 * border-image blurs and rounds differently, so the canvas path is what makes
 * the preview match Minecraft.
 */
export interface NinesliceData {
  nineslice_size: number | [number, number, number, number];
  base_size: [number, number];
}

export function ninesliceResize(
  { nineslice_size, base_size }: NinesliceData,
  pixels: Uint8ClampedArray,
  newWidth: number,
  newHeight: number
): Uint8ClampedArray<ArrayBuffer> {
  const [left, top, right, bottom] = Array.isArray(nineslice_size)
    ? nineslice_size
    : [nineslice_size, nineslice_size, nineslice_size, nineslice_size];

  const [baseWidth, baseHeight] = base_size;
  const output = new Uint8ClampedArray(new ArrayBuffer(newWidth * newHeight * 4));

  const getPixel = (x: number, y: number): [number, number, number, number] => {
    const cx = Math.max(0, Math.min(baseWidth - 1, Math.floor(x)));
    const cy = Math.max(0, Math.min(baseHeight - 1, Math.floor(y)));
    const idx = (cy * baseWidth + cx) * 4;
    return [pixels[idx] ?? 0, pixels[idx + 1] ?? 0, pixels[idx + 2] ?? 0, pixels[idx + 3] ?? 255];
  };

  const setPixel = (x: number, y: number, rgba: [number, number, number, number]): void => {
    if (x < 0 || y < 0 || x >= newWidth || y >= newHeight) return;
    const idx = (y * newWidth + x) * 4;
    for (let i = 0; i < 4; i++) output[idx + i] = rgba[i];
  };

  const stretch = (
    srcX: number,
    srcY: number,
    srcW: number,
    srcH: number,
    destX: number,
    destY: number,
    destW: number,
    destH: number
  ): void => {
    const dx = Math.round(destX);
    const dy = Math.round(destY);
    const dw = Math.max(0, Math.round(destW));
    const dh = Math.max(0, Math.round(destH));
    if (dw <= 0 || dh <= 0) return;

    for (let y = 0; y < dh; y++) {
      const sampleY = srcH === 1 ? srcY : srcY + Math.floor((y * srcH) / dh);
      for (let x = 0; x < dw; x++) {
        const sampleX = srcW === 1 ? srcX : srcX + Math.floor((x * srcW) / dw);
        setPixel(dx + x, dy + y, getPixel(sampleX, sampleY));
      }
    }
  };

  const midSrcW = baseWidth - left - right;
  const midSrcH = baseHeight - top - bottom;
  const midDestW = newWidth - left - right;
  const midDestH = newHeight - top - bottom;
  const rightDestX = left + midDestW;
  const bottomDestY = top + midDestH;

  stretch(0, 0, left, top, 0, 0, left, top);
  stretch(left, 0, midSrcW, top, left, 0, midDestW, top);
  stretch(baseWidth - right, 0, right, top, rightDestX, 0, right, top);

  stretch(0, top, left, midSrcH, 0, top, left, midDestH);
  stretch(left, top, midSrcW, midSrcH, left, top, midDestW, midDestH);
  stretch(baseWidth - right, top, right, midSrcH, rightDestX, top, right, midDestH);

  stretch(0, baseHeight - bottom, left, bottom, 0, bottomDestY, left, bottom);
  stretch(left, baseHeight - bottom, midSrcW, bottom, left, bottomDestY, midDestW, bottom);
  stretch(baseWidth - right, baseHeight - bottom, right, bottom, rightDestX, bottomDestY, right, bottom);

  return output;
}
