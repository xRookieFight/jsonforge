# Getting started

New to JSON UI? This walks through one full round trip: draw a screen, export
it, see it in Minecraft.

## 1. What JSON UI is

Minecraft Bedrock draws its interface from `.json` files inside a **resource
pack**. A resource pack can replace those files, which is how custom menus,
HUDs and scoreboards are made. JsonForge is a visual editor for them: you draw,
it writes the JSON.

Two things are worth knowing before you start:

- **Sizes are in UI units, not screen pixels.** A new project is a 384x216
  screen, which is roughly what the game gives you at default GUI scale. The
  canvas draws each unit 3x larger so it is comfortable to work with
  (Settings > Canvas Scale).
- **A resource pack can only restyle what the game already draws.** It cannot
  invent new values. Live text has to come from somewhere the game feeds:
  a form the script opens, or the scoreboard.

## 2. Draw a screen

1. Pick a template on the welcome screen - **Blank**, **Dialog Form**,
   **Form Buttons List**, **Scoreboard Sidebar** or **HUD Overlay**.
2. Add elements from the **Toolbox** (they land inside the selected element).
3. Move and resize on the canvas, or type exact numbers in **Properties >
   Transform**. Arrow keys nudge by one unit, `Shift`+arrow by a grid step.
4. Drop a texture from the **Textures** panel onto a panel, image or button -
   or click the swatch in a texture property to open the picker. The bundled
   ore-UI preset styles are all there, and you can upload your own PNG
   (plus its nine-slice `.json`, if it has one).
5. **Properties > Layout > Layer** decides what is drawn on top.
6. Need everything smaller? Select the container and use **Scale with
   children** at the top of the Properties panel.

## 3. Export

**File > Export Addon** gives you three targets:

| Screen Type | What it makes | Where it works |
| --- | --- | --- |
| **Form** | `server_form.json` + a behavior pack script that opens it with an item | Your own world (servers do not run your behavior pack) |
| **HUD overlay** | `hud_screen.json`, resource pack only | Anywhere, including servers via Global Resources |
| **Scoreboard** | `scoreboards.json`, replaces the vanilla sidebar | Anywhere, keeps live names and scores |

Leave **Layout** on `Fit to screen`: sizes are written as percentages, so the
result covers the same share of the screen as in the editor.

You get a `.mcaddon` when a behavior pack is involved and a `.mcpack` when the
export is resource pack only. Double-click the file, then enable the pack in
the world (or under Settings > Global Resources for servers) and move it to the
top of the list.

## 4. Make text live

Static labels are drawn exactly as designed. To show real values, wire a label
to the game in **Properties > Scoreboard**:

| Live Value | Comes from |
| --- | --- |
| `objective_title` | The display name of the objective on the sidebar |
| `player_name` | Row *N* of the sidebar, name column |
| `player_score` | Row *N* of the sidebar, score column |

`Row Index` picks which row, so each value can sit anywhere in your design
instead of being stacked in a list.

Feed them with plain commands:

```
/scoreboard objectives add match dummy "00:20"
/scoreboard objectives setdisplay sidebar match
/scoreboard players set "GS" match 0
/scoreboard players set "BJK" match 0
```

Rows are ordered by score, not by the order you set them.

Form buttons work the same way: give a button an action in **Properties >
Action** (message, command, another screen, or a scoreboard operation), and
put `{score:objective}` in its text to print a live score.

## 5. When nothing shows up

1. Is the pack enabled in the world, and at the top of the list? Minecraft
   applies the highest pack that owns a file.
2. Turn on **Settings > Creator > Content Log** and rejoin. It names the file
   and the property it choked on.
3. Restart the game after re-exporting - UI files are cached hard.
4. For a Form export, both packs have to be on and **Beta APIs** enabled,
   otherwise the script never runs and you get the vanilla form.

## Saving your work

Use **`.jfproject`** (File > Save). It is one file holding the element tree,
the bindings and every texture, so it opens anywhere with nothing missing.
