// One-off diagnostic: confirms SUPABASE_SERVICE_ROLE_KEY in .env.local is
// actually a service_role JWT (not the anon key, not stale/malformed),
// without printing the secret itself. Run with: npx tsx scripts/check-service-key.ts

process.loadEnvFile(".env.local");

const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!key) {
  console.log("SUPABASE_SERVICE_ROLE_KEY is NOT set in .env.local");
  process.exit(1);
}

const parts = key.split(".");
if (parts.length !== 3) {
  console.log("This doesn't look like a JWT (expected 3 dot-separated parts, got " + parts.length + ")");
  process.exit(1);
}

try {
  const payload = JSON.parse(Buffer.from(parts[1], "base64url").toString("utf8"));
  console.log("role:", payload.role);
  console.log("ref:", payload.ref);
  console.log("expires:", new Date(payload.exp * 1000).toISOString());
  console.log("expired:", Date.now() > payload.exp * 1000);
} catch (e) {
  console.log("Could not decode the key's payload:", e);
}
