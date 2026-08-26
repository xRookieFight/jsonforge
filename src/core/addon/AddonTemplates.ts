/**
 * Reusable JSON UI templates of the generated resource pack.
 *
 * `custom_button` is what turns a button drawn in the editor into a real form
 * button: it reads `#form_button_text` and `#form_button_texture` from the
 * `form_buttons` collection that the script's ActionFormData feeds.
 */
import { FORM_BUTTON_COLLECTION } from "./FormButtons";

export type JsonUiNode = Record<string, unknown>;

export interface ScreenRoute {
  /** Screen name - what the script sends in `form.title(...)`. */
  flag: string;
  /** Namespace of the screen file. */
  namespace: string;
}

/**
 * Content drawn INSIDE the button: the icon and the text.
 *
 * It lives apart because `common_buttons.light_content_button` takes its own
 * content through `$button_content` - a control inheriting from it cannot
 * declare `controls` without breaking the vanilla button. And the content has
 * to sit here: this button carries the `collection_index`, so it is inside it
 * that `#form_button_text` resolves to the right collection item.
 */
export function buttonFaceTemplate(): JsonUiNode {
  return {
    type: "panel",
    size: ["100%", "100%"],
    controls: [
      {
        icon: {
          type: "image",
          anchor_from: "top_left",
          anchor_to: "top_left",
          layer: 2,
          size: "$icon_size",
          offset: "$icon_offset",
          bindings: [
            {
              binding_name: "#form_button_texture",
              binding_name_override: "#texture",
              binding_type: "collection",
              binding_collection_name: FORM_BUTTON_COLLECTION
            },
            {
              binding_name: "#form_button_texture_file_system",
              binding_name_override: "#texture_file_system",
              binding_type: "collection",
              binding_collection_name: FORM_BUTTON_COLLECTION
            },
            {
              binding_type: "view",
              source_property_name: "(not ((#texture = '') or (#texture = 'loading')))",
              target_property_name: "#visible"
            }
          ]
        }
      },
      {
        caption: {
          type: "label",
          anchor_from: "center",
          anchor_to: "center",
          layer: 3,
          size: ["100%", "default"],
          text: "#form_button_text",
          font_type: "$font_type",
          font_scale_factor: "$font_size",
          text_alignment: "$text_alignment",
          shadow: "$shadow",
          offset: "$text_offset",
          bindings: [
            {
              binding_name: "#form_button_text",
              binding_type: "collection",
              binding_collection_name: FORM_BUTTON_COLLECTION
            }
          ]
        }
      }
    ]
  };
}

/**
 * The form button itself.
 *
 * It inherits from `common_buttons.light_content_button` because `button` is
 * the only type that accepts `collection_index`. Without the index
 * `#form_button_text` does not resolve, the visibility binding reads it as an
 * empty string and the whole button disappears.
 */
export function customButtonTemplate(namespace: string): JsonUiNode {
  return {
    "$default_button_background_texture|default": "textures/ui/glass_pane",
    "$hover_button_background_texture|default": "textures/ui/glass_pane_hover",
    "$pressed_button_background_texture|default": "textures/ui/button_black_hover",

    "$button_size|default": ["100%", "100%"],
    "$button_offset|default": [0, 0],

    "$icon_size|default": ["100%", "100%"],
    "$icon_offset|default": [0, 0],

    "$text_offset|default": [0, 0],
    "$font_size|default": 1,
    "$font_type|default": "default",
    "$shadow|default": false,
    "$text_alignment|default": "center",

    $default_button_texture: "$default_button_background_texture",
    $hover_button_texture: "$hover_button_background_texture",
    $pressed_button_texture: "$pressed_button_background_texture",
    $default_state_border_visible: false,
    $hover_state_border_visible: false,
    $pressed_state_border_visible: false,
    $pressed_button_name: "button.form_button_click",

    // The vanilla text is off: `button_face` draws it with the font and the
    // alignment chosen in the editor.
    $button_text: "#null",
    $button_text_binding_type: "collection",
    $button_text_grid_collection_name: FORM_BUTTON_COLLECTION,
    $button_content: `${namespace}.button_face`,

    size: "$button_size",
    offset: "$button_offset",
    anchor_from: "top_left",
    anchor_to: "top_left",

    bindings: [
      {
        binding_type: "collection_details",
        binding_collection_name: FORM_BUTTON_COLLECTION
      },
      {
        binding_name: "#form_button_text",
        binding_type: "collection",
        binding_collection_name: FORM_BUTTON_COLLECTION
      },
      {
        binding_type: "view",
        source_property_name: "(not (#form_button_text = ''))",
        target_property_name: "#visible"
      }
    ]
  };
}

/** Default content of a scrolling panel. */
export function scrollingContentTemplate(): JsonUiNode {
  return {
    type: "panel",
    size: ["100%", "100%c"],
    anchor_from: "top_left",
    anchor_to: "top_left",
    controls: [] as unknown[]
  };
}

export interface SidebarBox {
  size: [number, number];
  offset: [number, number];
  anchorFrom: string;
  anchorTo: string;
}

export interface SidebarOptions {
  /** Namespace of the generated screen file that draws the frame. */
  namespace: string;
  /** Where the whole scoreboard sits, taken from the drawn board. */
  board: SidebarBox;
  /** Box of the objective title inside the board, in board units. */
  title: SidebarBox;
  /** Box that holds the name/score rows, in board units. */
  entries: SidebarBox;
  /** Title colour as [r, g, b], falling back to the vanilla variable. */
  titleColor?: [number, number, number];
  entryColor?: [number, number, number];
  /** Draw the objective name the game supplies (`#objective_sidebar_name`). */
  showTitle?: boolean;
  /** Draw the player name / score rows the game supplies. */
  showRows?: boolean;
  fontType?: string;
  fontScale?: number;
}

/**
 * Builds `ui/scoreboards.json` - the vanilla sidebar scoreboard, restyled.
 *
 * The engine fills this screen: `#objective_sidebar_name` is the objective
 * title, and the two stack panels are factories over the `scoreboard_players`
 * and `scoreboard_scores` collections. Redefining `scoreboard_sidebar` keeps
 * those bindings and only changes what they look like and where they sit, so
 * the real scores keep showing up.
 */
export function scoreboardsTemplate(options: SidebarOptions): string {
  const { board, title, entries } = options;

  const titleLabel = {
    type: "label",
    text: "#objective_sidebar_name",
    size: title.size,
    offset: title.offset,
    anchor_from: title.anchorFrom,
    anchor_to: title.anchorTo,
    text_alignment: "center",
    locked_alpha: 1.0,
    layer: 5,
    localize: false,
    ...(options.titleColor ? { color: options.titleColor } : {}),
    ...(options.fontType ? { font_type: options.fontType } : {}),
    ...(options.fontScale ? { font_scale_factor: options.fontScale } : {}),
    bindings: [{ binding_name: "#objective_sidebar_name", binding_type: "global" }]
  };

  const rowSize: [number, number] = [entries.size[0], entries.size[1]];
  const listBindings = [
    {
      binding_name: "#scoreboard_sidebar_size",
      binding_type: "global",
      binding_name_override: "#collection_length"
    }
  ];

  const entryLists = {
    type: "panel",
    size: rowSize,
    offset: entries.offset,
    anchor_from: entries.anchorFrom,
    anchor_to: entries.anchorTo,
    layer: 5,
    controls: [
      {
        players: {
          type: "stack_panel",
          orientation: "vertical",
          size: ["50%", "100%"],
          anchor_from: "top_left",
          anchor_to: "top_left",
          collection_name: "scoreboard_players",
          factory: { name: "player_list_factory", control_name: "scoreboard.scoreboard_sidebar_player" },
          bindings: listBindings
        }
      },
      {
        scores: {
          type: "stack_panel",
          orientation: "vertical",
          size: ["50%", "100%"],
          anchor_from: "top_right",
          anchor_to: "top_right",
          use_child_anchors: true,
          collection_name: "scoreboard_scores",
          factory: { name: "player_score_factory", control_name: "scoreboard.scoreboard_sidebar_score" },
          bindings: listBindings
        }
      }
    ]
  };

  const entryLabel = (bindingName: string, collection: string, anchor: string) => ({
    type: "label",
    layer: 5,
    text: `#${bindingName}`,
    size: ["100%", 10],
    anchor_from: anchor,
    anchor_to: anchor,
    text_alignment: anchor === "top_right" ? "right" : "left",
    locked_alpha: 1.0,
    localize: false,
    ...(options.entryColor ? { color: options.entryColor } : {}),
    ...(options.fontType ? { font_type: options.fontType } : {}),
    ...(options.fontScale ? { font_scale_factor: options.fontScale } : {}),
    bindings: [
      {
        binding_name: `#${bindingName}`,
        binding_type: "collection",
        binding_collection_name: collection
      }
    ]
  });

  const doc = {
    namespace: "scoreboard",
    scoreboard_sidebar: {
      type: "panel",
      size: board.size,
      offset: board.offset,
      anchor_from: board.anchorFrom,
      anchor_to: board.anchorTo,
      controls: [
        {
          // The drawn artwork, stretched over the whole sidebar.
          [`frame@${options.namespace}.${options.namespace}`]: {
            size: ["100%", "100%"],
            offset: [0, 0],
            anchor_from: "top_left",
            anchor_to: "top_left",
            layer: 0
          }
        },
        // The title and the rows are what the engine fills in; a board that
        // draws its own text does not want them on top of the artwork.
        ...(options.showTitle === false ? [] : [{ objective_title: titleLabel }]),
        ...(options.showRows === false ? [] : [{ entry_lists: entryLists }])
      ]
    },
    scoreboard_sidebar_player: entryLabel("player_name_sidebar", "scoreboard_players", "top_left"),
    scoreboard_sidebar_score: entryLabel("player_score_sidebar", "scoreboard_scores", "top_right")
  };

  return JSON.stringify(doc, null, 4) + "\n";
}

/**
 * Builds `ui/hud_screen.json`.
 *
 * The file uses `modifications` instead of redefining the screen: the vanilla
 * HUD keeps everything it had and the custom panel is appended to its control
 * list. A full redefinition would wipe the hotbar, the chat and the rest.
 */
export function hudScreenTemplate(routes: ScreenRoute[]): string {
  const controls = routes.map(route => ({
    array_name: "controls",
    operation: "insert_back",
    value: {
      [`${route.namespace}_hud@${route.namespace}.${route.namespace}`]: {
        // The HUD stacks by layer; a high one keeps the overlay above the
        // hotbar and the vanilla widgets instead of behind them.
        layer: 100
      }
    }
  }));

  // Only `modifications`: repeating `"type": "screen"` here redefines the
  // vanilla screen on some versions and the HUD comes back empty.
  const doc = {
    namespace: "hud",
    hud_screen: {
      modifications: controls
    }
  };

  return JSON.stringify(doc, null, 4) + "\n";
}

/**
 * Builds `ui/server_form.json`.
 *
 * The file carries the name of a vanilla screen, so it REPLACES the original
 * entirely. It does one thing: routing. For each screen it shows that screen's
 * panel when the form title contains the screen name - the string subtraction
 * trick of JSON UI.
 *
 * There is no fallback body: while this pack is active, a form whose title
 * matches no screen opens empty.
 */
export function serverFormTemplate(routes: ScreenRoute[]): string {
  const controls = routes.map(route => ({
    [`${route.namespace}@${route.namespace}.${route.namespace}`]: {
      layer: 10,
      bindings: [
        { binding_name: "#title_text" },
        {
          binding_type: "view",
          source_property_name: `(not ((#title_text - '${route.flag}') = #title_text))`,
          target_property_name: "#visible"
        }
      ]
    }
  }));

  const doc = {
    namespace: "server_form",
    long_form: {
      type: "panel",
      size: ["100%", "100%"],
      controls
    }
  };

  return JSON.stringify(doc, null, 4) + "\n";
}
