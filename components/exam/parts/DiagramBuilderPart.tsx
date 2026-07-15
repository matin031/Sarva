"use client";

import RichPassageView from "@/components/exam/RichPassageView";
import type { RichPassage } from "@/lib/exam/content-schemas";

type DiagramBuilderContent = {
  type: "diagram-builder";
  passage: RichPassage;
  mode: "dependency-select" | "canvas";
  nodes: { id: string; label: string }[];
};

type Props = {
  content: DiagramBuilderContent;
  /** childNodeId -> parentNodeId, one entry per node whose parent has been chosen */
  value: Record<string, string>;
  onChange: (childId: string, parentId: string) => void;
  disabled?: boolean;
};

/** Phase-1 "simple mode": instead of a full drag-and-drop SVG canvas (hard
 *  to get right on touch), each node gets a dropdown to pick which other
 *  node it depends on — same underlying edges data, much simpler input.
 *  'canvas' mode is defined in the schema for a future full diagram editor
 *  but isn't built yet; falls back to a clear message instead of crashing. */
export default function DiagramBuilderPart({ content, value, onChange, disabled }: Props) {
  if (content.mode === "canvas") {
    return (
      <div dir="rtl" className="rounded-xl border border-dashed border-border px-3 py-4 text-sm text-muted-foreground">
        حالت رسم آزاد نمودار هنوز پیاده‌سازی نشده است.
      </div>
    );
  }

  return (
    <div dir="rtl" className="flex flex-col gap-3 text-right">
      <div className="rounded-lg bg-muted/50 px-3 py-3">
        <RichPassageView passage={content.passage} />
      </div>
      <div className="flex flex-col gap-2.5">
        {content.nodes.map((node) => {
          const otherNodes = content.nodes.filter((n) => n.id !== node.id);
          return (
            <div key={node.id} className="flex flex-wrap items-center gap-2 rounded-xl border border-border bg-card px-3 py-2.5">
              <span className="min-h-11 rounded-lg bg-primary/15 px-3 py-2 text-base font-medium text-primary">
                {node.label}
              </span>
              <span className="text-sm text-muted-foreground">وابسته به</span>
              <select
                dir="rtl"
                disabled={disabled}
                value={value[node.id] ?? ""}
                onChange={(e) => onChange(node.id, e.target.value)}
                className="min-h-11 flex-1 rounded-lg border border-border bg-muted px-2 text-sm text-foreground
                  outline-none focus:border-primary disabled:opacity-60"
              >
                <option value="" disabled>
                  انتخاب کنید
                </option>
                {otherNodes.map((n) => (
                  <option key={n.id} value={n.id}>
                    {n.label}
                  </option>
                ))}
              </select>
            </div>
          );
        })}
      </div>
    </div>
  );
}
