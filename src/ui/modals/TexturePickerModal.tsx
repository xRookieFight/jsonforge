import { useEffect, useMemo, useRef, useState } from "react";
import { ImageUp, Search, Trash2, Upload, X } from "lucide-react";
import { Container } from "../../core/di/Container";
import { TextureMeta, TextureService } from "../../core/services/TextureService";

interface Props {
  open: boolean;
  value?: string;
  onClose(): void;
  onPick(texture: TextureMeta): void;
}

/** Turns "other_ore-ui_style" into "other ore-ui". */
function groupLabel(meta: TextureMeta): string {
  if (meta.source === "user") return "My Textures";
  if (meta.source === "vanilla") return "Vanilla";
  return (meta.style ?? "Presets").replace(/_style$/, "").replace(/_/g, " ");
}

export function TexturePickerModal({ open, value, onClose, onPick }: Props) {
  const [list, setList] = useState<TextureMeta[]>([]);
  const [search, setSearch] = useState("");
  const [png, setPng] = useState<File | null>(null);
  const [json, setJson] = useState<File | null>(null);
  const pngRef = useRef<HTMLInputElement>(null);
  const jsonRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!open) return;
    const service = Container.resolve<TextureService>(TextureService.NAME);
    setList(service.list());
    const off = service.bus.on<TextureMeta[]>("texture:list", payload => setList(payload));
    return () => off();
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [open, onClose]);

  const groups = useMemo(() => {
    const query = search.trim().toLowerCase();
    const out = new Map<string, TextureMeta[]>();
    for (const meta of list) {
      if (query && !meta.name.toLowerCase().includes(query)) continue;
      const label = groupLabel(meta);
      const bucket = out.get(label);
      if (bucket) bucket.push(meta);
      else out.set(label, [meta]);
    }
    // User textures first, the rest alphabetically.
    return [...out.entries()].sort(([a], [b]) =>
      a === "My Textures" ? -1 : b === "My Textures" ? 1 : a.localeCompare(b)
    );
  }, [list, search]);

  if (!open) return null;

  const doUpload = async () => {
    if (!png) return;
    const service = Container.resolve<TextureService>(TextureService.NAME);
    const meta = await service.upload(png);
    if (json) {
      try {
        const parsed = JSON.parse(await json.text()) as { nineslice_size?: number | number[] };
        const size = parsed.nineslice_size;
        if (typeof size === "number") service.setNineSlice(meta.id, [size, size, size, size]);
        else if (Array.isArray(size)) {
          const [l = 0, t = 0, r = l, b = t] = size;
          service.setNineSlice(meta.id, [l, t, r, b]);
        }
      } catch {
        /* invalid sidecar - the texture is still usable without nine-slice */
      }
    }
    setPng(null);
    setJson(null);
  };

  return (
    <div className="jf-modal__backdrop" onMouseDown={onClose}>
      <div className="jf-picker" onMouseDown={e => e.stopPropagation()}>
        <div className="jf-picker__header">
          <span className="jf-picker__title">Select Texture</span>
          <label className="jf-picker__search">
            <Search size={13} strokeWidth={1.75} />
            <input
              className="jf-input jf-input--inline"
              placeholder="Search textures..."
              value={search}
              autoFocus
              onChange={e => setSearch(e.target.value)}
            />
          </label>
          <button type="button" className="jf-icon-btn" onClick={onClose}>
            <X size={14} strokeWidth={2} />
          </button>
        </div>

        <div className="jf-picker__upload">
          <ImageUp size={14} strokeWidth={1.75} />
          <button type="button" className="jf-btn" onClick={() => pngRef.current?.click()}>
            {png?.name ?? "PNG"}
          </button>
          <button type="button" className="jf-btn" onClick={() => jsonRef.current?.click()}>
            {json?.name ?? "nine-slice JSON (optional)"}
          </button>
          <button type="button" className="jf-btn jf-btn--primary" disabled={!png} onClick={doUpload}>
            <Upload size={13} strokeWidth={1.75} />
            <span>Upload</span>
          </button>
          <input ref={pngRef} type="file" accept=".png,image/png" hidden onChange={e => setPng(e.target.files?.[0] ?? null)} />
          <input ref={jsonRef} type="file" accept=".json" hidden onChange={e => setJson(e.target.files?.[0] ?? null)} />
        </div>

        <div className="jf-picker__body">
          {groups.length === 0 && <div className="jf-picker__empty">No texture matches "{search}".</div>}
          {groups.map(([label, items]) => (
            <section key={label} className="jf-picker__group">
              <h4>
                {label} <span>{items.length}</span>
              </h4>
              <div className="jf-picker__grid">
                {items.map(meta => (
                  <button
                    key={meta.id}
                    type="button"
                    className={"jf-picker__tex" + (meta.name === value ? " jf-picker__tex--active" : "")}
                    title={`${meta.name} · ${meta.width}×${meta.height}`}
                    draggable
                    onDragStart={e => {
                      e.dataTransfer.effectAllowed = "copy";
                      e.dataTransfer.setData("application/jsonforge-texture", meta.name);
                      e.dataTransfer.setData("text/plain", meta.name);
                    }}
                    onClick={() => onPick(meta)}
                  >
                    <span className="jf-picker__thumb" style={{ backgroundImage: `url(${meta.url})` }} />
                    <span className="jf-picker__name">{meta.name.split("/").pop()}</span>
                    {meta.nineSlice.some(v => v !== 0) && <span className="jf-picker__badge">9</span>}
                    {meta.source === "user" && (
                      <span
                        className="jf-picker__remove"
                        title="Remove"
                        onClick={e => {
                          e.stopPropagation();
                          void Container.resolve<TextureService>(TextureService.NAME).remove(meta.id);
                        }}
                      >
                        <Trash2 size={11} strokeWidth={1.75} />
                      </span>
                    )}
                  </button>
                ))}
              </div>
            </section>
          ))}
        </div>
      </div>
    </div>
  );
}
