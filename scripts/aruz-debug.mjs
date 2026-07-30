/**
 * aruz-debug.mjs — درونهٔ موتورِ TypeScript برای یک مصراع، تا با پایتون مقایسه شود.
 *   node scripts/aruz-debug.mjs "مصراع"
 */
import { createJiti } from "jiti";
const jiti = createJiti(import.meta.url);
const eng = await jiti.import("../lib/aruz/engine.ts");
const { align } = await jiti.import("../lib/aruz/align.ts");

const line = process.argv[2];
const norm = eng.normalize ? eng.normalize(line) : null;
const toks = eng.tokenize ? eng.tokenize(line) : null;
const scans = eng.scanLine(line);
const out = {
  norm,
  toks,
  nScans: scans.size ?? Object.keys(scans).length,
  // نقشهٔ کاملِ خوانش→جریمه؛ مقایسهٔ همین است که واگرایی را نشان می‌دهد
  scans: Object.fromEntries(scans instanceof Map ? [...scans] : Object.entries(scans)),
};
if (process.argv[3]) out.align = align(line, process.argv[3]);

// نامِ وزن → اجزای هزینه + گونه‌های وزن، برای مقایسهٔ لایهٔ meterCostDetail
if (process.argv[4]) {
  const m = await jiti.import("../lib/aruz/meters.ts");
  const meter = m.METERS.find((x) => x.name === process.argv[4] || x.ark === process.argv[4]);
  if (meter) {
    out.meter = { name: meter.name, ark: meter.ark, pat: meter.pat, freq: meter.freq };
    out.detail = m.meterCostDetail(scans, meter.pat, meter.name);
    out.variants = m.meterVariants(meter.pat, meter.name);
  } else out.meter = null;
}
process.stdout.write(JSON.stringify(out));
