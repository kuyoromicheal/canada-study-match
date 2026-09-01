import {
  DEMO_PROGRAMS,
  DEMO_SCHOOLS,
  DEMO_SUPERVISORS,
  DEMO_REQUIREMENTS,
  DEMO_DEADLINES,
  DEMO_TUITION,
  DEMO_PROGRAM_SUPERVISORS,
} from "./seed-data";
import type {
  ApplicationDeadline,
  Program,
  ProgramRequirement,
  ProgramSupervisor,
  School,
  Supervisor,
  Tuition,
} from "@/types/database";

export function getSeedSchools(): School[] {
  return DEMO_SCHOOLS;
}

export function getSeedPrograms(): Program[] {
  return DEMO_PROGRAMS;
}

export function getSeedSupervisors(): Supervisor[] {
  return DEMO_SUPERVISORS;
}

export function getSeedRequirements(): ProgramRequirement[] {
  return DEMO_REQUIREMENTS;
}

export function getSeedDeadlines(): ApplicationDeadline[] {
  return DEMO_DEADLINES;
}

export function getSeedTuition(): Tuition[] {
  return DEMO_TUITION;
}

export function getSeedProgramSupervisors(): ProgramSupervisor[] {
  return DEMO_PROGRAM_SUPERVISORS;
}

export function getProvinces(): string[] {
  return [...new Set(DEMO_PROGRAMS.map((p) => p.province))].sort();
}

export function getFields(): string[] {
  return [...new Set(DEMO_PROGRAMS.map((p) => p.field))].sort();
}

export function getCities(): string[] {
  return [...new Set(DEMO_PROGRAMS.map((p) => p.city))].sort();
}

export function getIntakes(): string[] {
  const intakes = DEMO_PROGRAMS.flatMap((p) => p.intakes || []);
  return [...new Set(intakes)].sort();
}
