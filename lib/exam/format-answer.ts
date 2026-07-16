import type { SeedPart } from "./seed-data/seed-types";

/**
 * Server-only: turns a part's answer key into a short, human-readable
 * Persian string for the "پاسخ صحیح" reveal shown right after a question
 * is submitted. This is a plain-text summary (like a printed answer key),
 * not a full re-render of the interactive input — good enough for
 * self-study feedback across all 18 types without building 18 more
 * display components.
 */

function joinFa(items: string[]): string {
  return items.filter(Boolean).join("، ");
}

export function formatCorrectAnswer(part: SeedPart): string {
  const content = part.content;
  const correct = part.correctAnswer as Record<string, unknown>;
  const options = part.options ?? [];

  switch (content.type) {
    case "mcq-inline": {
      const opt = options.find((o) => o.isCorrect);
      return opt?.text ?? "-";
    }

    case "aroozi-samaei": {
      const index = options.findIndex((o) => o.isCorrect);
      // an audio-option's `text` is a URL, not useful to print as-is —
      // point at it by position instead ("گزینهٔ ۲") the same way a
      // verse-option's own text would be printed for a verse stem.
      const opt = options[index];
      if (content.stemKind === "audio") return opt?.text ?? "-";
      return index >= 0 ? `گزینهٔ ${index + 1}` : "-";
    }

    case "mcq-multi-select": {
      return joinFa(options.filter((o) => o.isCorrect).map((o) => o.text));
    }

    case "mcq-plus-correction": {
      const opt = options.find((o) => o.isCorrect);
      const corrections = (correct.correctionAnswers as string[]) ?? [];
      return `${opt?.text ?? "-"} — شکل درست: ${corrections[0] ?? "-"}`;
    }

    case "true-false": {
      const [trueLabel, falseLabel] = content.labels ?? ["درست", "نادرست"];
      return correct.value ? trueLabel : falseLabel;
    }

    case "count-answer":
      return String(correct.value);

    case "word-reorder-dnd":
      return (correct.orderedTokens as string[]).join(" ");

    case "matching-pairs-with-distractor": {
      const pairs = Object.entries(correct as Record<string, string>).map(([a, b]) => {
        const bItem = content.columnB.find((x) => x.id === b);
        return `${a})${bItem?.text ?? b}`;
      });
      return joinFa(pairs);
    }

    case "multi-part-inline-tagging": {
      return joinFa(Object.values(correct.tags as Record<string, string>));
    }

    case "diagram-builder": {
      const nodeLabel = (id: string) => content.nodes.find((n) => n.id === id)?.label ?? id;
      const edges = correct.edges as { childId: string; parentId: string }[];
      return joinFa(edges.map((e) => `${nodeLabel(e.childId)} ← ${nodeLabel(e.parentId)}`));
    }

    case "fill-blank-term":
    case "verse-completion":
    case "short-text-answer":
      return joinFa((correct.accepted as string[]) ?? []);

    case "word-meaning-input": {
      return joinFa((Object.values(correct) as string[][]).flat());
    }

    case "two-answer-text": {
      return joinFa(content.fields.map((f) => joinFa((correct[f.id] as string[]) ?? [])));
    }

    case "open-error-correction-in-passage":
      return `${correct.wrongWord} ← ${correct.correctWord}`;

    case "find-n-errors-in-list": {
      const ids = correct.errorItemIds as string[];
      const corrections = correct.corrections as Record<string, string>;
      return joinFa(
        ids.map((id) => {
          const item = content.items.find((i) => i.id === id);
          return `${item?.text ?? id} ← ${corrections[id]}`;
        }),
      );
    }

    case "paired-list-error-correction": {
      const expected = correct as Record<string, { isCorrect: boolean; correctedText?: string }>;
      return joinFa(
        Object.values(expected).map((j) => (j.isCorrect ? "درست است" : (j.correctedText ?? "نادرست است"))),
      );
    }

    case "mcq-select-line-in-poem":
      return content.lines[correct.correctLineIndex as number] ?? "-";

    default:
      return "-";
  }
}
