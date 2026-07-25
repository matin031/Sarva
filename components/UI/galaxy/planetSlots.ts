import type { PlanetKind } from "./planetKind";

/** Registry of the DOM boxes where planets should appear.
 *
 *  Each PlanetStop drops an empty placeholder div into the layout and registers
 *  it here; the single galaxy scene reads the registry, measures every box ONCE,
 *  and from then on positions its planets from cached numbers plus the cached
 *  scroll offset. Nothing in the render loop touches the DOM. */

export type Slot = { id: number; el: HTMLElement; kind: PlanetKind };

let seq = 0;
let version = 0;
const slots = new Map<number, Slot>();
const listeners = new Set<() => void>();

function emit() {
  version += 1;
  for (const l of listeners) l();
}

export const planetSlots = {
  add(el: HTMLElement, kind: PlanetKind) {
    const id = ++seq;
    slots.set(id, { id, el, kind });
    emit();
    return id;
  },
  remove(id: number) {
    if (slots.delete(id)) emit();
  },
  list(): Slot[] {
    return [...slots.values()];
  },
  /** snapshot for useSyncExternalStore — a number, so it stays referentially stable */
  getVersion: () => version,
  subscribe(listener: () => void) {
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
    };
  },
};
