"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert } from "@/components/ui/alert";
import { Progress } from "@/components/ui/progress";
import { isContactProfileComplete } from "@/lib/validation/contact";
import {
  getCountryOptions,
  resolveCountryCode,
} from "@/lib/constants/form-options";
import { SearchableCombobox } from "@/components/ui/searchable-combobox";
import {
  formatPhoneWithCountryCode,
  parsePhoneNumber,
  PhoneInput,
} from "@/components/forms/phone-input";
import type { StudentProfile, StudentProfileInput } from "@/types/database";
import { calculateProfileCompleteness } from "@/types/database";

export function ProfileClient({ initialProfile }: { initialProfile: StudentProfile | null }) {
  const router = useRouter();
  const countryOptions = useMemo(() => getCountryOptions(), []);
  const initialPhone = parsePhoneNumber(initialProfile?.phone_number);

  const [profile, setProfile] = useState<Partial<StudentProfileInput> & {
    phone_country_code?: string;
    phone_local?: string;
  }>({
    full_name: initialProfile?.full_name || "",
    email: initialProfile?.email || "",
    citizenship_country: resolveCountryCode(initialProfile?.citizenship_country),
    current_country: resolveCountryCode(initialProfile?.current_country),
    phone_country_code: initialPhone.countryCode || resolveCountryCode(initialProfile?.citizenship_country),
    phone_local: initialPhone.localNumber,
    phone_number: initialProfile?.phone_number || "",
    mailing_street: initialProfile?.mailing_street || "",
    mailing_city: initialProfile?.mailing_city || "",
    mailing_province_state: initialProfile?.mailing_province_state || "",
    mailing_postal_code: initialProfile?.mailing_postal_code || "",
    mailing_country: resolveCountryCode(initialProfile?.mailing_country),
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  const completeness = calculateProfileCompleteness(profile);
  const contactComplete = isContactProfileComplete(profile);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    setSaved(false);

    const payload = {
      ...profile,
      phone_number: formatPhoneWithCountryCode(
        profile.phone_country_code || profile.citizenship_country || "",
        profile.phone_local || ""
      ),
    };
    delete (payload as { phone_country_code?: string }).phone_country_code;
    delete (payload as { phone_local?: string }).phone_local;

    const res = await fetch("/api/profile", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const data = await res.json();
    setSaving(false);

    if (!res.ok) {
      setError(data.error || "Failed to save profile");
      return;
    }

    setProfile(data.profile);
    setSaved(true);
    router.refresh();
  }

  function updateField(key: keyof StudentProfileInput, value: string) {
    setProfile((prev) => ({ ...prev, [key]: value }));
    setSaved(false);
  }

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Your profile</h1>
        <p className="text-slate-500 mt-1">
          Contact details are used when preparing application packages. Update them anytime.
        </p>
      </div>

      <div className="flex gap-2 text-sm">
        <Link href="/profile" className="font-medium text-red-700 underline">Contact & basics</Link>
        <span className="text-slate-300">|</span>
        <Link href="/profile/documents" className="text-slate-600 hover:text-red-700">Document vault</Link>
        <span className="text-slate-300">|</span>
        <Link href="/onboarding" className="text-slate-600 hover:text-red-700">Full onboarding wizard</Link>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Profile completeness</CardTitle>
          <CardDescription>
            {contactComplete ? "Contact info complete for application packages." : "Fill in phone and mailing address for application packages."}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Progress value={completeness} />
          <p className="text-sm text-slate-500 mt-2">{completeness}% complete</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Contact & identity</CardTitle>
          <CardDescription>Used on application checklists and package preparation</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSave} className="space-y-4">
            {error && <Alert variant="error" title="Could not save">{error}</Alert>}
            {saved && <Alert variant="success" title="Saved">Profile updated.</Alert>}

            <Field label="Full name" value={profile.full_name || ""} onChange={(v) => updateField("full_name", v)} required />
            <Field label="Email" type="email" value={profile.email || ""} onChange={(v) => updateField("email", v)} />
            <SearchableCombobox
              id="citizenship_country"
              label="Citizenship country"
              required
              value={profile.citizenship_country || ""}
              onChange={(v) => updateField("citizenship_country", v)}
              options={countryOptions}
            />
            <SearchableCombobox
              id="current_country"
              label="Current country"
              value={profile.current_country || ""}
              onChange={(v) => updateField("current_country", v)}
              options={countryOptions}
            />
            <PhoneInput
              countryCode={profile.phone_country_code || profile.citizenship_country || ""}
              phoneNumber={profile.phone_local || ""}
              onCountryCodeChange={(v) => setProfile((p) => ({ ...p, phone_country_code: v }))}
              onPhoneNumberChange={(v) => setProfile((p) => ({ ...p, phone_local: v }))}
            />

            <div className="pt-2 border-t border-slate-100">
              <p className="text-sm font-medium text-slate-700 mb-3">Mailing address</p>
              <div className="space-y-4">
                <Field label="Street address" value={profile.mailing_street || ""} onChange={(v) => updateField("mailing_street", v)} />
                <div className="grid sm:grid-cols-2 gap-4">
                  <Field label="City" value={profile.mailing_city || ""} onChange={(v) => updateField("mailing_city", v)} />
                  <Field label="Province / state" value={profile.mailing_province_state || ""} onChange={(v) => updateField("mailing_province_state", v)} />
                </div>
                <div className="grid sm:grid-cols-2 gap-4">
                  <Field label="Postal / ZIP code" value={profile.mailing_postal_code || ""} onChange={(v) => updateField("mailing_postal_code", v)} />
                  <SearchableCombobox
                    id="mailing_country"
                    label="Country"
                    value={profile.mailing_country || ""}
                    onChange={(v) => updateField("mailing_country", v)}
                    options={countryOptions}
                  />
                </div>
              </div>
            </div>

            <Button type="submit" disabled={saving}>{saving ? "Saving..." : "Save profile"}</Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

function Field({
  label, value, onChange, type = "text", required, placeholder,
}: {
  label: string; value: string; onChange: (v: string) => void; type?: string; required?: boolean; placeholder?: string;
}) {
  const id = label.toLowerCase().replace(/\s+/g, "-");
  return (
    <div className="space-y-2">
      <Label htmlFor={id}>{label}{required ? " *" : ""}</Label>
      <Input id={id} type={type} value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} required={required} />
    </div>
  );
}
