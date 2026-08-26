import { useEffect, useMemo, useRef, useState } from "react";
import { Trash2, Upload } from "lucide-react";
import { Container } from "../../core/di/Container";
import { TextureService, TextureMeta } from "../../core/services/TextureService";

const ALL_GROUPS = "all";

export function TexturesPanel() {
  const [list, setList] = useState<TextureMeta[]>([]);
  const [group, setGroup] = useState<string>(ALL_GROUPS);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const service = Container.resolve<TextureService>(TextureService.NAME);
    setList(service.list());
    const off = service.bus.on<TextureMeta[]>("texture:list", payload => setList(payload));
    return () => off();
  }, []);

  const groups = useMemo(() => {
    const found = new Set<string>();
    for (const tex of list) found.add(tex.style ?? tex.source);
    return [...found].sort();
  }, [list]);

  const shown = useMemo(
    () => (group === ALL_GROUPS ? list : list.filter(tex => (tex.style ?? tex.source) === group)),
    [list, group]
  );

  const handleUpload = async (files: FileList | null) => {
    if (!files) return;
    const service = Container.resolve<TextureService>(TextureService.NAME);
    for (const file of Array.from(files)) {
      await service.upload(file);
    }
  };

  return (
    <div className="jf-panel jf-textures">
      <div className="jf-textures__toolbar">
        <button type="button" className="jf-btn" onClick={() => inputRef.current?.click()}>
          <Upload size={13} strokeWidth={1.75} />
          <span>Upload</span>
        </button>
        <input
          ref={inputRef}
          type="file"
          hidden
          multiple
          accept="image/*"
          onChange={e => handleUpload(e.target.files)}
        />
        <select className="jf-input jf-select" value={group} onChange={e => setGroup(e.target.value)}>
          <option value={ALL_GROUPS}>All ({list.length})</option>
          {groups.map(name => (
            <option key={name} value={name}>
              {name}
            </option>
          ))}
        </select>
      </div>
      <div className="jf-textures__grid">
        {shown.map(tex => (
          <div
            className="jf-texture-card"
            key={tex.id}
            draggable
            title={`${tex.name} - drag onto an image element or texture field`}
            onDragStart={e => {
              e.dataTransfer.effectAllowed = "copy";
              e.dataTransfer.setData("application/jsonforge-texture", tex.name);
              e.dataTransfer.setData("text/plain", tex.name);
            }}
          >
            <div className="jf-texture-card__thumb" style={{ backgroundImage: `url(${tex.url})` }} />
            <div className="jf-texture-card__name" title={tex.name}>{tex.name}</div>
            <div className="jf-texture-card__meta">{tex.width}×{tex.height}</div>
            {tex.source === "user" && (
              <button
                type="button"
                className="jf-icon-btn jf-texture-card__remove"
                title="Remove"
                onClick={() => Container.resolve<TextureService>(TextureService.NAME).remove(tex.id)}
              >
                <Trash2 size={12} strokeWidth={1.75} />
              </button>
            )}
          </div>
        ))}
        {shown.length === 0 && <div className="jf-textures__empty">No textures here.</div>}
      </div>
    </div>
  );
}
