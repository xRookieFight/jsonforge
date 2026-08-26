import { ReactNode } from "react";
import { Mosaic, MosaicWindow, MosaicNode, LegacyMosaicNode } from "react-mosaic-component";
import "react-mosaic-component/react-mosaic-component.css";

export type DockId =
  | "toolbox"
  | "hierarchy"
  | "canvas"
  | "properties"
  | "textures"
  | "bindings"
  | "json";

/** Mosaic 7 stores an n-ary tree but still accepts the old first/second one. */
export type DockNode = MosaicNode<DockId> | LegacyMosaicNode<DockId>;

interface Props {
  panels: Record<DockId, { title: string; content: ReactNode }>;
  initial: DockNode;
  onChange?(node: MosaicNode<DockId> | null): void;
}

export function DockLayout({ panels, initial, onChange }: Props) {
  return (
    <Mosaic<DockId>
      className="jf-mosaic"
      initialValue={initial}
      onChange={onChange}
      renderTile={(id, path) => (
        <MosaicWindow<DockId> path={path} title={panels[id].title} toolbarControls={<></>}>
          {panels[id].content}
        </MosaicWindow>
      )}
    />
  );
}
