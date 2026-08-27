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
  CloseButtonColours,
  closeButtonTemplate,
  customButtonTemplate,
  formButtonCellTemplate,
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
  /**
   * Screen name the script puts in the form title to route to this screen. A
   * label wired to the title strips it, so the player reads the title alone.
   */
  titleFlag?: string;
  /** Draws the vanilla close button in the corner of the body. */
  closeButton?: boolean;
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

/** Side of the close button, as a share of the shorter side of the body. */
const CLOSE_BUTTON_SHARE = 0.125;

/**
 * Gap kept between the close button and the edges of the body, in drawn units.
 * Wider on x: the body is drawn with a frame down its side, and a button flush
 * against it reads as hanging off the panel.
 */
const CLOSE_BUTTON_INSET: [number, number] = [3, 1];

/** Reds the close button is tinted with, matching the preset red artwork. */
const CLOSE_BUTTON_COLOURS: CloseButtonColours = {
  default: [0.79, 0.21, 0.21],
  hover: [0.91, 0.33, 0.33],
  pressed: [0.61, 0.14, 0.14]
};

/**
 * How many rows or columns a set of centres falls into.
 *
 * Buttons are dragged into place by hand, so two meant for the same column
 * rarely share an exact centre. Anything closer together than half a button is
 * read as one lane - the alternative is a four column grid for what the drawing
 * plainly shows as two.
 */
function countLanes(centres: number[], span: number): number {
  const sorted = [...centres].sort((a, b) => a - b);
  const tolerance = span / 2;
  let lanes = 1;
  for (let i = 1; i < sorted.length; i++) {
    if (sorted[i] - sorted[i - 1] > tolerance) lanes++;
  }
  return lanes;
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
    if (this.options.closeButton) this.injectCloseButton(controls, root, ctx);

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
    // Drawn form buttons that share a parent are one grid over the collection,
    // not one control each: that is what lets the script decide how many there
    // are instead of the drawing.
    const buttons = nodes.filter(node => node.typeId === "button");
    const grid = buttons.length > 1 ? this.buildButtonGrid(buttons, ctx) : null;
    let gridPlaced = false;

    const out: Array<Record<string, JsonUiNode>> = [];
    for (const node of nodes) {
      if (grid && node.typeId === "button") {
        if (gridPlaced) continue;
        gridPlaced = true;
        out.push(grid);
        continue;
      }
      const entry = this.buildNode(node, ctx);
      if (entry) out.push(entry);
    }
    return out;
  }

  /**
   * The drawn buttons into a single grid over `form_buttons`.
   *
   * The drawing is read as a table: the distinct centres give the number of
   * columns and rows, their bounding box gives the area the grid covers, and
   * the share of a cell one button filled gives the gaps back. The grid then
   * builds a cell per item the script sent, so three buttons fill the first
   * three places and the fourth simply is not there.
   */
  private buildButtonGrid(buttons: ElementNode[], ctx: SerializeCtx): Record<string, JsonUiNode> {
    const boxes = buttons.map(node => {
      const [w, h] = (node.properties["size"] as [number, number]) ?? [120, 40];
      const [x, y] = (node.properties["offset"] as [number, number]) ?? [0, 0];
      return { w, h, x, y };
    });

    const cols = countLanes(boxes.map(b => b.x), Math.min(...boxes.map(b => b.w)));
    const rows = countLanes(boxes.map(b => b.y), Math.min(...boxes.map(b => b.h)));

    const left = Math.min(...boxes.map(b => b.x - b.w / 2));
    const right = Math.max(...boxes.map(b => b.x + b.w / 2));
    const top = Math.min(...boxes.map(b => b.y - b.h / 2));
    const bottom = Math.max(...boxes.map(b => b.y + b.h / 2));

    const gridW = right - left;
    const gridH = bottom - top;
    const cellW = gridW / cols;
    const cellH = gridH / rows;

    // The first drawn button is the template: a grid draws every cell the same.
    const model = buttons[0];
    const slot: [string, string] = [this.percent(boxes[0].w, cellW), this.percent(boxes[0].h, cellH)];

    const name = this.uniqueName(model.name, ctx);
    const cellName = `${name}_cell`;
    const cell: [string, string] = [this.percent(cellW, gridW), this.percent(cellH, gridH)];
    ctx.hoisted[cellName] = formButtonCellTemplate(ctx.namespace, cellName, cell, slot, this.formButtonBody(model, ctx));

    return {
      [name]: {
        type: "grid",
        size: [this.percent(gridW, ctx.parentSize[0]), this.percent(gridH, ctx.parentSize[1])],
        offset: [
          this.percent((left + right) / 2, ctx.parentSize[0]),
          this.percent((top + bottom) / 2, ctx.parentSize[1])
        ],
        anchor_from: model.properties["anchor_from"] ?? "center",
        anchor_to: model.properties["anchor_to"] ?? "center",
        collection_name: FORM_BUTTON_COLLECTION,
        grid_item_template: `${ctx.namespace}.${cellName}`,
        grid_dimensions: [cols, rows]
      }
    };
  }

  private buildNode(node: ElementNode, ctx: SerializeCtx): Record<string, JsonUiNode> | null {
    const type = ElementRegistry.get().get(node.typeId);
    if (!type) return null;

    if (node.typeId === "button") return this.buildFormButton(node, ctx);
    if (node.typeId === "label") {
      const live = this.buildLiveLabel(node, ctx);
      if (live) return live;
      return this.buildLabel(node, ctx);
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
   * A label in a box of its own.
   *
   * JSON UI draws label text from the top of the control, while the canvas
   * centres it in the drawn box, so a label as tall as its box comes out
   * sitting high in game. The box ships as a panel and the text goes inside it
   * at its natural height, centred - which is what the editor shows.
   */
  private buildLabel(node: ElementNode, ctx: SerializeCtx): Record<string, JsonUiNode> {
    const text = this.baseNode(node, ctx);
    text["type"] = "label";
    if (node.properties["sb_source"] === "form_title") this.wireFormTitle(text);

    const name = this.uniqueName(node.name, ctx);
    const box: JsonUiNode = {
      type: "panel",
      size: text["size"],
      offset: text["offset"],
      anchor_from: node.properties["anchor_from"] ?? "top_left",
      anchor_to: node.properties["anchor_to"] ?? "top_left",
      layer: node.properties["layer"] ?? 0,
      controls: [
        {
          [`${name}_text`]: {
            ...text,
            size: [(text["size"] as unknown[])[0], "default"],
            offset: [0, 0],
            anchor_from: "center",
            anchor_to: "center",
            layer: 0
          }
        }
      ]
    };

    return { [name]: box };
  }

  /**
   * A label showing what the script passed to `form.title(...)`.
   *
   * The title doubles as the routing key, so the screen name is subtracted
   * before the text is drawn - otherwise the player would read the flag too.
   * The result goes through a name of our own because `#title_text` is what
   * the subtraction reads, and a control cannot write to what it reads.
   */
  private wireFormTitle(label: JsonUiNode): void {
    const flag = this.options.titleFlag;
    label["text"] = "#jsonforge_title";
    label["localize"] = false;
    label["bindings"] = [
      { binding_name: "#title_text", binding_type: "global" },
      {
        binding_type: "view",
        source_property_name: flag ? `(#title_text - '${flag}')` : "#title_text",
        target_property_name: "#jsonforge_title"
      }
    ];
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
    const button = this.formButtonBody(node, ctx);
    // Positional index in the `form_buttons` collection: it has to match the
    // order of the `form.button(...)` calls in the script. A grid hands its
    // cells an index of their own, which is why this only belongs here.
    button["collection_index"] = ctx.buttonIndex.get(node.id) ?? 0;

    const wrapperName = this.uniqueName(node.name, ctx);
    return {
      [wrapperName]: {
        type: "collection_panel",
        collection_name: FORM_BUTTON_COLLECTION,
        size: this.sizeOf(node, ctx),
        offset: this.offsetOf(node, ctx),
        anchor_from: node.properties["anchor_from"] ?? "top_left",
        anchor_to: node.properties["anchor_to"] ?? "top_left",
        controls: [{ [`${wrapperName}_button@${ctx.namespace}.custom_button`]: button }]
      }
    };
  }

  /** Everything a form button carries apart from where it sits. */
  private formButtonBody(node: ElementNode, ctx: SerializeCtx): JsonUiNode {
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

      // The icon covers the button edge to edge - an inset would leave the
      // background texture showing as a border around the artwork.
      $icon_offset: [0, 0],
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

    return button;
  }

  /**
   * Puts the close button in the corner of the drawn body.
   *
   * The body is the single child of the root when there is one - the panel the
   * design lives in - so the button lands on its corner instead of the corner
   * of the display, which is a long way off for a panel that covers half the
   * screen.
   */
  private injectCloseButton(controls: Array<Record<string, JsonUiNode>>, root: ElementNode, ctx: SerializeCtx): void {
    const body = root.children.length === 1 ? root.children[0] : null;
    const host = body ? Object.values(controls[0])[0] : null;
    const target = Array.isArray(host?.["controls"]) ? (host["controls"] as Array<Record<string, JsonUiNode>>) : controls;

    // Square in drawn units, then converted - a plain "10%" on both axes comes
    // out as a rectangle because the box it sits in is not square.
    const box = (body?.properties["size"] as [number, number]) ?? ctx.parentSize;
    const side = Math.min(box[0], box[1]) * CLOSE_BUTTON_SHARE;
    const size: [string, string] = [this.percent(side, box[0]), this.percent(side, box[1])];

    // Anchored top right, where JSON UI mirrors the x axis: a positive offset
    // moves the button inward on both axes, away from the two edges it touches.
    const offset: [string, string] = [
      this.percent(CLOSE_BUTTON_INSET[0], box[0]),
      this.percent(CLOSE_BUTTON_INSET[1], box[1])
    ];
    target.push({ jsonforge_close: closeButtonTemplate(size, offset, CLOSE_BUTTON_COLOURS) });
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
