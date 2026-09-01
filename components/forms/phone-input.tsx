"use client";

import { useMemo } from "react";
import { getCountryOptions } from "@/lib/constants/form-options";
import { getCountryCallingCode } from "libphonenumber-js";
import { FormSelectField } from "@/components/forms/form-select-field";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function PhoneInput({
  countryCode,
  phoneNumber,
  onCountryCodeChange,
  onPhoneNumberChange,
  label = "Phone number",
}: {
  countryCode: string;
  phoneNumber: string;
  onCountryCodeChange: (code: string) => void;
  onPhoneNumberChange: (number: string) => void;
  label?: string;
}) {
  const dialOptions = useMemo(() => {
    return getCountryOptions()
      .map((c) => {
        try {
          const dial = getCountryCallingCode(c.value as Parameters<typeof getCountryCallingCode>[0]);
          return { value: c.value, label: `${c.label} (+${dial})` };
        } catch {
          return null;
        }
      })
      .filter((o): o is { value: string; label: string } => o !== null);
  }, []);

  const dialPrefix = useMemo(() => {
    if (!countryCode) return "";
    try {
      return `+${getCountryCallingCode(countryCode as Parameters<typeof getCountryCallingCode>[0])}`;
    } catch {
      return "";
    }
  }, [countryCode]);

  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <FormSelectField
          id="phone_country_code"
          label="Country code"
          value={countryCode}
          onChange={onCountryCodeChange}
          options={dialOptions}
          placeholder="Select country..."
        />
        <div className="space-y-2">
          <Label htmlFor="phone_number_local">Number</Label>
          <Input
            id="phone_number_local"
            type="tel"
            value={phoneNumber}
            onChange={(e) => onPhoneNumberChange(e.target.value)}
            placeholder={dialPrefix ? `${dialPrefix} 800 000 0000` : "e.g. 416 555 0100"}
          />
        </div>
      </div>
      {dialPrefix && phoneNumber && (
        <p className="text-xs text-slate-500">
          Full number: {dialPrefix} {phoneNumber.replace(/^\+\d+\s*/, "")}
        </p>
      )}
    </div>
  );
}

export function formatPhoneWithCountryCode(countryCode: string, localNumber: string): string {
  const digits = localNumber.replace(/\D/g, "");
  if (!countryCode || !digits) return localNumber;
  try {
    const dial = getCountryCallingCode(countryCode as Parameters<typeof getCountryCallingCode>[0]);
    return `+${dial}${digits}`;
  } catch {
    return localNumber;
  }
}

export function parsePhoneNumber(stored: string | null | undefined): {
  countryCode: string;
  localNumber: string;
} {
  if (!stored) return { countryCode: "", localNumber: "" };
  const match = stored.match(/^\+(\d{1,3})(.*)$/);
  if (!match) return { countryCode: "", localNumber: stored };
  const dial = match[1];
  const local = match[2].trim();
  const country = getCountryOptions().find((c) => {
    try {
      return getCountryCallingCode(c.value as Parameters<typeof getCountryCallingCode>[0]) === dial;
    } catch {
      return false;
    }
  });
  return { countryCode: country?.value || "", localNumber: local };
}
