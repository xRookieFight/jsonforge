/**
 * Turns an element tree into the JSON UI file of one addon screen.
 *
 * The whole screen becomes a single panel anchored at the centre of the game
 * screen. Wrapping everything in one root panel keeps the drawing centred at
 * any resolution and stops sibling controls at the root from colliding on the
 * same key.
 */
import { ElementNode } from "../element/ElementNode";
import { ElementRegistry } from "../element/ElementRegistry";
import { Container } from "../di/Container";
import { BindingService } from "../services/BindingService";
import {
  JsonUiNode,
  buttonFaceTemplate,
  customButtonTemplate,
  scrollingContentTemplate
} from "./AddonTemplates";
import { FORM_BUTTON_COLLECTION, buildButtonIndexMap } from "./FormButtons";

/** Converts a texture name from the editor into a path inside the pack. */
export type TextureResolver = (editorName: string) => string;

export type ScreenScaleMode = "fit" | "absolute";

export interface SerializeOptions {
  namespace: string;
  resolveTexture: TextureResolver;
  /**
   * How the drawn layout maps onto the game screen.
   *
   * "fit" writes every size and offset as a percentage of its parent and lets
   * the screen panel fill the display, so the result covers the same share of
   * the screen as in the editor. "absolute" keeps the numbers, which only
   * matches when the design canvas happens to be the size of the game screen -
   * that is why an exported screen used to look smaller in game.
   */
  scaleMode?: ScreenScaleMode;
  /**
   * Drops `nineslice_size` from the controls. The pack builder turns this on
   * because it writes the .json next to the texture with the original data of
   * the art, and a control value would take priority over that file.
   */
  omitControlNineslice?: boolean;
  /**
   * Makes the top level panel fill its parent instead of carrying the size of
   * the drawn node. The scoreboard export needs it: the vanilla sidebar decides
   * where the board sits, and the artwork simply fills that box.
   */
  fillParent?: boolean;
}

/** `#rrggbb` into the `[r, g, b]` floats JSON UI expects. */
function hexToRgb(hex: string): [number, number, number] | null {
  const clean = hex.replace("#", "").trim();
  if (clean.length !== 6 && clean.length !== 8) return null;
  const value = Number.parseInt(clean.slice(0, 6), 16);
  if (Number.isNaN(value)) return null;
  return [
    Math.round(((value >> 16) & 255) / 2.55) / 100,
    Math.round(((value >> 8) & 255) / 2.55) / 100,
    Math.round((value & 255) / 2.55) / 100
  ];
}

/** Layer of the custom screen: above the vanilla form dialog. */
const SCREEN_LAYER = 100;

/**
 * Handled apart from the plain property copy: nine-slice is either dropped or
 * written by the pack builder next to the texture.
 */
const SKIPPED_KEYS = new Set<string>(["nineslice_size", "sb_source", "sb_index"]);

/** Scoreboard bindings a label can be wired to, per `sb_source`. */
const SCOREBOARD_SOURCES: Record<string, { binding: string; collection?: string }> = {
  objective_title: { binding: "#objective_sidebar_name" },
  player_name: { binding: "#player_name_sidebar", collection: "scoreboard_players" },
  player_score: { binding: "#player_score_sidebar", collection: "scoreboard_scores" }
};

const TEXTURE_KEYS = ["texture", "default_texture", "hover_texture", "pressed_texture", "icon_texture"];

interface SerializeCtx {
  namespace: string;
  resolveTexture: TextureResolver;
  omitNineslice: boolean;
  /** Percentages are relative to this box, in editor units. */
  parentSize: [number, number];
  /** Off inside a scrolling panel, where a `%c` parent makes `%` circular. */
  fit: boolean;
  buttonIndex: Map<string, number>;
  /** Scrolling panel contents, which must be hoisted to the file root. */
  hoisted: Record<string, JsonUiNode>;
  usedNames: Set<string>;
}

export class ScreenSerializer {
  private readonly options: SerializeOptions;

  public constructor(options: SerializeOptions) {
    this.options = options;
  }

  public serialize(root: ElementNode): Record<string, unknown> {
    const rootSize = (root.properties["size"] as [number, number]) ?? [384, 216];
    const ctx: SerializeCtx = {
      namespace: this.options.namespace,
      resolveTexture: this.options.resolveTexture,
      omitNineslice: this.options.omitControlNineslice ?? false,
      parentSize: rootSize,
      fit: (this.options.scaleMode ?? "fit") === "fit",
      buttonIndex: buildButtonIndexMap(root),
      hoisted: {},
      usedNames: new Set()
    };

    const controls = this.buildChildren(root.children, ctx);

    const file: Record<string, unknown> = {
      namespace: ctx.namespace,
      // Inherits from the vanilla button - that is what makes
      // `collection_index` valid on the nodes pointing at it.
      "custom_button@common_buttons.light_content_button": customButtonTemplate(ctx.namespace),
      button_face: buttonFaceTemplate()
    };

    Object.assign(file, ctx.hoisted);

    file[ctx.namespace] = {
      type: "panel",
      // The screen fills the display; the children carry the proportions.
      size: ctx.fit || this.options.fillParent ? ["100%", "100%"] : rootSize,
      anchor_from: this.options.fillParent ? "top_left" : "center",
      anchor_to: this.options.fillParent ? "top_left" : "center",
      offset: [0, 0],
      layer: this.options.fillParent ? 0 : SCREEN_LAYER,
      controls
    };

    return file;
  }

  public serializeToString(root: ElementNode): string {
    return JSON.stringify(this.serialize(root), null, 4) + "\n";
  }

  /** Percentage of a parent measurement, rounded to two decimals. */
  private percent(value: number, base: number): string {
    if (!base) return "0%";
    return `${Math.round((value / base) * 10000) / 100}%`;
  }

  private sizeOf(node: ElementNode, ctx: SerializeCtx): unknown[] {
    const size = (node.properties["size"] as [number, number]) ?? [120, 40];
    if (!ctx.fit) return size;
    return [this.percent(size[0], ctx.parentSize[0]), this.percent(size[1], ctx.parentSize[1])];
  }

  private offsetOf(node: ElementNode, ctx: SerializeCtx): unknown[] {
    const offset = (node.properties["offset"] as [number, number]) ?? [0, 0];
    if (!ctx.fit) return offset;
    return [this.percent(offset[0], ctx.parentSize[0]), this.percent(offset[1], ctx.parentSize[1])];
  }

  /** Context for the children of a node, measured against that node. */
  private childCtx(node: ElementNode, ctx: SerializeCtx, fit = ctx.fit): SerializeCtx {
    return { ...ctx, fit, parentSize: (node.properties["size"] as [number, number]) ?? ctx.parentSize };
  }

  private buildChildren(nodes: ElementNode[], ctx: SerializeCtx): Array<Record<string, JsonUiNode>> {
    const out: Array<Record<string, JsonUiNode>> = [];
    for (const node of nodes) {
      const entry = this.buildNode(node, ctx);
      if (entry) out.push(entry);
    }
    return out;
  }

  private buildNode(node: ElementNode, ctx: SerializeCtx): Record<string, JsonUiNode> | null {
    const type = ElementRegistry.get().get(node.typeId);
    if (!type) return null;

    if (node.typeId === "button") return this.buildFormButton(node, ctx);
    if (node.typeId === "label") {
      const live = this.buildLiveLabel(node, ctx);
      if (live) return live;
    }
    if (node.typeId === "scrolling_panel") {
      return { [this.uniqueName(node.name, ctx)]: this.buildScrollingPanel(node, ctx) };
    }

    const json = this.baseNode(node, ctx);
    // A panel cannot draw a texture, but an `image` also accepts `controls`.
    json["type"] = json["texture"] ? "image" : type.metadata().jsonUiType;

    if (type.metadata().acceptsChildren && node.children.length > 0) {
      json["controls"] = this.buildChildren(node.children, this.childCtx(node, ctx));
    }

    return { [this.uniqueName(node.name, ctx)]: json };
  }

  /**
   * A label wired to the scoreboard.
   *
   * The objective name is a global binding, so a plain label carries it. Names
   * and scores live in collections: the label needs a `collection_index` and a
   * `collection_panel` around it to open the collection scope, exactly like a
   * form button - that is what lets a design put row 0 and row 1 wherever it
   * wants instead of stacking them.
   */
  private buildLiveLabel(node: ElementNode, ctx: SerializeCtx): Record<string, JsonUiNode> | null {
    const source = node.properties["sb_source"];
    if (typeof source !== "string" || source === "none") return null;
    const wiring = SCOREBOARD_SOURCES[source];
    if (!wiring) return null;

    const label = this.baseNode(node, ctx);
    label["type"] = "label";
    label["text"] = wiring.binding;
    label["localize"] = false;
    label["size"] = wiring.collection ? ["100%", "100%"] : label["size"];
    if (wiring.collection) label["offset"] = [0, 0];

    if (!wiring.collection) {
      label["bindings"] = [{ binding_name: wiring.binding, binding_type: "global" }];
      return { [this.uniqueName(node.name, ctx)]: label };
    }

    const index = typeof node.properties["sb_index"] === "number" ? node.properties["sb_index"] : 0;
    label["collection_index"] = index;
    label["bindings"] = [
      {
        binding_name: wiring.binding,
        binding_type: "collection",
        binding_collection_name: wiring.collection
      }
    ];

    const wrapperName = this.uniqueName(node.name, ctx);
    return {
      [wrapperName]: {
        type: "collection_panel",
        collection_name: wiring.collection,
        size: this.sizeOf(node, ctx),
        offset: this.offsetOf(node, ctx),
        anchor_from: node.properties["anchor_from"] ?? "top_left",
        anchor_to: node.properties["anchor_to"] ?? "top_left",
        layer: node.properties["layer"] ?? 0,
        controls: [{ [`${wrapperName}_value`]: label }]
      }
    };
  }

  /**
   * A button lives inside a collection_panel: that is the type that can declare
   * `collection_name`, and it opens the scope of the form collection.
   */
  private buildFormButton(node: ElementNode, ctx: SerializeCtx): Record<string, JsonUiNode> {
    const props = node.properties;
    const defaultTexture = this.texture(props["default_texture"], ctx);
    const button: JsonUiNode = {
      // Inside the wrapper the button fills everything; position is the
      // wrapper's business.
      $button_offset: [0, 0],
      $button_size: ["100%", "100%"],

      layer: 0,
      anchor_from: "top_left",
      anchor_to: "top_left",
      // Positional index in the `form_buttons` collection: it has to match the
      // order of the `form.button(...)` calls in the script.
      collection_index: ctx.buttonIndex.get(node.id) ?? 0,

      $icon_offset: [2, 2],
      $icon_size: ["100%", "100%"],

      $font_size: (props["font_scale_factor"] as number) ?? 1,
      $text_offset: [0, 0],
      $font_type: (props["font_type"] as string) ?? "default",
      $shadow: (props["shadow"] as boolean) ?? false,
      $text_alignment: (props["text_alignment"] as string) ?? "center"
    };

    // Empty texture variables would override the template defaults with an
    // empty path, so they are only written when the editor has a texture.
    if (defaultTexture) {
      button["$default_button_background_texture"] = defaultTexture;
      button["$hover_button_background_texture"] = this.texture(props["hover_texture"], ctx) || defaultTexture;
      button["$pressed_button_background_texture"] = this.texture(props["pressed_texture"], ctx) || defaultTexture;
    }

    const bindings = this.bindings(node);
    if (bindings) button["bindings"] = bindings;

    const wrapperName = this.uniqueName(node.name, ctx);
    return {
      [wrapperName]: {
        type: "collection_panel",
        collection_name: FORM_BUTTON_COLLECTION,
        size: this.sizeOf(node, ctx),
        offset: this.offsetOf(node, ctx),
        anchor_from: props["anchor_from"] ?? "top_left",
        anchor_to: props["anchor_to"] ?? "top_left",
        controls: [{ [`${wrapperName}_button@${ctx.namespace}.custom_button`]: button }]
      }
    };
  }

  /** Scrolling panel: stack_panel plus common.scrolling_panel linker. */
  private buildScrollingPanel(node: ElementNode, ctx: SerializeCtx): JsonUiNode {
    const size = (node.properties["size"] as [number, number]) ?? [100, 100];
    const contentName = this.uniqueName(node.name + "_content", ctx);

    const content = scrollingContentTemplate();
    // The content box is `100%c` tall: a percentage child of it would be a
    // circular dependency and the game would draw nothing.
    if (node.children.length > 0) {
      content["controls"] = this.buildChildren(node.children, this.childCtx(node, ctx, false));
    }
    // The scrolling content has to exist as a top level control of the file.
    ctx.hoisted[contentName] = content;

    return {
      type: "stack_panel",
      size: this.sizeOf(node, ctx),
      orientation: "vertical",
      layer: 0,
      anchor_from: node.properties["anchor_from"] ?? "top_left",
      anchor_to: node.properties["anchor_to"] ?? "top_left",
      offset: this.offsetOf(node, ctx),
      controls: [
        {
          [`${contentName}_linker@common.scrolling_panel`]: {
            anchor_from: "top_left",
            anchor_to: "top_left",
            $show_background: false,
            size: ["100%", "100%"],
            $scrolling_content: `${ctx.namespace}.${contentName}`,
            $scroll_size: [5, size[1]],
            $scrolling_pane_size: size,
            $scrolling_pane_offset: [0, 0]
          }
        }
      ]
    };
  }

  private baseNode(node: ElementNode, ctx: SerializeCtx): JsonUiNode {
    const json: JsonUiNode = {};
    for (const [key, value] of Object.entries(node.properties)) {
      if (value === undefined || value === null) continue;
      if (typeof value === "string" && value === "") continue;
      if (Array.isArray(value) && value.length === 0) continue;
      if (SKIPPED_KEYS.has(key)) continue;
      const clean = TEXTURE_KEYS.includes(key) ? this.texture(value, ctx) : this.sanitize(key, value);
      if (clean !== undefined) json[key] = clean;
    }

    json["size"] = this.sizeOf(node, ctx);
    json["offset"] = this.offsetOf(node, ctx);

    const nineslice = node.properties["nineslice_size"];
    if (!ctx.omitNineslice && Array.isArray(nineslice) && nineslice.some(v => v !== 0)) {
      json["nineslice_size"] = nineslice;
    }

    const bindings = this.bindings(node);
    if (bindings) json["bindings"] = bindings;
    return json;
  }

  /**
   * Editor values into what JSON UI actually accepts.
   *
   * The editor keeps colours as hex and tiling as a word because that is what
   * the property panel needs; the game wants `[r, g, b]` floats and a boolean,
   * and a control carrying an unknown value is dropped with an error in the
   * content log - which is why a screen could come out empty in game.
   */
  private sanitize(key: string, value: unknown): unknown {
    if (key === "color" && typeof value === "string") return hexToRgb(value) ?? undefined;

    if (key === "tiled") {
      if (value === "none" || value === false) return undefined;
      if (value === "x" || value === "y") return value;
      return true;
    }

    // Zero UV values are not "unset" for the game: they clip the image away.
    if ((key === "uv" || key === "uv_size") && Array.isArray(value)) {
      return value.some(v => v !== 0) ? value : undefined;
    }

    if (key === "font_scale_factor" && value === 1) return undefined;
    if (key === "alpha" && value === 1) return undefined;
    if (key === "grayscale" && value === false) return undefined;
    if (key === "localize" && value === false) return undefined;
    if (key === "enabled" && value === true) return undefined;
    if (key === "propagate_alpha" && value === true) return undefined;
    if (key === "clips_children" && value === false) return undefined;

    return value;
  }

  private bindings(node: ElementNode): unknown[] | null {
    if (!Container.isBooted()) return null;
    const list = Container.resolve<BindingService>(BindingService.NAME).get(node.id);
    return list.length > 0 ? list : null;
  }

  private texture(value: unknown, ctx: SerializeCtx): string {
    if (typeof value !== "string" || value.length === 0) return "";
    return ctx.resolveTexture(value);
  }

  /** JSON UI keys are unique inside a file - two nodes may share a name. */
  private uniqueName(name: string, ctx: SerializeCtx): string {
    const base = name.replace(/[^A-Za-z0-9_]+/g, "_").replace(/^_+|_+$/g, "") || "control";
    let unique = base;
    let n = 2;
    while (ctx.usedNames.has(unique)) unique = `${base}_${n++}`;
    ctx.usedNames.add(unique);
    return unique;
  }
}
