import { useEffect, useState } from "react";
import { ImageIcon, X } from "lucide-react";
import { Container } from "../../core/di/Container";
import { TextureService, TextureMeta } from "../../core/services/TextureService";
import { TexturePickerModal } from "../modals/TexturePickerModal";
import { findTexture } from "../canvas/textureDrop";

interface Props {
  value: string;
  onChange(value: string): void;
}

export function TextureField({ value, onChange }: Props) {
  const [list, setList] = useState<TextureMeta[]>([]);
  const [hover, setHover] = useState(false);
  const [picking, setPicking] = useState(false);

  useEffect(() => {
    const service = Container.resolve<TextureService>(TextureService.NAME);
    setList(service.list());
    const off = service.bus.on<TextureMeta[]>("texture:list", payload => setList(payload));
    return () => off();
  }, []);

  const preview = findTexture(list, value);

  return (
    <div
      className={"jf-texture-field" + (hover ? " jf-texture-field--hover" : "")}
      onDragOver={e => {
        if (e.dataTransfer.types.includes("application/jsonforge-texture")) {
          e.preventDefault();
          setHover(true);
        }
      }}
      onDragLeave={() => setHover(false)}
      onDrop={e => {
        e.preventDefault();
        setHover(false);
        const name = e.dataTransfer.getData("application/jsonforge-texture");
        if (name) onChange(name);
      }}
    >
      <div className="jf-texture-field__row">
        <button
          type="button"
          className="jf-texture-field__swatch jf-texture-field__swatch--btn"
          title={preview ? preview.name : "Pick a texture"}
          style={preview ? { backgroundImage: `url(${preview.url})` } : undefined}
          onClick={() => setPicking(true)}
        >
          {!preview && <ImageIcon size={13} strokeWidth={1.75} />}
        </button>
        <input
          className="jf-input"
          type="text"
          value={value}
          placeholder="textures/ui/... or drop here"
          onChange={e => onChange(e.target.value)}
        />
        {value && (
          <button type="button" className="jf-icon-btn" title="Clear" onClick={() => onChange("")}>
            <X size={12} strokeWidth={2} />
          </button>
        )}
      </div>

      <TexturePickerModal
        open={picking}
        value={value}
        onClose={() => setPicking(false)}
        onPick={meta => {
          onChange(meta.name);
          setPicking(false);
        }}
      />
    </div>
  );
}
