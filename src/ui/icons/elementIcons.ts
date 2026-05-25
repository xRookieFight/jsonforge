import {
  Square,
  Rows3,
  Database,
  ScrollText,
  Image as ImageIcon,
  Type,
  MousePointerClick,
  Keyboard,
  ToggleRight,
  Sparkles,
  LucideIcon
} from "lucide-react";

export const ELEMENT_ICONS: Record<string, LucideIcon> = {
  panel: Square,
  stack_panel: Rows3,
  collection_panel: Database,
  scrolling_panel: ScrollText,
  image: ImageIcon,
  label: Type,
  button: MousePointerClick,
  input_panel: Keyboard,
  toggle: ToggleRight,
  custom: Sparkles
};

export function iconForElement(typeId: string): LucideIcon {
  return ELEMENT_ICONS[typeId] ?? Square;
}
