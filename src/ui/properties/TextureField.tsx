import { useEffect, useState } from "react";
import { Container } from "../../core/di/Container";
import { TextureService, TextureMeta } from "../../core/services/TextureService";

interface Props {
  value: string;
  onChange(value: string): void;
}

export function TextureField({ value, onChange }: Props) {
  const [list, setList] = useState<TextureMeta[]>([]);
  const [hover, setHover] = useState(false);

  useEffect(() => {
    const service = Container.resolve<TextureService>(TextureService.NAME);
    setList(service.list());
    const off = service.bus.on<TextureMeta[]>("texture:list", payload => setList(payload));
    return () => off();
  }, []);

  const preview = list.find(t => t.name === value || t.id === value);

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
        {preview && (
          <div
            className="jf-texture-field__swatch"
            style={{ backgroundImage: `url(${preview.url})` }}
            title={preview.name}
          />
        )}
        <input
          className="jf-input"
          type="text"
          value={value}
          placeholder="textures/ui/... or drop here"
          onChange={e => onChange(e.target.value)}
        />
      </div>
      {list.length > 0 && (
        <select className="jf-input jf-select" value="" onChange={e => e.target.value && onChange(e.target.value)}>
          <option value="">Pick uploaded...</option>
          {list.map(tex => (
            <option key={tex.id} value={tex.name}>
              {tex.name}
            </option>
          ))}
        </select>
      )}
    </div>
  );
}
