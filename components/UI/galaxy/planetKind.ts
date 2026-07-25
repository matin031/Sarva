/** Shape of a planet's appearance. Kept in its own tiny module so the DOM-side
 *  components can type their props without pulling three.js into their bundle. */
export type PlanetKind = {
  color: string;
  ring?: boolean;
  moon?: boolean;
  distort?: number;
};
