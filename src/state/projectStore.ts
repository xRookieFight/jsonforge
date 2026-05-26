import { create } from "zustand";
import { nanoid } from "nanoid";
import { ElementNode, ElementNodeData } from "../core/element/ElementNode";
import { ElementRegistry } from "../core/element/ElementRegistry";
import { Container } from "../core/di/Container";
import { ProjectService } from "../core/services/ProjectService";
import { SelectionService } from "../core/services/SelectionService";
import { HistoryService } from "../core/services/HistoryService";
import { PropertyValue } from "../core/property/base/PropertyType";

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
  copySelection(): void;
  cutSelection(): void;
  paste(): void;
  hasClipboard(): boolean;
  setNamespace(ns: string): void;
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

  setNamespace: ns => {
    const project = Container.resolve<ProjectService>(ProjectService.NAME);
    project.setNamespace(ns);
    get().refreshFromServices();
  }
}));
