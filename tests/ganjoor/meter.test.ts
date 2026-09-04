import { test } from "node:test";
import assert from "node:assert/strict";
import { findGanjoorMeter } from "../../lib/ganjoor";
import { matchGanjoorMeter, normalizeGanjoorText, readGanjoorCouplets } from "../../lib/ganjoor/poem";

const first = "صلاح کار کجا و من خراب کجا";
const second = "ببین تفاوت ره کز کجاست تا به کجا";
const third = "دلم ز صومعه بگرفت و خرقه سالوس";
const fourth = "کجاست دیر مغان و شراب ناب کجا";
const rhythm = "مفاعلن فعلاتن مفاعلن فعلن (مجتث مثمن مخبون محذوف)";
function poem(id = 2131, metre = rhythm) {
  return {
    id, fullUrl: "/hafez/ghazal/sh2", fullTitle: "حافظ، غزل ۲", published: false,
    sections: [{ index: 0, ganjoorMetre: { rhythm: metre } }],
    verses: [first, second, third, fourth].map((text, i) => ({
      text, vOrder: i + 1, versePosition: i % 2, coupletIndex: Math.floor(i / 2), sectionIndex1: 0,
    })),
  };
}

test("exact pair tolerates diacritics, punctuation and Arabic letter variants", () => {
  const result = matchGanjoorMeter(poem(), "صلاحِ كار كجا و منِ خراب كجا؟", second);
  assert.equal(result?.rhythm, rhythm);
  assert.equal(result?.url, "https://ganjoor.net/hafez/ghazal/sh2#bn1");
  assert.equal(result?.sectionIndex, 0);
});
test("does not confirm partial lines, wrong second lines, or lines from different couplets", () => {
  for (const [a, b] of [[first, fourth], [first, "ببین تفاوت ره کز کجاست"], ["صلاح کار کجا", second], [second, third], [first, ""]]) {
    assert.equal(matchGanjoorMeter(poem(), a, b), null);
  }
});
test("does not collapse lexical آ and ا", () => {
  assert.notEqual(normalizeGanjoorText("آب"), normalizeGanjoorText("اب"));
});
test("uses the section of the matched couplet, not sections[0]", () => {
  const p = poem();
  p.sections.push({ index: 5, ganjoorMetre: { rhythm: "فاعلاتن فاعلاتن فاعلن" } });
  p.verses[2].sectionIndex1 = p.verses[3].sectionIndex1 = 5;
  assert.equal(matchGanjoorMeter(p, third, fourth)?.sectionIndex, 5);
  assert.equal(matchGanjoorMeter(p, third, fourth)?.rhythm, "فاعلاتن فاعلاتن فاعلن");
});
test("unmarked or mismatched verse positions never get paired", () => {
  const p = poem();
  p.verses[0].versePosition = 3;
  p.verses[2].coupletIndex = 99;
  assert.deepEqual(readGanjoorCouplets(p), []);
});
test("resolves section metre references and rejects cycles", () => {
  const p = poem();
  const withRef = { ...p, sections: [{ index: 0, ganjoorMetreRefSectionIndex: 1 }, { index: 1, ganjoorMetre: { rhythm } }] };
  assert.equal(matchGanjoorMeter(withRef, first, second)?.rhythm, rhythm);
  const cyclic = { ...p, sections: [{ index: 0, ganjoorMetreRefSectionIndex: 1 }, { index: 1, ganjoorMetreRefSectionIndex: 0 }] };
  assert.equal(matchGanjoorMeter(cyclic, first, second), null);
});
test("rejects conflicting overlapping sections and unsafe source URLs", () => {
  const p = poem();
  const conflicting = { ...p, verses: p.verses.map(v => ({ ...v, sectionIndex2: 1 })), sections: [...p.sections, { index: 1, ganjoorMetre: { rhythm: "فعولن فعولن فعولن فعل" } }] };
  assert.equal(matchGanjoorMeter(conflicting, first, second), null);
  for (const fullUrl of ["https://evil.example/path", "//evil.example/path", "javascript:alert(1)"]) {
    assert.equal(matchGanjoorMeter({ ...p, fullUrl }, first, second), null);
  }
});
test("repeated single hemistich with different metres is ambiguous", () => {
  const p = poem();
  p.verses[2].text = first;
  p.verses[2].sectionIndex1 = p.verses[3].sectionIndex1 = 1;
  p.sections.push({ index: 1, ganjoorMetre: { rhythm: "مفعول مفاعیل مفاعیل فعولن" } });
  assert.equal(matchGanjoorMeter(p, first), null);
  assert.equal(matchGanjoorMeter(p, first, second)?.rhythm, rhythm);
});

test("search verifies full poem instead of trusting result order or substrings", async () => {
  const calls: URL[] = [];
  const fetcher: typeof fetch = async input => {
    const url = new URL(String(input)); calls.push(url);
    if (url.pathname.endsWith("/search")) return Response.json([
      { id: 999, plainText: first + "\n" + fourth },
      { id: 2131, plainText: first + "\n" + second },
    ]);
    assert.equal(url.pathname, "/api/ganjoor/poem/2131");
    return Response.json(poem());
  };
  const result = await findGanjoorMeter(first, second, { fetcher });
  assert.equal(result?.poemId, 2131);
  assert.equal(calls.length, 2);
  assert.equal(calls[0].searchParams.get("term"), `"${first}"`);
  assert.equal(calls[1].searchParams.get("comments"), "false");
  assert.equal(calls[1].searchParams.get("verseDetails"), "true");
});
test("a poem id never authorizes a wrong couplet", async () => {
  const fetcher: typeof fetch = async () => Response.json(poem());
  assert.equal(await findGanjoorMeter(first, fourth, { poemId: 2131, fetcher }), null);
  assert.equal(await findGanjoorMeter(first, second, { poemId: 999, fetcher }), null);
});
test("conflicting matching poems are not resolved by search order", async () => {
  const fetcher: typeof fetch = async input => {
    const url = String(input);
    if (url.includes("/search?")) return Response.json([2131, 2132].map(id => ({ id, plainText: first + "\n" + second })));
    return Response.json(url.includes("/2131?") ? poem() : poem(2132, "فاعلاتن فاعلاتن فاعلن"));
  };
  assert.equal(await findGanjoorMeter(first, second, { fetcher }), null);
});
test("truncated search results, unavailable API, bad JSON and missing metre abstain", async () => {
  const cases: (typeof fetch)[] = [
    async () => Response.json([{ id: 2131, plainText: first + "\n" + second }], { headers: { "paging-headers": JSON.stringify({ hasNextPage: true }) } }),
    async () => { throw new Error("offline"); },
    async () => new Response("unavailable", { status: 503 }),
    async () => new Response("invalid json"),
  ];
  for (const fetcher of cases) assert.equal(await findGanjoorMeter(first, second, { fetcher }), null);
  assert.equal(matchGanjoorMeter({ ...poem(), sections: [] }, first, second), null);
});
