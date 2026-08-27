import { useEffect, useState } from "react";
import { ChevronDown, ChevronRight } from "lucide-react";
import { Container } from "../../core/di/Container";
import { ProjectService } from "../../core/services/ProjectService";
import { ElementNode } from "../../core/element/ElementNode";
import { ElementRegistry } from "../../core/element/ElementRegistry";
import { useProjectStore } from "../../state/projectStore";
import { iconForElement } from "../icons/elementIcons";

type DropZone = "before" | "into" | "after";

/**
 * Row being dragged, kept outside React on purpose.
 *
 * `dataTransfer` only hands its payload back on drop, so a row being dragged
 * over cannot ask what is coming. Without it every row lights up, including
 * the ones inside the dragged element - which the move then refuses, leaving
 * the drop looking broken.
 */
let dragging: string | null = null;

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
  const moveOut = useProjectStore(s => s.moveOut);
  const groupSelection = useProjectStore(s => s.groupSelection);
  const ungroupNode = useProjectStore(s => s.ungroupNode);

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

  const target = menu ? root.findById(menu.nodeId) : null;

  // Every container between the root and something selected, so the tree can
  // show which panel the selection actually lives in.
  const ancestors = new Set<string>();
  for (const id of selection) {
    const node = root.findById(id);
    for (const step of node?.path() ?? []) {
      if (step.id !== id) ancestors.add(step.id);
    }
  }

  return (
    <div className="jf-panel jf-hierarchy">
      <TreeRow
        node={root}
        parent={null}
        selection={selection}
        ancestors={ancestors}
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
          style={{ left: menu.x, top: menu.y }}
          onClick={e => e.stopPropagation()}
        >
          {target?.parent?.parent && (
            <MenuItem
              label="Move Out of Panel"
              hint={`to ${target.parent.parent.name}`}
              onClick={() => { moveOut(menu.nodeId); setMenu(null); }}
            />
          )}
          {target && target.parent && (
            <MenuItem label="Group into Panel" onClick={() => { groupSelection(); setMenu(null); }} />
          )}
          {target && target.parent && target.children.length > 0 && (
            <MenuItem label="Ungroup" onClick={() => { ungroupNode(menu.nodeId); setMenu(null); }} />
          )}
          <div className="jf-context-menu__sep" />
          <MenuItem label="Copy" hint="Ctrl+C" onClick={() => { copySelection(); setMenu(null); }} />
          <MenuItem label="Cut" hint="Ctrl+X" onClick={() => { cutSelection(); setMenu(null); }} />
          <MenuItem label="Paste" hint="Ctrl+V" onClick={() => { paste(); setMenu(null); }} />
          <MenuItem label="Duplicate" hint="Ctrl+D" onClick={() => { duplicateSelected(); setMenu(null); }} />
          <div className="jf-context-menu__sep" />
          <MenuItem label="Delete" hint="Del" onClick={() => { deleteSelected(); setMenu(null); }} />
        </div>
      )}
    </div>
  );
}

function MenuItem({ label, hint, onClick }: { label: string; hint?: string; onClick(): void }) {
  return (
    <div className="jf-context-menu__item" onClick={onClick}>
      <span>{label}</span>
      {hint && <span className="jf-context-menu__hint">{hint}</span>}
    </div>
  );
}

interface RowProps {
  node: ElementNode;
  parent: ElementNode | null;
  selection: string[];
  /** Ids of the containers the selection sits inside. */
  ancestors: Set<string>;
  onSelect(id: string, multi: boolean): void;
  onRename(id: string, name: string): void;
  onMove(id: string, newParentId: string, index: number): void;
  onContextMenu(e: React.MouseEvent, id: string): void;
}

function TreeRow({ node, parent, selection, ancestors, onSelect, onRename, onMove, onContextMenu }: RowProps) {
  const [collapsed, setCollapsed] = useState(false);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(node.name);
  const [zone, setZone] = useState<DropZone | null>(null);
  const meta = ElementRegistry.get().get(node.typeId)?.metadata();
  const Icon = iconForElement(node.typeId);
  const isSelected = selection.includes(node.id);
  const hasChildren = node.children.length > 0;
  const acceptsChildren = !!meta?.acceptsChildren;

  // A node cannot be dropped inside itself: the move would build a cycle.
  const accepts = !dragging || !node.path().some(step => step.id === dragging);

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
        className={
          "jf-tree__row" +
          (isSelected ? " jf-tree__row--selected" : "") +
          (!isSelected && ancestors.has(node.id) ? " jf-tree__row--ancestor" : "")
        }
        style={{
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
          dragging = node.id;
          e.dataTransfer.setData("text/plain", node.id);
          e.dataTransfer.effectAllowed = "move";
        }}
        onDragEnd={() => {
          dragging = null;
          setZone(null);
        }}
        onDragOver={e => {
          if (!accepts) return;
          e.preventDefault();
          setZone(computeZone(e));
        }}
        onDragLeave={() => setZone(null)}
        onDrop={e => {
          e.preventDefault();
          dragging = null;
          if (!accepts) return;
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
        {hasChildren && <span className="jf-tree__count">{node.children.length}</span>}
        <span className="jf-tree__type">{meta?.label}</span>
      </div>
      {!collapsed && hasChildren && (
        <div className="jf-tree__children">
          {node.children.map(child => (
            <TreeRow
              key={child.id}
              node={child}
              parent={node}
              selection={selection}
              ancestors={ancestors}
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
