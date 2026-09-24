import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { lessonDescription, lessonFacts, lessonJsonLd, lessonTitle } from "@/lib/seo/lesson";
import type { PoemLesson } from "@/lib/doroos/types";

const grade = { key: "yazdahom" as const, label: "یازدهم", book: "فارسی ۲" };

function poem(extra: Partial<PoemLesson["beyts"][number]> = {}): PoemLesson {
  return {
    kind: "poem",
    grade: "yazdahom",
    number: 1,
    title: "نیکی",
    poet: "سعدی",
    beyts: [
      {
        n: 1,
        hemistichs: ["الف", "ب"],
        meaning: "معنی",
        concept: "مفهوم",
        linguistic: [],
        literary: [],
        intellectual: "",
        ...extra,
      },
    ],
  };
}

describe("عنوانِ درس", () => {
  it("با «معنی درس» و عددِ ترتیبی شروع می‌شود و رقمِ لاتین ندارد", () => {
    const t = lessonTitle(grade, 1, lessonFacts(poem()));
    assert.ok(t.startsWith("معنی درس اول فارسی یازدهم"), t);
    assert.ok(!/[0-9]/.test(t), t);
  });
});

describe("توضیحِ درس", () => {
  it("«سؤال امتحانی» را فقط وقتی می‌گوید که درس واقعاً دارد", () => {
    const without = lessonDescription(grade, 1, lessonFacts(poem()));
    assert.ok(!without.includes("سؤال امتحانی"));
    const withExam = lessonDescription(grade, 1, lessonFacts(poem({ exam: { q: "?", a: "!" } })));
    assert.ok(withExam.includes("سؤال امتحانی"));
  });

  it("شاعر را نام می‌برد", () => {
    assert.ok(lessonDescription(grade, 1, lessonFacts(poem())).includes("از سعدی"));
  });
});

describe("LearningResource", () => {
  it("شاعر زیرِ about است، نه author", () => {
    const ld = lessonJsonLd(grade, 1, lessonFacts(poem()), "x") as Record<string, unknown>;
    assert.equal(ld["@type"], "LearningResource");
    assert.equal(ld.author, undefined);
    assert.deepEqual((ld.about as { author: unknown }).author, { "@type": "Person", name: "سعدی" });
  });
});
