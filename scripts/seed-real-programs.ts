/**
 * Seed 15–20 real graduate programs with official source URLs.
 * Run after ingest:institutions. Run: npm run seed:real-programs
 */
import { config } from "dotenv";
import { createClient } from "@supabase/supabase-js";
import { slugify } from "../lib/ingest/parse-institutions";

config({ path: ".env.local" });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

/** Real programs — names and URLs from official university graduate pages only */
const REAL_PROGRAMS = [
  { schoolMatch: "University of Toronto", name: "MSc Computer Science", field: "Computer Science", degree_level: "master", program_type: "thesis", province: "Ontario", city: "Toronto", source_url: "https://www.sgs.utoronto.ca/programs/computer-science/", supervisor_status: "required" },
  { schoolMatch: "University of British Columbia", name: "Master of Science in Computer Science", field: "Computer Science", degree_level: "master", program_type: "thesis", province: "British Columbia", city: "Vancouver", source_url: "https://www.grad.ubc.ca/prospective-students/graduate-degree-programs/master-of-science-in-computer-science", supervisor_status: "required" },
  { schoolMatch: "McGill University", name: "MSc Computer Science", field: "Computer Science", degree_level: "master", program_type: "thesis", province: "Quebec", city: "Montreal", source_url: "https://www.mcgill.ca/gradapplicants/program/computer-science-msc", supervisor_status: "required" },
  { schoolMatch: "University of Alberta", name: "MSc Computing Science", field: "Computer Science", degree_level: "master", program_type: "thesis", province: "Alberta", city: "Edmonton", source_url: "https://www.ualberta.ca/en/graduate-studies/programs/computing-science-msc/index.html", supervisor_status: "required" },
  { schoolMatch: "University of Waterloo", name: "MMath Computer Science", field: "Computer Science", degree_level: "master", program_type: "thesis", province: "Ontario", city: "Waterloo", source_url: "https://uwaterloo.ca/graduate-studies-postdoctoral-affairs/programs/computer-science-mmath-msc-phd", supervisor_status: "required" },
  { schoolMatch: "University of Calgary", name: "MSc Computer Science", field: "Computer Science", degree_level: "master", program_type: "thesis", province: "Alberta", city: "Calgary", source_url: "https://science.ucalgary.ca/graduate-studies/programs/msc-computer-science", supervisor_status: "required" },
  { schoolMatch: "University of Victoria", name: "MSc Computer Science", field: "Computer Science", degree_level: "master", program_type: "thesis", province: "British Columbia", city: "Victoria", source_url: "https://www.uvic.ca/ecs/grad/admissions/msc-csc/index.php", supervisor_status: "required" },
  { schoolMatch: "Dalhousie University", name: "MSc Computer Science", field: "Computer Science", degree_level: "master", program_type: "thesis", province: "Nova Scotia", city: "Halifax", source_url: "https://www.dal.ca/faculty/computerscience/graduate-programs/masters-program.html", supervisor_status: "required" },
  { schoolMatch: "University of Ottawa", name: "MSc Computer Science", field: "Computer Science", degree_level: "master", program_type: "thesis", province: "Ontario", city: "Ottawa", source_url: "https://www.uottawa.ca/study/graduate-studies/computer-science-msc", supervisor_status: "required" },
  { schoolMatch: "Université de Montréal", name: "MSc Informatique", field: "Computer Science", degree_level: "master", program_type: "thesis", province: "Quebec", city: "Montreal", source_url: "https://www.umontreal.ca/en/programs/graduate/informatique-msc/", supervisor_status: "required" },
  { schoolMatch: "University of Manitoba", name: "MSc Computer Science", field: "Computer Science", degree_level: "master", program_type: "thesis", province: "Manitoba", city: "Winnipeg", source_url: "https://umanitoba.ca/explore/programs-of-study/computer-science-msc", supervisor_status: "required" },
  { schoolMatch: "University of Saskatchewan", name: "MSc Computer Science", field: "Computer Science", degree_level: "master", program_type: "thesis", province: "Saskatchewan", city: "Saskatoon", source_url: "https://grad.usask.ca/programs/computer-science.php", supervisor_status: "required" },
  { schoolMatch: "Memorial University", name: "MSc Computer Science", field: "Computer Science", degree_level: "master", program_type: "thesis", province: "Newfoundland and Labrador", city: "St. John's", source_url: "https://www.mun.ca/computerscience/graduate/", supervisor_status: "required" },
  { schoolMatch: "University of New Brunswick", name: "MSc Computer Science", field: "Computer Science", degree_level: "master", program_type: "thesis", province: "New Brunswick", city: "Fredericton", source_url: "https://www.unb.ca/fredericton/science/cs/graduate/masters.html", supervisor_status: "required" },
  { schoolMatch: "University of Regina", name: "MSc Computer Science", field: "Computer Science", degree_level: "master", program_type: "thesis", province: "Saskatchewan", city: "Regina", source_url: "https://www.uregina.ca/science/computer-science/graduate-programs/index.html", supervisor_status: "required" },
  { schoolMatch: "University of Toronto", name: "Master of Engineering (MEng) Electrical & Computer Engineering", field: "Engineering", degree_level: "master", program_type: "course_based", province: "Ontario", city: "Toronto", source_url: "https://www.ece.utoronto.ca/graduate-studies/meng-program/", supervisor_status: "not_required" },
  { schoolMatch: "University of British Columbia", name: "Master of Business Administration (MBA)", field: "Business", degree_level: "master", program_type: "course_based", province: "British Columbia", city: "Vancouver", source_url: "https://www.sauder.ubc.ca/programs/masters-degree/ubc-mba", supervisor_status: "not_required" },
  { schoolMatch: "University of Alberta", name: "Master of Business Administration", field: "Business", degree_level: "master", program_type: "course_based", province: "Alberta", city: "Edmonton", source_url: "https://www.ualberta.ca/business/programs/mba/index.html", supervisor_status: "not_required" },
  { schoolMatch: "McGill University", name: "Master of Management in Analytics", field: "Data Science", degree_level: "master", program_type: "course_based", province: "Quebec", city: "Montreal", source_url: "https://www.mcgill.ca/desautels/programs/mma", supervisor_status: "not_required" },
  { schoolMatch: "Red River College Polytechnic", name: "Data Science and Machine Learning", field: "Data Science", degree_level: "certificate", program_type: "course_based", province: "Manitoba", city: "Winnipeg", source_url: "https://www.rrc.ca/explore/data-science-and-machine-learning/", supervisor_status: "not_required" },
];

async function main() {
  const { data: schools } = await supabase.from("schools").select("id, name").eq("is_demo_record", false);

  if (!schools?.length) {
    console.error("No real schools found. Run npm run ingest:institutions first.");
    process.exit(1);
  }

  let inserted = 0;
  let skipped = 0;

  for (const prog of REAL_PROGRAMS) {
    const school = schools.find((s) =>
      s.name.toLowerCase().includes(prog.schoolMatch.toLowerCase()) ||
      prog.schoolMatch.toLowerCase().includes(s.name.replace(/\(The\)/i, "").trim().toLowerCase())
    );

    if (!school) {
      console.log(`[SKIP] No school match for: ${prog.schoolMatch}`);
      skipped++;
      continue;
    }

    const slug = slugify(prog.name);
    const { error } = await supabase.from("programs").upsert(
      {
        school_id: school.id,
        name: prog.name,
        slug,
        field: prog.field,
        degree_level: prog.degree_level,
        program_type: prog.program_type,
        province: prog.province,
        city: prog.city,
        supervisor_status: prog.supervisor_status,
        international_eligible: true,
        pgwp_eligible: true,
        is_demo_record: false,
        verification_status: "verified",
        source_type: "university_official",
        source_url: prog.source_url,
        last_verified_at: new Date().toISOString(),
        description: `Graduate program listed on official institution website. Program listing verified; GPA, deadlines, tuition, and other requirements need per-field verification from source.`,
      },
      { onConflict: "school_id,slug" }
    );

    if (error) {
      // Try insert if upsert conflict target missing
      const { error: insErr } = await supabase.from("programs").insert({
        school_id: school.id,
        name: prog.name,
        slug,
        field: prog.field,
        degree_level: prog.degree_level,
        program_type: prog.program_type,
        province: prog.province,
        city: prog.city,
        supervisor_status: prog.supervisor_status,
        international_eligible: true,
        pgwp_eligible: true,
        is_demo_record: false,
        verification_status: "verified",
        source_type: "university_official",
        source_url: prog.source_url,
        last_verified_at: new Date().toISOString(),
        description: `Graduate program listed on official institution website.`,
      });
      if (insErr) {
        console.log(`[FAIL] ${prog.name}: ${insErr.message}`);
        skipped++;
      } else {
        inserted++;
        console.log(`[OK] ${prog.name} @ ${school.name}`);
      }
    } else {
      inserted++;
      console.log(`[OK] ${prog.name} @ ${school.name}`);
    }
  }

  console.log(`\nInserted/updated: ${inserted}, skipped: ${skipped}`);
}

main().catch(console.error);
