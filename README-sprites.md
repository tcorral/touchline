# Soccer simulator — dynamic player sprites

## What changed
- Replaced the colored-circle player markers with top-down animated player sprites.
- Added transparent sprite assets and separate shirt/shorts recoloring masks.
- Player facing direction is selected from movement direction; animation frames cycle while moving.
- Shirt and shorts colors come from each tactic's existing `colors` tuple.

## Team color configuration
In `src/engine.ts`, `Tactic.colors` is currently a tuple:
`[shirtColor, shortsColor, numberColor]`.

Example:
```ts
const colors: Record<TacticId, [string, string, string]> = {
  Demo01: ['#1565C0', '#FFFFFF', '#FFFFFF'],
  Demo02: ['#D62828', '#202020', '#FFFFFF'],
  Pepe:   ['#FFC800', '#202020', '#000000'],
  Juan:   ['#FFFFFF', '#1E40AF', '#000000'],
  Ana:    ['#16A34A', '#FFFFFF', '#FFFFFF']
};
```
Change the values to any CSS color supported by Canvas (hex, rgb(), etc.). Press Restart in the simulator after changing team/tactic settings.

## Run
From this folder:
```sh
npm install
npm run build
npm start
```
Then open http://127.0.0.1:8080.

## Assets
- `assets/players-base.png`: 8 directions × 5 animation poses; 64×64 cells.
- `assets/players-shirt-mask.png`: shirt recoloring mask.
- `assets/players-shorts-mask.png`: shorts recoloring mask.


## Field sizing fix
The field background is scaled to the canvas dimensions (`canvas.width` × `canvas.height`) so the entire pitch fits instead of being cropped at its source image resolution.


## Formation and pitch alignment fix
- Formations now use their intended field-centered coordinates instead of compressing every formation into one half of the pitch.
- Player starting positions are mirrored for the opposing team, preserving each tactic's own attacking direction.
- Rendering maps simulation bounds (`x: -160..160`, `y: -120..120`) to the actual painted pitch boundaries in the 600×400 canvas. Player sprites, ball, and mouse coordinate readout use the same transform.
- This places the goalkeeper close to the goal line and spreads out defenders, midfielders, and forwards according to each tactic's coordinates.


## Goal celebration

A 1.5-second Classic Burst “GOAL!” overlay is triggered when the score increases while simulation speed is set to 1× or 5×. The scoreboard is drawn first and remains visible above the centered celebration. Other speeds do not trigger new celebrations.
