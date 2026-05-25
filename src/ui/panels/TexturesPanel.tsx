import { useEffect, useRef, useState } from "react";
import { Trash2, Upload } from "lucide-react";
import { Container } from "../../core/di/Container";
import { TextureService, TextureMeta } from "../../core/services/TextureService";

export function TexturesPanel() {
  const [list, setList] = useState<TextureMeta[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const service = Container.resolve<TextureService>(TextureService.NAME);
    setList(service.list());
    const off = service.bus.on<TextureMeta[]>("texture:list", payload => setList(payload));
    return () => off();
  }, []);

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
      </div>
      <div className="jf-textures__grid">
        {list.map(tex => (
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
            <button
              type="button"
              className="jf-icon-btn jf-texture-card__remove"
              title="Remove"
              onClick={() => Container.resolve<TextureService>(TextureService.NAME).remove(tex.id)}
            >
              <Trash2 size={12} strokeWidth={1.75} />
            </button>
          </div>
        ))}
        {list.length === 0 && <div className="jf-textures__empty">No textures uploaded.</div>}
      </div>
    </div>
  );
}
