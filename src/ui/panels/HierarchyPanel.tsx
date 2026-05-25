import { useEffect, useState } from "react";
import { ChevronDown, ChevronRight } from "lucide-react";
import { Container } from "../../core/di/Container";
import { ProjectService } from "../../core/services/ProjectService";
import { ElementNode } from "../../core/element/ElementNode";
import { ElementRegistry } from "../../core/element/ElementRegistry";
import { useProjectStore } from "../../state/projectStore";
import { iconForElement } from "../icons/elementIcons";

export function HierarchyPanel() {
  const version = useProjectStore(s => s.version);
  const selection = useProjectStore(s => s.selection);
  const selectOnly = useProjectStore(s => s.selectOnly);
  const toggleSelect = useProjectStore(s => s.toggleSelect);
  const renameElement = useProjectStore(s => s.renameElement);
  const reparent = useProjectStore(s => s.reparent);

  const [root, setRoot] = useState<ElementNode | null>(null);

  useEffect(() => {
    const project = Container.resolve<ProjectService>(ProjectService.NAME);
    if (project.hasProject()) setRoot(project.getRoot());
  }, [version]);

  if (!root) return <div className="jf-panel jf-hierarchy">No project.</div>;

  return (
    <div className="jf-panel jf-hierarchy">
      <TreeRow
        node={root}
        depth={0}
        selection={selection}
        onSelect={(id, mod) => (mod ? toggleSelect(id) : selectOnly(id))}
        onRename={renameElement}
        onReparent={reparent}
      />
    </div>
  );
}

interface RowProps {
  node: ElementNode;
  depth: number;
  selection: string[];
  onSelect(id: string, multi: boolean): void;
  onRename(id: string, name: string): void;
  onReparent(id: string, newParentId: string, index?: number): void;
}

function TreeRow({ node, depth, selection, onSelect, onRename, onReparent }: RowProps) {
  const [collapsed, setCollapsed] = useState(false);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(node.name);
  const meta = ElementRegistry.get().get(node.typeId)?.metadata();
  const Icon = iconForElement(node.typeId);
  const isSelected = selection.includes(node.id);
  const hasChildren = node.children.length > 0;

  return (
    <div className="jf-tree">
      <div
        className={"jf-tree__row" + (isSelected ? " jf-tree__row--selected" : "")}
        style={{ paddingLeft: 8 + depth * 14 }}
        onClick={e => {
          e.stopPropagation();
          onSelect(node.id, e.shiftKey || e.ctrlKey || e.metaKey);
        }}
        draggable
        onDragStart={e => {
          e.dataTransfer.setData("text/plain", node.id);
          e.dataTransfer.effectAllowed = "move";
        }}
        onDragOver={e => {
          if (meta?.acceptsChildren) e.preventDefault();
        }}
        onDrop={e => {
          e.preventDefault();
          const id = e.dataTransfer.getData("text/plain");
          if (id && meta?.acceptsChildren && id !== node.id) onReparent(id, node.id);
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
              depth={depth + 1}
              selection={selection}
              onSelect={onSelect}
              onRename={onRename}
              onReparent={onReparent}
            />
          ))}
        </div>
      )}
    </div>
  );
}
