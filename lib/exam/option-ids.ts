/** Stable option id shared between client rendering and server grading —
 *  seed data doesn't carry a persisted option id (that only exists once
 *  rows are in question_options), so both sides derive the same id from
 *  (partIndex, optionIndex) instead of guessing independently. */
export function optionId(partIndex: number, optionIndex: number): string {
  return `${partIndex}-${optionIndex}`;
}
