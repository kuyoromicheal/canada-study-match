/**
 * Verifies storage RLS blocks cross-user document access.
 * Run: npx tsx scripts/test-storage-rls.ts
 *
 * Requires SUPABASE_SERVICE_ROLE_KEY and two test user IDs in env:
 * TEST_USER_A_ID, TEST_USER_B_ID (optional — creates ephemeral test if omitted)
 */

import { createClient } from "@supabase/supabase-js";
import * as dotenv from "dotenv";

dotenv.config({ path: ".env.local" });

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!url || !serviceKey || !anonKey) {
  console.error("Missing Supabase env vars in .env.local");
  process.exit(1);
}

const admin = createClient(url, serviceKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

async function main() {
  const bucket = "student-documents";
  let userA = process.env.TEST_USER_A_ID;
  let userB = process.env.TEST_USER_B_ID;

  if (!userA || !userB) {
    const emailA = `rls-test-a-${Date.now()}@example.com`;
    const emailB = `rls-test-b-${Date.now()}@example.com`;
    const pass = `Test-${Date.now()}!`;

    const { data: createdA } = await admin.auth.admin.createUser({ email: emailA, password: pass, email_confirm: true });
    const { data: createdB } = await admin.auth.admin.createUser({ email: emailB, password: pass, email_confirm: true });

    if (!createdA.user || !createdB.user) {
      console.error("Failed to create test users");
      process.exit(1);
    }

    userA = createdA.user.id;
    userB = createdB.user.id;
    console.log("Created ephemeral test users:", userA, userB);
  }

  const pathB = `${userB!}/rls-test-secret.pdf`;
  const fakePdf = Buffer.from("%PDF-1.4 rls test");

  const { error: uploadError } = await admin.storage.from(bucket).upload(pathB, fakePdf, {
    contentType: "application/pdf",
    upsert: true,
  });

  if (uploadError) {
    console.error("Admin upload failed (bucket may not exist — run migration):", uploadError.message);
    process.exit(1);
  }

  await admin.from("documents").upsert({
    user_id: userB!,
    doc_type: "other",
    display_name: "RLS test doc",
    file_name: "rls-test-secret.pdf",
    storage_path: pathB,
    file_size: fakePdf.length,
    mime_type: "application/pdf",
  });

  const clientA = createClient(url!, anonKey!);
  const { data: signInA } = await clientA.auth.signInWithPassword({
    email: process.env.TEST_USER_A_EMAIL || "",
    password: process.env.TEST_USER_A_PASSWORD || "",
  });

  let sessionClient = clientA;
  if (!signInA.session && !process.env.TEST_USER_A_EMAIL) {
    const emailA = `rls-test-a-${Date.now()}@example.com`;
    const pass = `Test-${Date.now()}!`;
    const { data: createdA } = await admin.auth.admin.createUser({ email: emailA, password: pass, email_confirm: true });
    if (createdA.user) {
      userA = createdA.user.id;
      const { data: session } = await clientA.auth.signInWithPassword({ email: emailA, password: pass });
      if (session.session) sessionClient = clientA;
    }
  }

  const { data: crossDownload, error: crossError } = await sessionClient.storage.from(bucket).download(pathB);
  const { data: crossSigned, error: crossSignedError } = await sessionClient.storage
    .from(bucket)
    .createSignedUrl(pathB, 60);

  const blockedDownload = Boolean(crossError) || !crossDownload;
  const blockedSigned = Boolean(crossSignedError) || !crossSigned?.signedUrl;

  console.log("\n=== Storage RLS cross-user test ===");
  console.log("User A attempting User B path:", pathB);
  console.log("Direct download blocked:", blockedDownload ? "PASS" : "FAIL");
  console.log("Signed URL blocked:", blockedSigned ? "PASS" : "FAIL");

  await admin.storage.from(bucket).remove([pathB]);
  await admin.from("documents").delete().eq("storage_path", pathB);

  if (!blockedDownload || !blockedSigned) {
    process.exit(1);
  }

  console.log("\nAll cross-user access checks passed.");
}

main().catch((err) => {
  console.error("Test failed:", err.message);
  process.exit(1);
});
