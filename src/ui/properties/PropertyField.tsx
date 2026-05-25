import { PropertyDescriptor, PropertyValue } from "../../core/property/base/PropertyType";
import { NumberField } from "./NumberField";
import { StringField } from "./StringField";
import { BooleanField } from "./BooleanField";
import { Vec2Field } from "./Vec2Field";
import { Vec4Field } from "./Vec4Field";
import { ColorField } from "./ColorField";
import { EnumField } from "./EnumField";
import { AnchorField } from "./AnchorField";
import { TextureField } from "./TextureField";
import { StringArrayField } from "./StringArrayField";

interface Props {
  descriptor: PropertyDescriptor;
  value: PropertyValue;
  onChange(value: PropertyValue): void;
}

export function PropertyField({ descriptor, value, onChange }: Props) {
  switch (descriptor.kind) {
    case "number":
      return (
        <NumberField
          value={typeof value === "number" ? value : Number(descriptor.default ?? 0)}
          min={descriptor.min}
          max={descriptor.max}
          step={descriptor.step}
          onChange={onChange}
        />
      );
    case "string":
      return <StringField value={String(value ?? "")} onChange={onChange} />;
    case "boolean":
      return <BooleanField value={Boolean(value)} onChange={onChange} />;
    case "vec2":
      return (
        <Vec2Field
          value={Array.isArray(value) && value.length === 2 ? (value as [number, number]) : [0, 0]}
          step={descriptor.step}
          onChange={onChange}
        />
      );
    case "vec4":
      return (
        <Vec4Field
          value={Array.isArray(value) && value.length === 4 ? (value as [number, number, number, number]) : [0, 0, 0, 0]}
          onChange={onChange}
        />
      );
    case "color":
      return <ColorField value={String(value ?? "#ffffff")} onChange={onChange} />;
    case "enum":
      return (
        <EnumField value={String(value ?? descriptor.default)} options={descriptor.options ?? []} onChange={onChange} />
      );
    case "anchor":
      return <AnchorField value={String(value ?? "center")} onChange={onChange} />;
    case "texture":
      return <TextureField value={String(value ?? "")} onChange={onChange} />;
    case "stringArray":
      return <StringArrayField value={Array.isArray(value) ? (value as string[]) : []} onChange={onChange} />;
    default:
      return <StringField value={String(value ?? "")} onChange={onChange} />;
  }
}
