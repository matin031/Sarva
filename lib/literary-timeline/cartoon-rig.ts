/** Rigging for the full-length cartoons in `public/literary-timeline/cartoons`.
 *
 *  The images are flat bitmaps, so anything that moves is cut out of them:
 *  `hand` is a box (percent of the image: x0, y0, x1, y1) around the raised
 *  hand that is lifted onto its own layer and rotated around the wrist
 *  (px, py). The box must hold only the hand and wrist; the forearm leaves it
 *  through the bottom edge, where the pivot sits. `eyes` is the midpoint
 *  between the pupils and the distance between them, for props like glasses.
 *
 *  Coordinates were read off the 560×840 files; after replacing an image,
 *  check them with `node scripts/timeline/rig-preview.mjs`. */
export type Move = "wave" | "glasses" | "hop" | "spin" | "squash" | "lean";
/** `tight`: the hand touches hair, so the layer script must not search past the box's sides. */
export type Rig = { hand?: [number, number, number, number, number, number]; eyes?: [number, number, number]; moves: Move[]; tight?: true };

export const RIGS: Record<string, Rig> = {
  "person-2": { hand: [11, 26, 31, 46, 27, 46], eyes: [52, 18.9, 15], moves: ["wave", "glasses"] },
  "person-3": { hand: [70, 39, 92, 55, 76, 55], moves: ["wave", "squash"] },
  "person-9": { hand: [3, 29, 18, 48, 15, 48], moves: ["wave", "lean"], tight: true },
  "person-17": { hand: [8, 27, 29, 46, 22, 46], moves: ["wave", "hop"] },
  "person-19": { hand: [72, 28, 95, 48, 79, 48], moves: ["wave", "spin"] },
  "person-20": { hand: [72, 33, 94, 51, 75, 51], moves: ["wave", "squash"] },
  "person-23": { hand: [74, 38, 96, 53, 79, 53], moves: ["wave", "spin"] },
  "person-29": { hand: [67, 33, 91, 52, 72, 52], moves: ["wave", "squash"] },
  "person-37": { hand: [7, 29, 26.5, 49, 18, 49], moves: ["wave", "hop"], tight: true },
  "person-41": { hand: [9, 31, 31, 50, 18, 50], moves: ["wave", "lean"] },
  "person-49": { hand: [8, 31, 33, 51, 18, 51], moves: ["wave", "squash"] },
  "person-50": { hand: [2, 27, 25, 47, 15, 47], moves: ["wave", "hop"] },
  "person-51": { hand: [7, 32, 30, 50, 18, 50], moves: ["wave", "lean"] },
  "person-52": { hand: [9, 27, 27, 47, 18, 47], moves: ["wave", "spin"] },
  "person-53": { hand: [9, 28, 31, 48, 20, 48], moves: ["wave", "hop"] },
  "person-54": { hand: [10, 28, 32, 47, 20, 47], moves: ["wave", "lean"] },
  "person-69": { hand: [10, 34, 32, 52, 20, 52], moves: ["wave", "squash"] },
  "person-71": { hand: [11, 32, 32, 50, 21, 50], moves: ["wave", "hop"] },
  "person-73": { hand: [4, 21, 27, 40, 15, 40], moves: ["wave", "spin"] },
  "person-76": { hand: [9, 25, 29, 43, 18, 43], moves: ["wave", "lean"] },
  "person-79": { hand: [9, 28, 31, 46, 20, 46], eyes: [47, 27.5, 13], moves: ["wave", "glasses"] },
  "person-89": { hand: [6, 27, 30, 47, 18, 47], moves: ["wave", "squash"] },
  "person-102": { hand: [7, 28, 31, 47, 18, 47], eyes: [57.5, 20.5, 15.5], moves: ["wave", "glasses"] },
  "person-103": { hand: [6, 26, 26, 46, 17, 46], moves: ["wave", "hop"] },
  "person-105": { moves: ["spin", "hop"] },
  "person-128": { hand: [20, 29, 37, 43, 30, 43], moves: ["wave", "spin"] },
  "person-138": { hand: [6, 28, 30, 47, 20, 47], eyes: [49, 18.6, 15.5], moves: ["wave", "glasses"] },
  "person-139": { hand: [7, 28, 29, 47, 18, 47], moves: ["wave", "lean"] },
  "person-143": { hand: [12, 29, 32, 46, 21, 46], eyes: [52, 19.4, 14.5], moves: ["wave", "glasses"] },
};
