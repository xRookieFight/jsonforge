import { create } from "zustand";
import { nanoid } from "nanoid";
import { ElementNode, ElementNodeData } from "../core/element/ElementNode";
import { ElementRegistry } from "../core/element/ElementRegistry";
import { Container } from "../core/di/Container";
import { ProjectService } from "../core/services/ProjectService";
import { SelectionService } from "../core/services/SelectionService";
import { HistoryService } from "../core/services/HistoryService";
import { PropertyValue } from "../core/property/base/PropertyType";
import { ResolvedBox, computeBox } from "../ui/canvas/anchorMath";

interface ProjectStoreState {
  version: number;
  rootName: string;
  namespace: string;
  selection: string[];
  primarySelection: string | null;
  canUndo: boolean;
  canRedo: boolean;
  dirty: boolean;

  bumpVersion(): void;
  refreshFromServices(): void;
  selectOnly(id: string | null): void;
  toggleSelect(id: string): void;
  clearSelection(): void;
  setProperty(elementId: string, key: string, value: PropertyValue): void;
  setPropertyLive(elementId: string, key: string, value: PropertyValue): void;
  commitProperty(elementId: string, key: string, prev: PropertyValue, next: PropertyValue, label?: string): void;
  commitPropertyBatch(entries: Array<{ elementId: string; key: string; prev: PropertyValue; next: PropertyValue }>, label?: string): void;
  renameElement(elementId: string, name: string): void;
  addChild(parentId: string, typeId: string): string | null;
  deleteSelected(): void;
  duplicateSelected(): void;
  reorderChild(parentId: string, childId: string, newIndex: number): void;
  reparent(elementId: string, newParentId: string, index?: number): void;
  moveNode(elementId: string, newParentId: string, index: number): void;
  moveOut(elementId: string): void;
  groupSelection(): void;
  ungroupNode(elementId: string): void;
  copySelection(): void;
  cutSelection(): void;
  paste(): void;
  hasClipboard(): boolean;
  setNamespace(ns: string): void;
  nudgeSelection(dx: number, dy: number): void;
}

const selectionOf = () => Container.resolve<SelectionService>(SelectionService.NAME);

function sizeOf(node: ElementNode): [number, number] {
  return (node.properties["size"] as [number, number]) ?? [120, 40];
}

function offsetOf(node: ElementNode): [number, number] {
  return (node.properties["offset"] as [number, number]) ?? [0, 0];
}

function anchorsOf(node: ElementNode): [string, string] {
  return [
    (node.properties["anchor_from"] as string) ?? "center",
    (node.properties["anchor_to"] as string) ?? "center"
  ];
}

/** Where a node actually sits, walking the anchors down from the root. */
function absoluteBox(node: ElementNode): ResolvedBox {
  const path = node.path();
  let current: ResolvedBox = { x: 0, y: 0, width: sizeOf(path[0])[0], height: sizeOf(path[0])[1] };
  for (let i = 1; i < path.length; i++) {
    const [from, to] = anchorsOf(path[i]);
    current = computeBox(current, sizeOf(path[i]), offsetOf(path[i]), from, to);
  }
  return current;
}

/**
 * The offset that puts a node at a given place inside a given parent.
 *
 * Reparenting cannot carry the offset over: the number is measured from the
 * anchors of whatever contains the node, so the same offset lands somewhere
 * else under a new parent. Measuring the neutral position first turns "keep it
 * where it is" into a plain difference.
 */
function offsetWithin(node: ElementNode, parent: ResolvedBox, target: ResolvedBox): [number, number] {
  const [from, to] = anchorsOf(node);
  const neutral = computeBox(parent, sizeOf(node), [0, 0], from, to);
  return [Math.round(target.x - neutral.x), Math.round(target.y - neutral.y)];
}

const clipboard: { items: ElementNodeData[] } = { items: [] };

function reassignIds(data: ElementNodeData): ElementNodeData {
  return {
    ...data,
    id: nanoid(10),
    children: (data.children ?? []).map(reassignIds)
  };
}

export const useProjectStore = create<ProjectStoreState>((set, get) => ({
  version: 0,
  rootName: "root",
  namespace: "jsonforge",
  selection: [],
  primarySelection: null,
  canUndo: false,
  canRedo: false,
  dirty: false,

  bumpVersion: () => set(s => ({ version: s.version + 1 })),

  refreshFromServices: () => {
    const project = Container.resolve<ProjectService>(ProjectService.NAME);
    const selection = Container.resolve<SelectionService>(SelectionService.NAME);
    const history = Container.resolve<HistoryService>(HistoryService.NAME);
    if (!project.hasProject()) return;
    set({
      version: get().version + 1,
      rootName: project.getRoot().name,
      namespace: project.getMeta().namespace,
      selection: selection.ids(),
      primarySelection: selection.primary(),
      canUndo: history.canUndo(),
      canRedo: history.canRedo(),
      dirty: project.isDirty()
    });
  },

  selectOnly: id => {
    const selection = Container.resolve<SelectionService>(SelectionService.NAME);
    if (id === null) selection.clear();
    else selection.select(id);
    get().refreshFromServices();
  },

  toggleSelect: id => {
    const selection = Container.resolve<SelectionService>(SelectionService.NAME);
    selection.toggle(id);
    get().refreshFromServices();
  },

  clearSelection: () => {
    const selection = Container.resolve<SelectionService>(SelectionService.NAME);
    selection.clear();
    get().refreshFromServices();
  },

  setProperty: (elementId, key, value) => {
    const project = Container.resolve<ProjectService>(ProjectService.NAME);
    const node = project.getRoot().findById(elementId);
    if (!node) return;
    const history = Container.resolve<HistoryService>(HistoryService.NAME);
    const prev = node.properties[key];
    history.execute({
      label: `Set ${key}`,
      apply: () => {
        node.properties[key] = value;
        project.markDirty();
      },
      revert: () => {
        node.properties[key] = prev;
        project.markDirty();
      }
    });
    get().refreshFromServices();
  },

  setPropertyLive: (elementId, key, value) => {
    const project = Container.resolve<ProjectService>(ProjectService.NAME);
    const node = project.getRoot().findById(elementId);
    if (!node) return;
    node.properties[key] = value;
    project.markDirty();
    set(s => ({ version: s.version + 1 }));
  },

  commitProperty: (elementId, key, prev, next, label) => {
    const project = Container.resolve<ProjectService>(ProjectService.NAME);
    const node = project.getRoot().findById(elementId);
    if (!node) return;
    const history = Container.resolve<HistoryService>(HistoryService.NAME);
    history.push({
      label: label ?? `Set ${key}`,
      apply: () => {
        const n = project.getRoot().findById(elementId);
        if (!n) return;
        n.properties[key] = next;
        project.markDirty();
      },
      revert: () => {
        const n = project.getRoot().findById(elementId);
        if (!n) return;
        n.properties[key] = prev;
        project.markDirty();
      }
    });
    get().refreshFromServices();
  },

  commitPropertyBatch: (entries, label) => {
    if (entries.length === 0) return;
    const project = Container.resolve<ProjectService>(ProjectService.NAME);
    const history = Container.resolve<HistoryService>(HistoryService.NAME);
    history.push({
      label: label ?? "Edit",
      apply: () => {
        for (const e of entries) {
          const n = project.getRoot().findById(e.elementId);
          if (n) n.properties[e.key] = e.next;
        }
        project.markDirty();
      },
      revert: () => {
        for (const e of entries) {
          const n = project.getRoot().findById(e.elementId);
          if (n) n.properties[e.key] = e.prev;
        }
        project.markDirty();
      }
    });
    get().refreshFromServices();
  },

  renameElement: (elementId, name) => {
    const project = Container.resolve<ProjectService>(ProjectService.NAME);
    const node = project.getRoot().findById(elementId);
    if (!node) return;
    const history = Container.resolve<HistoryService>(HistoryService.NAME);
    const prev = node.name;
    history.execute({
      label: "Rename",
      apply: () => {
        node.name = name;
        project.markDirty();
      },
      revert: () => {
        node.name = prev;
        project.markDirty();
      }
    });
    get().refreshFromServices();
  },

  addChild: (parentId, typeId) => {
    const project = Container.resolve<ProjectService>(ProjectService.NAME);
    const parent = project.getRoot().findById(parentId);
    if (!parent) return null;
    const history = Container.resolve<HistoryService>(HistoryService.NAME);
    const type = ElementRegistry.get().get(typeId);
    if (!type) return null;
    const meta = type.metadata();
    const node = new ElementNode(typeId, meta.defaultName + "_" + Math.random().toString(36).slice(2, 6), {
      ...type.schema().defaults()
    });
    history.execute({
      label: `Add ${meta.label}`,
      apply: () => {
        parent.addChild(node);
        project.markDirty();
      },
      revert: () => {
        parent.removeChild(node);
        project.markDirty();
      }
    });
    const selection = Container.resolve<SelectionService>(SelectionService.NAME);
    selection.select(node.id);
    get().refreshFromServices();
    return node.id;
  },

  deleteSelected: () => {
    const project = Container.resolve<ProjectService>(ProjectService.NAME);
    const selection = Container.resolve<SelectionService>(SelectionService.NAME);
    const history = Container.resolve<HistoryService>(HistoryService.NAME);
    const ids = selection.ids();
    if (ids.length === 0) return;
    const removals = ids
      .map(id => {
        const node = project.getRoot().findById(id);
        if (!node || !node.parent) return null;
        return { parent: node.parent, node, index: node.parent.children.indexOf(node) };
      })
      .filter((entry): entry is { parent: ElementNode; node: ElementNode; index: number } => entry !== null);
    if (removals.length === 0) return;
    history.execute({
      label: "Delete",
      apply: () => {
        for (const { parent, node } of removals) parent.removeChild(node);
        project.markDirty();
      },
      revert: () => {
        for (const { parent, node, index } of removals) parent.addChild(node, index);
        project.markDirty();
      }
    });
    selection.clear();
    get().refreshFromServices();
  },

  duplicateSelected: () => {
    const project = Container.resolve<ProjectService>(ProjectService.NAME);
    const selection = Container.resolve<SelectionService>(SelectionService.NAME);
    const history = Container.resolve<HistoryService>(HistoryService.NAME);
    const ids = selection.ids();
    if (ids.length === 0) return;
    const copies: Array<{ parent: ElementNode; copy: ElementNode }> = [];
    for (const id of ids) {
      const node = project.getRoot().findById(id);
      if (!node || !node.parent) continue;
      copies.push({ parent: node.parent, copy: node.clone() });
    }
    if (copies.length === 0) return;
    history.execute({
      label: "Duplicate",
      apply: () => {
        for (const { parent, copy } of copies) parent.addChild(copy);
        project.markDirty();
      },
      revert: () => {
        for (const { parent, copy } of copies) parent.removeChild(copy);
        project.markDirty();
      }
    });
    selection.selectMany(copies.map(c => c.copy.id));
    get().refreshFromServices();
  },

  reorderChild: (parentId, childId, newIndex) => {
    const project = Container.resolve<ProjectService>(ProjectService.NAME);
    const parent = project.getRoot().findById(parentId);
    if (!parent) return;
    const child = parent.children.find(c => c.id === childId);
    if (!child) return;
    const history = Container.resolve<HistoryService>(HistoryService.NAME);
    const prevIndex = parent.children.indexOf(child);
    history.execute({
      label: "Reorder",
      apply: () => {
        parent.moveChild(child, newIndex);
        project.markDirty();
      },
      revert: () => {
        parent.moveChild(child, prevIndex);
        project.markDirty();
      }
    });
    get().refreshFromServices();
  },

  reparent: (elementId, newParentId, index) => {
    const project = Container.resolve<ProjectService>(ProjectService.NAME);
    const node = project.getRoot().findById(elementId);
    const newParent = project.getRoot().findById(newParentId);
    if (!node || !newParent || !node.parent) return;
    if (node === newParent) return;
    if (newParent.path().includes(node)) return;
    const history = Container.resolve<HistoryService>(HistoryService.NAME);
    const prevParent = node.parent;
    const prevIndex = prevParent.children.indexOf(node);
    history.execute({
      label: "Reparent",
      apply: () => {
        prevParent.removeChild(node);
        newParent.addChild(node, index);
        project.markDirty();
      },
      revert: () => {
        newParent.removeChild(node);
        prevParent.addChild(node, prevIndex);
        project.markDirty();
      }
    });
    get().refreshFromServices();
  },

  moveNode: (elementId, newParentId, index) => {
    const project = Container.resolve<ProjectService>(ProjectService.NAME);
    const node = project.getRoot().findById(elementId);
    const newParent = project.getRoot().findById(newParentId);
    if (!node || !newParent || !node.parent) return;
    if (node === newParent) return;
    if (newParent.path().includes(node)) return;
    const prevParent = node.parent;
    const prevIndex = prevParent.children.indexOf(node);
    let targetIndex = index;
    if (newParent === prevParent && targetIndex > prevIndex) targetIndex -= 1;
    if (newParent === prevParent && targetIndex === prevIndex) return;
    const history = Container.resolve<HistoryService>(HistoryService.NAME);
    history.execute({
      label: newParent === prevParent ? "Reorder" : "Reparent",
      apply: () => {
        prevParent.removeChild(node);
        newParent.addChild(node, targetIndex);
        project.markDirty();
      },
      revert: () => {
        newParent.removeChild(node);
        prevParent.addChild(node, prevIndex);
        project.markDirty();
      }
    });
    get().refreshFromServices();
  },

  /**
   * Lifts a node out of its parent, into the parent above it.
   *
   * Dragging a row onto the thin edge strip of another is the only other way
   * to do this, and it is a poor target - one that is not even there when the
   * element is alone in its panel.
   */
  moveOut: elementId => {
    const project = Container.resolve<ProjectService>(ProjectService.NAME);
    const node = project.getRoot().findById(elementId);
    const parent = node?.parent;
    const grandparent = parent?.parent;
    if (!node || !parent || !grandparent) return;

    const where = absoluteBox(node);
    const prevOffset = offsetOf(node);
    const prevIndex = parent.children.indexOf(node);
    const targetIndex = grandparent.children.indexOf(parent) + 1;

    const history = Container.resolve<HistoryService>(HistoryService.NAME);
    history.execute({
      label: "Move Out",
      apply: () => {
        parent.removeChild(node);
        grandparent.addChild(node, targetIndex);
        node.properties["offset"] = offsetWithin(node, absoluteBox(grandparent), where);
        project.markDirty();
      },
      revert: () => {
        grandparent.removeChild(node);
        parent.addChild(node, prevIndex);
        node.properties["offset"] = prevOffset;
        project.markDirty();
      }
    });
    get().refreshFromServices();
  },

  /** Wraps the selected siblings in a panel drawn around them. */
  groupSelection: () => {
    const project = Container.resolve<ProjectService>(ProjectService.NAME);
    const selection = Container.resolve<SelectionService>(SelectionService.NAME);
    const root = project.getRoot();

    const nodes = selection
      .ids()
      .map(id => root.findById(id))
      .filter((node): node is ElementNode => !!node && !!node.parent);
    if (nodes.length === 0) return;

    const parent = nodes[0].parent!;
    if (nodes.some(node => node.parent !== parent)) return;

    const boxes = nodes.map(absoluteBox);
    const left = Math.min(...boxes.map(b => b.x));
    const top = Math.min(...boxes.map(b => b.y));
    const width = Math.max(...boxes.map(b => b.x + b.width)) - left;
    const height = Math.max(...boxes.map(b => b.y + b.height)) - top;

    const type = ElementRegistry.get().get("panel");
    if (!type) return;
    const group = new ElementNode("panel", "group_" + nanoid(4), { ...type.schema().defaults() });
    group.properties["size"] = [Math.round(width), Math.round(height)];
    group.properties["anchor_from"] = "center";
    group.properties["anchor_to"] = "center";

    const index = Math.min(...nodes.map(node => parent.children.indexOf(node)));
    const previous = nodes.map(node => ({
      node,
      index: parent.children.indexOf(node),
      offset: offsetOf(node)
    }));

    const history = Container.resolve<HistoryService>(HistoryService.NAME);
    history.execute({
      label: "Group",
      apply: () => {
        for (const { node } of previous) parent.removeChild(node);
        parent.addChild(group, index);
        group.properties["offset"] = offsetWithin(group, absoluteBox(parent), { x: left, y: top, width, height });
        const inside = absoluteBox(group);
        for (let i = 0; i < previous.length; i++) {
          group.addChild(previous[i].node);
          previous[i].node.properties["offset"] = offsetWithin(previous[i].node, inside, boxes[i]);
        }
        project.markDirty();
      },
      revert: () => {
        for (const { node } of previous) group.removeChild(node);
        parent.removeChild(group);
        for (const entry of [...previous].sort((a, b) => a.index - b.index)) {
          parent.addChild(entry.node, entry.index);
          entry.node.properties["offset"] = entry.offset;
        }
        project.markDirty();
      }
    });
    selection.select(group.id);
    get().refreshFromServices();
  },

  /** Dissolves a container, leaving its children where they were drawn. */
  ungroupNode: elementId => {
    const project = Container.resolve<ProjectService>(ProjectService.NAME);
    const group = project.getRoot().findById(elementId);
    const parent = group?.parent;
    if (!group || !parent || group.children.length === 0) return;

    const children = [...group.children];
    const boxes = children.map(absoluteBox);
    const previous = children.map(node => ({ node, offset: offsetOf(node) }));
    const groupIndex = parent.children.indexOf(group);

    const history = Container.resolve<HistoryService>(HistoryService.NAME);
    history.execute({
      label: "Ungroup",
      apply: () => {
        for (const child of children) group.removeChild(child);
        parent.removeChild(group);
        const outside = absoluteBox(parent);
        for (let i = 0; i < children.length; i++) {
          parent.addChild(children[i], groupIndex + i);
          children[i].properties["offset"] = offsetWithin(children[i], outside, boxes[i]);
        }
        project.markDirty();
      },
      revert: () => {
        for (const child of children) parent.removeChild(child);
        parent.addChild(group, groupIndex);
        for (const entry of previous) {
          group.addChild(entry.node);
          entry.node.properties["offset"] = entry.offset;
        }
        project.markDirty();
      }
    });
    selectionOf().selectMany(children.map(child => child.id));
    get().refreshFromServices();
  },

  copySelection: () => {
    const project = Container.resolve<ProjectService>(ProjectService.NAME);
    const selection = Container.resolve<SelectionService>(SelectionService.NAME);
    if (!project.hasProject()) return;
    const ids = selection.ids();
    const items: ElementNodeData[] = [];
    for (const id of ids) {
      const node = project.getRoot().findById(id);
      if (node && node.parent) items.push(node.toData());
    }
    if (items.length === 0) return;
    clipboard.items = items;
  },

  cutSelection: () => {
    get().copySelection();
    get().deleteSelected();
  },

  paste: () => {
    if (clipboard.items.length === 0) return;
    const project = Container.resolve<ProjectService>(ProjectService.NAME);
    const selection = Container.resolve<SelectionService>(SelectionService.NAME);
    if (!project.hasProject()) return;
    const primary = selection.primary();
    let parent: ElementNode | null = null;
    let index: number | undefined = undefined;
    if (primary) {
      const node = project.getRoot().findById(primary);
      if (node) {
        if (node.children !== undefined && node.parent) {
          parent = node.parent;
          index = node.parent.children.indexOf(node) + 1;
        } else if (node.parent) {
          parent = node.parent;
        }
      }
    }
    if (!parent) parent = project.getRoot();
    const targetParent = parent;
    const fresh = clipboard.items.map(data => ElementNode.fromData(reassignIds(data)));
    const history = Container.resolve<HistoryService>(HistoryService.NAME);
    history.execute({
      label: "Paste",
      apply: () => {
        fresh.forEach((node, i) => {
          targetParent.addChild(node, index === undefined ? undefined : index + i);
        });
        project.markDirty();
      },
      revert: () => {
        for (const node of fresh) targetParent.removeChild(node);
        project.markDirty();
      }
    });
    selection.selectMany(fresh.map(n => n.id));
    get().refreshFromServices();
  },

  hasClipboard: () => clipboard.items.length > 0,

  nudgeSelection: (dx, dy) => {
    const project = Container.resolve<ProjectService>(ProjectService.NAME);
    const selection = Container.resolve<SelectionService>(SelectionService.NAME);
    if (!project.hasProject()) return;
    const entries: Array<{ elementId: string; prev: [number, number]; next: [number, number] }> = [];
    for (const id of selection.ids()) {
      const node = project.getRoot().findById(id);
      if (!node || node.locked) continue;
      const prev = ((node.properties["offset"] as [number, number]) ?? [0, 0]).slice() as [number, number];
      entries.push({ elementId: id, prev, next: [prev[0] + dx, prev[1] + dy] });
    }
    if (entries.length === 0) return;
    const history = Container.resolve<HistoryService>(HistoryService.NAME);
    history.execute({
      label: "Nudge",
      apply: () => {
        for (const entry of entries) {
          const node = project.getRoot().findById(entry.elementId);
          if (node) node.properties["offset"] = entry.next;
        }
        project.markDirty();
      },
      revert: () => {
        for (const entry of entries) {
          const node = project.getRoot().findById(entry.elementId);
          if (node) node.properties["offset"] = entry.prev;
        }
        project.markDirty();
      }
    });
    get().refreshFromServices();
  },

  setNamespace: ns => {
    const project = Container.resolve<ProjectService>(ProjectService.NAME);
    project.setNamespace(ns);
    get().refreshFromServices();
  }
}));
