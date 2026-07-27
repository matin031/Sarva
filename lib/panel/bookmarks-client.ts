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
  if (error) return false;
  return Boolean(data);
}

/** Returns the state after the toggle. */
export async function toggleBookmark(
  userId: string,
  input: BookmarkInput,
): Promise<boolean> {
  const on = await isBookmarked(userId, input.area, input.refId);
  if (on) {
    const { error } = await supabase
      .from("user_bookmarks")
      .delete()
      .eq("user_id", userId)
      .eq("area", input.area)
      .eq("ref_id", input.refId);
    if (error) throw new Error(error.message);
    return false;
  }
  const { error } = await supabase.from("user_bookmarks").insert({
    user_id: userId,
    area: input.area,
    ref_id: input.refId,
    title: input.title,
    subtitle: input.subtitle ?? null,
    payload: input.payload ?? {},
  });
  if (error) throw new Error(error.message);
  return true;
}

export async function removeBookmark(id: string): Promise<void> {
  const { error } = await supabase.from("user_bookmarks").delete().eq("id", id);
  if (error) throw new Error(error.message);
}

export async function setBookmarkNote(
  id: string,
  note: string,
): Promise<void> {
  const { error } = await supabase
    .from("user_bookmarks")
    .update({ note: note.trim() || null })
    .eq("id", id);
  if (error) throw new Error(error.message);
}
