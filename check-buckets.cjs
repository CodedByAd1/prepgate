require("dotenv").config();
const { createClient } = require("@supabase/supabase-js");

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

async function main() {
  console.log("SUPABASE_URL:", process.env.SUPABASE_URL ? "✓ set" : "✗ missing");
  console.log("SERVICE_ROLE_KEY:", process.env.SUPABASE_SERVICE_ROLE_KEY ? "✓ set" : "✗ missing");

  const { data: buckets, error } = await supabase.storage.listBuckets();
  if (error) {
    console.error("Bucket list error:", error.message);
    return;
  }
  console.log("\nExisting buckets:", buckets.map(b => b.name));

  const needed = ["pdf-imports", "page-images", "question-images"];
  for (const name of needed) {
    const exists = buckets.some(b => b.name === name);
    if (!exists) {
      const { error: ce } = await supabase.storage.createBucket(name, { public: true });
      if (ce) console.error(`  ✗ Failed to create '${name}':`, ce.message);
      else console.log(`  ✓ Created bucket '${name}'`);
    } else {
      console.log(`  ✓ Bucket '${name}' already exists`);
    }
  }
}

main().catch(e => console.error("Fatal:", e.message));
