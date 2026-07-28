"use client";

import { supabase } from "@/lib/supabase";
import type { BookmarkArea } from "@/lib/panel/types";

/** Browser-side bookmark writes.
 *
 *  Flagging is a toggle keyed on (user, area, ref) — the table's unique index
 *  enforces that, so a double tap can never leave two rows behind. */

export type BookmarkInput = {
  area: BookmarkArea;
  refId: string;
  title: string;
  subtitle?: string;
  payload?: Record<string, unknown>;
};

export async function isBookmarked(
  userId: string,
  area: BookmarkArea,
  refId: string,
): Promise<boolean> {
  const { data, error } = await supabase
    .from("user_bookmarks")
    .select("id")
    .eq("user_id", userId)
    .eq("area", area)
    .eq("ref_id", refId)
    .maybeSingle();
  if (error) {
    // a failed read must not masquerade as "not bookmarked" in the console —
    // that is exactly the case that used to end in a mysterious flicker
    console.error("isBookmarked:", error.message);
    return false;
  }
  return Boolean(data);
}

/** Write the flag to a known state.
 *
 *  Both branches are idempotent — a delete that matches nothing succeeds, and
 *  the insert upserts on the (user, area, ref) unique key. The earlier version
 *  read the current state first and then inserted, so a read that came back
 *  wrong (RLS, a cold PostgREST schema cache) turned into a duplicate-key
 *  error, the button reverted, and the flag appeared to switch itself off. */
export async function setBookmark(
  userId: string,
  input: BookmarkInput,
  next: boolean,
): Promise<void> {
  if (!next) {
    const { error } = await supabase
      .from("user_bookmarks")
      .delete()
      .eq("user_id", userId)
      .eq("area", input.area)
      .eq("ref_id", input.refId);
    if (error) throw new Error(error.message);
    return;
  }

  const { error } = await supabase.from("user_bookmarks").upsert(
    {
      user_id: userId,
      area: input.area,
      ref_id: input.refId,
      title: input.title,
      subtitle: input.subtitle ?? null,
      payload: input.payload ?? {},
    },
    { onConflict: "user_id,area,ref_id" },
  );
  if (error) throw new Error(error.message);
}

export async function removeBookmark(id: string): Promise<void> {
  const { error } = await supabase.from("user_bookmarks").delete().eq("id", id);
  if (error) throw new Error(error.message);
}

export async function setBookmarkNote(id: string, note: string): Promise<void> {
  const { error } = await supabase
    .from("user_bookmarks")
    .update({ note: note.trim() || null })
    .eq("id", id);
  if (error) throw new Error(error.message);
}
