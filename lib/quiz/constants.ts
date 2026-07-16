// Kept out of admin-actions.ts ("use server") since Next.js requires every
// top-level export of a server-action module to be an async function —
// a plain constant export there breaks the whole module's client bundle.
export const QUIZ_PAGE_SIZE = 20;
