import { useEffect, useState } from "react";
import { ChevronDown, ChevronRight } from "lucide-react";
import { Container } from "../../core/di/Container";
import { ProjectService } from "../../core/services/ProjectService";
import { ElementNode } from "../../core/element/ElementNode";
import { ElementRegistry } from "../../core/element/ElementRegistry";
import { useProjectStore } from "../../state/projectStore";
import { iconForElement } from "../icons/elementIcons";

type DropZone = "before" | "into" | "after";

export function HierarchyPanel() {
  const version = useProjectStore(s => s.version);
  const selection = useProjectStore(s => s.selection);
  const selectOnly = useProjectStore(s => s.selectOnly);
  const toggleSelect = useProjectStore(s => s.toggleSelect);
  const renameElement = useProjectStore(s => s.renameElement);
  const moveNode = useProjectStore(s => s.moveNode);
  const copySelection = useProjectStore(s => s.copySelection);
  const cutSelection = useProjectStore(s => s.cutSelection);
  const paste = useProjectStore(s => s.paste);
  const deleteSelected = useProjectStore(s => s.deleteSelected);
  const duplicateSelected = useProjectStore(s => s.duplicateSelected);

  const [root, setRoot] = useState<ElementNode | null>(null);
  const [menu, setMenu] = useState<{ x: number; y: number; nodeId: string } | null>(null);

  useEffect(() => {
    const project = Container.resolve<ProjectService>(ProjectService.NAME);
    if (project.hasProject()) setRoot(project.getRoot());
  }, [version]);

  useEffect(() => {
    if (!menu) return;
    const close = () => setMenu(null);
    window.addEventListener("click", close);
    window.addEventListener("contextmenu", close);
    return () => {
      window.removeEventListener("click", close);
      window.removeEventListener("contextmenu", close);
    };
  }, [menu]);

  if (!root) return <div className="jf-panel jf-hierarchy">No project.</div>;

  return (
    <div className="jf-panel jf-hierarchy">
      <TreeRow
        node={root}
        parent={null}
        depth={0}
        selection={selection}
        onSelect={(id, mod) => (mod ? toggleSelect(id) : selectOnly(id))}
        onRename={renameElement}
        onMove={moveNode}
        onContextMenu={(e, id) => {
          e.preventDefault();
          e.stopPropagation();
          if (!selection.includes(id)) selectOnly(id);
          setMenu({ x: e.clientX, y: e.clientY, nodeId: id });
        }}
      />
      {menu && (
        <div
          className="jf-context-menu"
          style={{
            position: "fixed",
            left: menu.x,
            top: menu.y,
            background: "var(--jf-panel-bg, #2a2a30)",
            border: "1px solid var(--jf-border, #3a3a42)",
            borderRadius: 4,
            padding: 4,
            zIndex: 1000,
            minWidth: 160,
            boxShadow: "0 6px 20px rgba(0,0,0,0.4)"
          }}
          onClick={e => e.stopPropagation()}
        >
          <MenuItem label="Copy  Ctrl+C" onClick={() => { copySelection(); setMenu(null); }} />
          <MenuItem label="Cut  Ctrl+X" onClick={() => { cutSelection(); setMenu(null); }} />
          <MenuItem label="Paste  Ctrl+V" onClick={() => { paste(); setMenu(null); }} />
          <MenuItem label="Duplicate  Ctrl+D" onClick={() => { duplicateSelected(); setMenu(null); }} />
          <MenuItem label="Delete  Del" onClick={() => { deleteSelected(); setMenu(null); }} />
        </div>
      )}
    </div>
  );
}

function MenuItem({ label, onClick }: { label: string; onClick(): void }) {
  return (
    <div
      className="jf-context-menu__item"
      style={{ padding: "4px 10px", cursor: "pointer", fontSize: 12, borderRadius: 3 }}
      onMouseEnter={e => (e.currentTarget.style.background = "var(--jf-accent, #4a90e2)")}
      onMouseLeave={e => (e.currentTarget.style.background = "transparent")}
      onClick={onClick}
    >
      {label}
    </div>
  );
}

interface RowProps {
  node: ElementNode;
  parent: ElementNode | null;
  depth: number;
  selection: string[];
  onSelect(id: string, multi: boolean): void;
  onRename(id: string, name: string): void;
  onMove(id: string, newParentId: string, index: number): void;
  onContextMenu(e: React.MouseEvent, id: string): void;
}

function TreeRow({ node, parent, depth, selection, onSelect, onRename, onMove, onContextMenu }: RowProps) {
  const [collapsed, setCollapsed] = useState(false);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(node.name);
  const [zone, setZone] = useState<DropZone | null>(null);
  const meta = ElementRegistry.get().get(node.typeId)?.metadata();
  const Icon = iconForElement(node.typeId);
  const isSelected = selection.includes(node.id);
  const hasChildren = node.children.length > 0;
  const acceptsChildren = !!meta?.acceptsChildren;

  const computeZone = (e: React.DragEvent): DropZone => {
    const rect = e.currentTarget.getBoundingClientRect();
    const y = (e.clientY - rect.top) / rect.height;
    if (parent && y < 0.25) return "before";
    if (parent && y > 0.75) return "after";
    return acceptsChildren ? "into" : parent ? "after" : "into";
  };

  return (
    <div className="jf-tree">
      <div
        className={"jf-tree__row" + (isSelected ? " jf-tree__row--selected" : "")}
        style={{
          paddingLeft: 8 + depth * 14,
          position: "relative",
          boxShadow:
            zone === "into" ? "inset 0 0 0 1px var(--jf-accent)" :
            zone === "before" ? "inset 0 2px 0 0 var(--jf-accent)" :
            zone === "after" ? "inset 0 -2px 0 0 var(--jf-accent)" : "none"
        }}
        onClick={e => {
          e.stopPropagation();
          onSelect(node.id, e.shiftKey || e.ctrlKey || e.metaKey);
        }}
        onContextMenu={e => onContextMenu(e, node.id)}
        draggable
        onDragStart={e => {
          e.dataTransfer.setData("text/plain", node.id);
          e.dataTransfer.effectAllowed = "move";
        }}
        onDragOver={e => {
          e.preventDefault();
          setZone(computeZone(e));
        }}
        onDragLeave={() => setZone(null)}
        onDrop={e => {
          e.preventDefault();
          const id = e.dataTransfer.getData("text/plain");
          const z = computeZone(e);
          setZone(null);
          if (!id || id === node.id) return;
          if (z === "into") {
            if (!acceptsChildren) return;
            onMove(id, node.id, node.children.length);
          } else if (z === "before" && parent) {
            const idx = parent.children.indexOf(node);
            onMove(id, parent.id, idx);
          } else if (z === "after" && parent) {
            const idx = parent.children.indexOf(node);
            onMove(id, parent.id, idx + 1);
          }
        }}
      >
        {hasChildren ? (
          <button
            type="button"
            className="jf-tree__caret"
            onClick={e => {
              e.stopPropagation();
              setCollapsed(!collapsed);
            }}
          >
            {collapsed ? <ChevronRight size={12} /> : <ChevronDown size={12} />}
          </button>
        ) : (
          <span className="jf-tree__caret jf-tree__caret--leaf" />
        )}
        <Icon size={13} strokeWidth={1.75} className="jf-tree__icon" />
        {editing ? (
          <input
            className="jf-tree__rename"
            autoFocus
            value={draft}
            onChange={e => setDraft(e.target.value)}
            onBlur={() => {
              setEditing(false);
              if (draft && draft !== node.name) onRename(node.id, draft);
            }}
            onKeyDown={e => {
              if (e.key === "Enter") (e.target as HTMLInputElement).blur();
              if (e.key === "Escape") {
                setDraft(node.name);
                setEditing(false);
              }
            }}
          />
        ) : (
          <span
            className="jf-tree__label"
            onDoubleClick={e => {
              e.stopPropagation();
              setEditing(true);
              setDraft(node.name);
            }}
          >
            {node.name}
          </span>
        )}
        <span className="jf-tree__type">{meta?.label}</span>
      </div>
      {!collapsed && hasChildren && (
        <div className="jf-tree__children">
          {node.children.map(child => (
            <TreeRow
              key={child.id}
              node={child}
              parent={node}
              depth={depth + 1}
              selection={selection}
              onSelect={onSelect}
              onRename={onRename}
              onMove={onMove}
              onContextMenu={onContextMenu}
            />
          ))}
        </div>
      )}
    </div>
  );
}
