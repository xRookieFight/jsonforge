import { useEffect, useRef } from "react";
import { TextureMeta } from "../../core/services/TextureService";
import { ninesliceResize } from "./nineslice";

interface Props {
  texture: TextureMeta;
  width: number;
  height: number;
  /** Overrides the nine-slice of the texture, when the element sets one. */
  nineSlice?: [number, number, number, number];
  grayscale?: boolean;
  tiled?: boolean;
}

const imageCache = new Map<string, HTMLImageElement>();

function loadImage(src: string): Promise<HTMLImageElement> {
  const cached = imageCache.get(src);
  if (cached?.complete) return Promise.resolve(cached);
  return new Promise(resolve => {
    const img = cached ?? new Image();
    img.onload = () => resolve(img);
    img.onerror = () => resolve(img);
    if (!cached) {
      img.src = src;
      imageCache.set(src, img);
    }
  });
}

/**
 * Draws a texture the way the game does: nearest neighbour scaling and real
 * nine-slice on the pixels, so the preview matches what Minecraft renders.
 */
export function TextureCanvas({ texture, width, height, nineSlice, grayscale, tiled }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const slice = nineSlice && nineSlice.some(v => v !== 0) ? nineSlice : texture.nineSlice;
  const sliceKey = slice.join(",");

  useEffect(() => {
    let cancelled = false;
    const canvas = canvasRef.current;
    if (!canvas) return;

    const w = Math.max(1, Math.round(width));
    const h = Math.max(1, Math.round(height));

    void (async () => {
      const img = await loadImage(texture.url);
      if (cancelled || !canvas.isConnected) return;
      const ctx = canvas.getContext("2d");
      if (!ctx || img.naturalWidth === 0) return;

      canvas.width = w;
      canvas.height = h;
      ctx.imageSmoothingEnabled = false;
      ctx.clearRect(0, 0, w, h);

      if (!slice.some(v => v !== 0)) {
        if (tiled) {
          const pattern = ctx.createPattern(img, "repeat");
          if (pattern) {
            ctx.fillStyle = pattern;
            ctx.fillRect(0, 0, w, h);
            return;
          }
        }
        ctx.drawImage(img, 0, 0, w, h);
        return;
      }

      // Sample at the logical resolution the borders refer to: a PNG stored at
      // a higher resolution than its base_size would index the wrong pixels.
      const [baseW, baseH] = texture.baseSize ?? [img.naturalWidth, img.naturalHeight];
      const source = document.createElement("canvas");
      source.width = baseW;
      source.height = baseH;
      const sourceCtx = source.getContext("2d");
      if (!sourceCtx) return;
      sourceCtx.imageSmoothingEnabled = false;
      sourceCtx.drawImage(img, 0, 0, baseW, baseH);

      const pixels = sourceCtx.getImageData(0, 0, baseW, baseH).data;
      const resized = ninesliceResize({ nineslice_size: slice, base_size: [baseW, baseH] }, pixels, w, h);
      ctx.putImageData(new ImageData(resized, w, h), 0, 0);
    })();

    return () => {
      cancelled = true;
    };
  }, [texture.url, texture.baseSize, width, height, sliceKey, tiled]);

  return (
    <canvas
      ref={canvasRef}
      className="jf-render__texture-canvas"
      style={{ filter: grayscale ? "grayscale(1)" : undefined }}
    />
  );
}
