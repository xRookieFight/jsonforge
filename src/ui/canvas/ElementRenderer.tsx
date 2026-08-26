import { CSSProperties, useEffect, useState } from "react";
import { ElementNode } from "../../core/element/ElementNode";
import { ElementRegistry } from "../../core/element/ElementRegistry";
import { ElementMetadata } from "../../core/element/base/ElementType";
import { ResolvedBox, computeBox } from "./anchorMath";
import { useProjectStore } from "../../state/projectStore";
import { useEditorStore } from "../../state/editorStore";
import { Container } from "../../core/di/Container";
import { TextureService, TextureMeta } from "../../core/services/TextureService";
import { TextureCanvas } from "./TextureCanvas";
import { TEXTURE_MIME, TEXTURE_SLOTS, applyTexture, findTexture } from "./textureDrop";

interface Props {
  node: ElementNode;
  parentBox: ResolvedBox;
}

export function ElementRenderer({ node, parentBox }: Props) {
  const selection = useProjectStore(s => s.selection);
  const selectOnly = useProjectStore(s => s.selectOnly);
  const toggleSelect = useProjectStore(s => s.toggleSelect);
  const setPropertyLive = useProjectStore(s => s.setPropertyLive);
  const commitPropertyBatch = useProjectStore(s => s.commitPropertyBatch);
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
  const layer = (node.properties["layer"] as number) ?? 0;
  const visible = (node.properties["visible"] as boolean) ?? true;

  const textureKey = TEXTURE_SLOTS[meta.id];
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
    // The game stacks controls by `layer`, so the preview has to as well -
    // otherwise a label drawn before an image looks buried here but sits on
    // top in game.
    zIndex: layer,
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
        if (textureKey && e.dataTransfer.types.includes(TEXTURE_MIME)) {
          e.preventDefault();
        }
      }}
      onDrop={e => {
        if (!textureKey) return;
        const name = e.dataTransfer.getData(TEXTURE_MIME);
        if (!name) return;
        e.preventDefault();
        e.stopPropagation();
        applyTexture(node, textureKey, name, setPropertyLive, commitPropertyBatch);
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
  if (meta.id === "label") return <LabelBody node={node} />;
  if (meta.id === "button") return <ButtonBody node={node} />;
  const textureKey = TEXTURE_SLOTS[meta.id];
  if (textureKey && node.properties[textureKey]) return <ImageBody node={node} textureKey={textureKey} />;
  if (meta.id === "image") return <ImageBody node={node} textureKey="texture" />;
  if (!showFrame) return null;
  return (
    <div className="jf-render__placeholder">
      <span>{hint.label ?? meta.label}</span>
      <span className="jf-render__name">{node.name}</span>
    </div>
  );
}

function hexToRgba(hex: string, alpha = 1): string {
  const cleaned = hex.replace("#", "");
  if (cleaned.length !== 6 && cleaned.length !== 8) return hex;
  const r = parseInt(cleaned.slice(0, 2), 16);
  const g = parseInt(cleaned.slice(2, 4), 16);
  const b = parseInt(cleaned.slice(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

function useTexture(name: string): TextureMeta | null {
  const [meta, setMeta] = useState<TextureMeta | null>(null);

  useEffect(() => {
    const service = Container.resolve<TextureService>(TextureService.NAME);
    setMeta(findTexture(service.list(), name));
    const offList = service.bus.on<TextureMeta[]>("texture:list", list => {
      setMeta(findTexture(list, name));
    });
    const offAdd = service.bus.on<TextureMeta>("texture:added", () => {
      setMeta(findTexture(service.list(), name));
    });
    return () => {
      offList();
      offAdd();
    };
  }, [name]);

  return meta;
}

function ImageBody({ node, textureKey }: { node: ElementNode; textureKey: string }) {
  const textureName = String(node.properties[textureKey] ?? "");
  const tint = String(node.properties["color"] ?? "#ffffff");
  const tiled = String(node.properties["tiled"] ?? "none");
  const grayscale = Boolean(node.properties["grayscale"]);
  const [width, height] = (node.properties["size"] as [number, number]) ?? [0, 0];
  const meta = useTexture(textureName);

  if (!meta) {
    return (
      <div className="jf-render__image jf-render__image--missing">
        {textureName && <span className="jf-render__placeholder-text">{textureName}</span>}
      </div>
    );
  }

  const nineSlice = node.properties["nineslice_size"] as [number, number, number, number] | undefined;
  const tintOverlay = tint !== "#ffffff" ? hexToRgba(tint, 0.4) : null;

  return (
    <div className="jf-render__image">
      <TextureCanvas
        texture={meta}
        width={width}
        height={height}
        nineSlice={Array.isArray(nineSlice) && nineSlice.length === 4 ? nineSlice : undefined}
        grayscale={grayscale}
        tiled={tiled !== "none"}
      />
      {tintOverlay && (
        <div className="jf-render__tint" style={{ background: tintOverlay }} />
      )}
    </div>
  );
}

/** Button preview: the state texture plus the text the form will feed. */
function ButtonBody({ node }: { node: ElementNode }) {
  const textureName = String(node.properties["default_texture"] ?? "");
  const [width, height] = (node.properties["size"] as [number, number]) ?? [0, 0];
  const meta = useTexture(textureName);
  const text = String(node.properties["text"] ?? "");
  const alignment = String(node.properties["text_alignment"] ?? "center");
  const scale = Number(node.properties["font_scale_factor"] ?? 1);

  return (
    <div className="jf-render__image">
      {meta && (
        <TextureCanvas
          texture={meta}
          width={width}
          height={height}
          nineSlice={node.properties["nineslice_size"] as [number, number, number, number] | undefined}
        />
      )}
      {text && (
        <div
          className="jf-render__label mc-font"
          style={{
            justifyContent: alignment === "left" ? "flex-start" : alignment === "right" ? "flex-end" : "center",
            fontSize: 12 * scale,
            fontFamily: fontFamilyOf(String(node.properties["font_type"] ?? "default")),
            textShadow: node.properties["shadow"] ? "2px 2px 0 #3f3f3f" : undefined
          }}
        >
          {text}
        </div>
      )}
    </div>
  );
}

/** Maps a JSON UI font type onto the bundled game fonts. */
function fontFamilyOf(fontType: string): string {
  if (fontType === "MinecraftTen") return "MinecraftTen, Minecraft, sans-serif";
  return "Minecraft, system-ui, sans-serif";
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
      className="jf-render__label mc-font"
      style={{
        color,
        fontSize: (sizeMap[fontSize] ?? 12) * scale,
        justifyContent: alignment === "center" ? "center" : alignment === "right" ? "flex-end" : "flex-start",
        fontFamily: fontFamilyOf(String(node.properties["font_type"] ?? "default")),
        textShadow: node.properties["shadow"] ? "2px 2px 0 #3f3f3f" : undefined
      }}
    >
      {text}
    </div>
  );
}
