import Link from "next/link";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { CatalogHeroBadge, CatalogNotice } from "@/components/catalog/catalog-notice";
import { getCatalogStatus } from "@/lib/data/catalog-status";
import { GraduationCap, Search, Shield, Target } from "lucide-react";

export default async function HomePage() {
  const catalogStatus = await getCatalogStatus();

  return (
    <div className="min-h-screen bg-gradient-to-b from-red-50 to-white">
      <header className="border-b border-red-100 bg-white/80 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4">
          <div className="flex items-center gap-2">
            <GraduationCap className="h-7 w-7 text-red-700" />
            <span className="font-bold text-slate-900">Canada Study Match</span>
          </div>
          <div className="flex gap-2">
            <Link href="/login" className="inline-flex h-10 items-center justify-center rounded-lg px-4 text-sm font-medium text-slate-700 hover:bg-slate-100">
              Log in
            </Link>
            <Link href="/signup" className="inline-flex h-10 items-center justify-center rounded-lg bg-red-700 px-4 text-sm font-medium text-white hover:bg-red-800">
              Get Started
            </Link>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 py-16">
        <div className="text-center space-y-6 mb-12">
          <CatalogHeroBadge status={catalogStatus} />
          <h1 className="text-4xl sm:text-5xl font-bold text-slate-900 tracking-tight">
            Find Your Canadian
            <span className="text-red-700"> Study Program</span>
          </h1>
          <p className="text-lg text-slate-600 max-w-2xl mx-auto">
            Match your academic profile to Canadian university and college programs.
            Supervisor requirements flagged clearly. Application tracking built in.
          </p>
          <div className="flex flex-wrap justify-center gap-3">
            <Link href="/programs" className="inline-flex h-12 items-center justify-center rounded-lg bg-red-700 px-6 text-base font-medium text-white hover:bg-red-800">
              Browse Programs
            </Link>
            <Link href="/signup" className="inline-flex h-12 items-center justify-center rounded-lg border border-slate-300 bg-white px-6 text-base font-medium text-slate-900 hover:bg-slate-50">
              Create Profile
            </Link>
          </div>
        </div>

        <CatalogNotice status={catalogStatus} className="mb-10" />

        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {[
            { icon: Target, title: "Smart Matching", desc: "Score programs against your GPA, prerequisites, language scores, and preferences." },
            { icon: Shield, title: "Supervisor Flags", desc: "Clearly see which programs require, recommend, or don't need a faculty supervisor." },
            { icon: Search, title: "Advanced Filters", desc: "Filter by province, tuition, intake, program type, and international eligibility." },
          ].map(({ icon: Icon, title, desc }) => (
            <Card key={title}>
              <CardHeader>
                <Icon className="h-8 w-8 text-red-700 mb-2" />
                <CardTitle>{title}</CardTitle>
                <CardDescription>{desc}</CardDescription>
              </CardHeader>
            </Card>
          ))}
        </div>
      </main>
    </div>
  );
}
