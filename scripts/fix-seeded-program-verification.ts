/**
 * Ensure seeded real programs keep program-level verified status but child
 * facts (GPA, deadlines, tuition, prerequisites) remain needs_verification
 * until an admin confirms each field from the source page.
 *
 * Run: npx tsx scripts/fix-seeded-program-verification.ts
 */
import { config } from "dotenv";
import { createClient } from "@supabase/supabase-js";

config({ path: ".env.local" });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function main() {
  const { data: programs, error } = await supabase
    .from("programs")
    .select("id, name")
    .eq("is_demo_record", false)
    .eq("verification_status", "verified");

  if (error) {
    console.error(error.message);
    process.exit(1);
  }

  let updated = 0;

  for (const program of programs || []) {
    const tables = [
      { table: "program_requirements", idCol: "program_id" },
      { table: "application_deadlines", idCol: "program_id" },
      { table: "tuition", idCol: "program_id" },
    ] as const;

    for (const { table, idCol } of tables) {
      const { data: rows } = await supabase
        .from(table)
        .select("id, verification_status")
        .eq(idCol, program.id);

      for (const row of rows || []) {
        if (row.verification_status === "verified") {
          await supabase
            .from(table)
            .update({
              verification_status: "needs_verification",
              last_verified_at: null,
            })
            .eq("id", row.id);
          updated++;
          console.log(`[FIX] ${program.name} — ${table} row reset to needs_verification`);
        }
      }
    }
  }

  console.log(`\nDone. Reset ${updated} child fact row(s) across ${programs?.length ?? 0} verified programs.`);
  console.log("Program-level verification_status unchanged (listing still verified).");
}

main().catch(console.error);
