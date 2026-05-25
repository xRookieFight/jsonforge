import { CSSProperties, useEffect, useState } from "react";
import { ElementNode } from "../../core/element/ElementNode";
import { ElementRegistry } from "../../core/element/ElementRegistry";
import { ElementMetadata } from "../../core/element/base/ElementType";
import { ResolvedBox, computeBox } from "./anchorMath";
import { useProjectStore } from "../../state/projectStore";
import { useEditorStore } from "../../state/editorStore";
import { Container } from "../../core/di/Container";
import { TextureService, TextureMeta } from "../../core/services/TextureService";

interface Props {
  node: ElementNode;
  parentBox: ResolvedBox;
}

export function ElementRenderer({ node, parentBox }: Props) {
  const selection = useProjectStore(s => s.selection);
  const selectOnly = useProjectStore(s => s.selectOnly);
  const toggleSelect = useProjectStore(s => s.toggleSelect);
  const setProperty = useProjectStore(s => s.setProperty);
  const viewMode = useEditorStore(s => s.viewMode);
  const showOutlines = useEditorStore(s => s.showOutlines);

  const type = ElementRegistry.get().get(node.typeId);
  if (!type) return null;
  const meta = type.metadata();
  const hint = type.renderHint();

  const size = (node.properties["size"] as [number, number]) ?? [120, 40];
  const offset = (node.properties["offset"] as [number, number]) ?? [0, 0];
  const anchorFrom = (node.properties["anchor_from"] as string) ?? "center";
  const anchorTo = (node.properties["anchor_to"] as string) ?? "center";
  const alpha = (node.properties["alpha"] as number) ?? 1;
  const visible = (node.properties["visible"] as boolean) ?? true;

  const box = computeBox(parentBox, size, offset, anchorFrom, anchorTo);
  const isSelected = selection.includes(node.id);
  const isPreview = viewMode === "preview";
  const showFrame = !isPreview && showOutlines;

  if (!visible) return null;

  const baseStyle: CSSProperties = {
    position: "absolute",
    left: box.x - parentBox.x,
    top: box.y - parentBox.y,
    width: box.width,
    height: box.height,
    opacity: alpha,
    boxSizing: "border-box",
    background: showFrame ? hint.background : "transparent",
    border: isSelected ? "1px solid var(--jf-accent)" : showFrame ? hint.border : "none",
    cursor: isPreview ? "default" : "pointer"
  };

  return (
    <div
      className={"jf-render jf-render--" + meta.id + (isSelected ? " jf-render--selected" : "")}
      style={baseStyle}
      data-element-id={node.id}
      onClick={e => {
        if (isPreview) return;
        e.stopPropagation();
        if (e.shiftKey || e.ctrlKey || e.metaKey) toggleSelect(node.id);
        else selectOnly(node.id);
      }}
      onDragOver={e => {
        if (meta.id === "image" && e.dataTransfer.types.includes("application/jsonforge-texture")) {
          e.preventDefault();
        }
      }}
      onDrop={e => {
        if (meta.id !== "image") return;
        const name = e.dataTransfer.getData("application/jsonforge-texture");
        if (!name) return;
        e.preventDefault();
        e.stopPropagation();
        setProperty(node.id, "texture", name);
      }}
    >
      <RenderBody node={node} meta={meta} hint={hint} showFrame={showFrame} />
      {node.children.map(child => (
        <ElementRenderer key={child.id} node={child} parentBox={box} />
      ))}
    </div>
  );
}

interface BodyProps {
  node: ElementNode;
  meta: ElementMetadata;
  hint: { background?: string; border?: string; label?: string };
  showFrame: boolean;
}

function RenderBody({ node, meta, hint, showFrame }: BodyProps) {
  if (meta.id === "image") return <ImageBody node={node} />;
  if (meta.id === "label") return <LabelBody node={node} />;
  if (!showFrame) return null;
  return (
    <div className="jf-render__placeholder">
      <span>{hint.label ?? meta.label}</span>
      <span className="jf-render__name">{node.name}</span>
    </div>
  );
}

function findTexture(list: TextureMeta[], query: string): TextureMeta | null {
  if (!query) return null;
  const lower = query.toLowerCase();
  const base = lower.split("/").pop() ?? lower;
  const stem = base.replace(/\.[^.]+$/, "");
  for (const tex of list) {
    if (tex.id === query) return tex;
    if (tex.name === query) return tex;
  }
  for (const tex of list) {
    const texName = tex.name.toLowerCase();
    const texStem = texName.replace(/\.[^.]+$/, "");
    if (texName === base || texStem === stem) return tex;
    if (texStem === lower || texName === lower) return tex;
  }
  return null;
}

function hexToRgba(hex: string, alpha = 1): string {
  const cleaned = hex.replace("#", "");
  if (cleaned.length !== 6 && cleaned.length !== 8) return hex;
  const r = parseInt(cleaned.slice(0, 2), 16);
  const g = parseInt(cleaned.slice(2, 4), 16);
  const b = parseInt(cleaned.slice(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

function ImageBody({ node }: { node: ElementNode }) {
  const textureName = String(node.properties["texture"] ?? "");
  const tint = String(node.properties["color"] ?? "#ffffff");
  const tiled = String(node.properties["tiled"] ?? "none");
  const grayscale = Boolean(node.properties["grayscale"]);
  const [meta, setMeta] = useState<TextureMeta | null>(null);

  useEffect(() => {
    const service = Container.resolve<TextureService>(TextureService.NAME);
    setMeta(findTexture(service.list(), textureName));
    const offList = service.bus.on<TextureMeta[]>("texture:list", list => {
      setMeta(findTexture(list, textureName));
    });
    const offAdd = service.bus.on<TextureMeta>("texture:added", () => {
      setMeta(findTexture(service.list(), textureName));
    });
    return () => {
      offList();
      offAdd();
    };
  }, [textureName]);

  const nineSlice = node.properties["nineslice_size"] as [number, number, number, number] | undefined;
  const hasNineSlice =
    Array.isArray(nineSlice) && nineSlice.length === 4 && nineSlice.some(v => v !== 0);

  if (!meta) {
    return (
      <div className="jf-render__image jf-render__image--missing">
        {textureName && <span className="jf-render__placeholder-text">{textureName}</span>}
      </div>
    );
  }

  if (hasNineSlice && nineSlice) {
    const [l, t, r, b] = nineSlice;
    return (
      <div
        className="jf-render__image jf-render__image--nineslice"
        style={{
          position: "absolute",
          inset: 0,
          borderStyle: "solid",
          borderWidth: `${t}px ${r}px ${b}px ${l}px`,
          borderImageSource: `url(${meta.url})`,
          borderImageSlice: `${t} ${r} ${b} ${l} fill`,
          borderImageRepeat: tiled === "none" ? "stretch" : "repeat",
          imageRendering: "pixelated",
          filter: grayscale ? "grayscale(1)" : undefined
        }}
      />
    );
  }

  const tintOverlay = tint !== "#ffffff" ? hexToRgba(tint, 0.4) : null;

  return (
    <div className="jf-render__image" style={{ position: "absolute", inset: 0, overflow: "hidden" }}>
      <img
        src={meta.url}
        alt={meta.name}
        draggable={false}
        style={{
          width: "100%",
          height: "100%",
          objectFit: tiled !== "none" ? "none" : "fill",
          imageRendering: "pixelated",
          display: "block",
          filter: grayscale ? "grayscale(1)" : undefined,
          pointerEvents: "none"
        }}
      />
      {tintOverlay && (
        <div
          style={{
            position: "absolute",
            inset: 0,
            background: tintOverlay,
            mixBlendMode: "multiply",
            pointerEvents: "none"
          }}
        />
      )}
    </div>
  );
}

function LabelBody({ node }: { node: ElementNode }) {
  const text = String(node.properties["text"] ?? "Label");
  const color = String(node.properties["color"] ?? "#ffffff");
  const alignment = String(node.properties["text_alignment"] ?? "left");
  const scale = Number(node.properties["font_scale_factor"] ?? 1);
  const fontSize = String(node.properties["font_size"] ?? "normal");
  const sizeMap: Record<string, number> = { small: 10, normal: 12, large: 16, extra_large: 20 };
  return (
    <div
      className="jf-render__label"
      style={{
        position: "absolute",
        inset: 0,
        color,
        fontSize: (sizeMap[fontSize] ?? 12) * scale,
        display: "flex",
        alignItems: "center",
        justifyContent: alignment === "center" ? "center" : alignment === "right" ? "flex-end" : "flex-start",
        padding: "0 4px",
        fontFamily: "MinecraftSeven, system-ui, sans-serif",
        textShadow: node.properties["shadow"] ? "1px 1px 0 rgba(0,0,0,0.7)" : undefined,
        pointerEvents: "none",
        whiteSpace: "nowrap",
        overflow: "hidden"
      }}
    >
      {text}
    </div>
  );
}
