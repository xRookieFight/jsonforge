export type PropertyKind =
  | "string"
  | "number"
  | "boolean"
  | "color"
  | "vec2"
  | "vec4"
  | "enum"
  | "texture"
  | "binding"
  | "stringArray"
  | "anchor";

export interface PropertyDescriptor<T = unknown> {
  key: string;
  label: string;
  kind: PropertyKind;
  group: string;
  default: T;
  options?: string[];
  min?: number;
  max?: number;
  step?: number;
  description?: string;
}

export type PropertyValue =
  | string
  | number
  | boolean
  | [number, number]
  | [number, number, number, number]
  | string[]
  | { binding_name: string; binding_type?: string; source_property_name?: string; target_property_name?: string }
  | null;
