"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert } from "@/components/ui/alert";

export function RequestProgramForm() {
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ school_name: "", program_name: "", field: "", province: "" });
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    const res = await fetch("/api/program-requests", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    const data = await res.json();
    setMessage(res.ok ? "Request submitted — admins prioritize popular requests." : data.error);
    setLoading(false);
    if (res.ok) {
      setForm({ school_name: "", program_name: "", field: "", province: "" });
      setOpen(false);
    }
  }

  if (!open) {
    return (
      <Button variant="outline" onClick={() => setOpen(true)}>
        Request this program
      </Button>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Request a Program</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={submit} className="grid sm:grid-cols-2 gap-3">
          <div className="space-y-1">
            <Label>University / College *</Label>
            <Input required value={form.school_name} onChange={(e) => setForm({ ...form, school_name: e.target.value })} />
          </div>
          <div className="space-y-1">
            <Label>Program name *</Label>
            <Input required value={form.program_name} onChange={(e) => setForm({ ...form, program_name: e.target.value })} />
          </div>
          <div className="space-y-1">
            <Label>Field</Label>
            <Input value={form.field} onChange={(e) => setForm({ ...form, field: e.target.value })} />
          </div>
          <div className="space-y-1">
            <Label>Province</Label>
            <Input value={form.province} onChange={(e) => setForm({ ...form, province: e.target.value })} />
          </div>
          <div className="sm:col-span-2 flex gap-2">
            <Button type="submit" disabled={loading}>{loading ? "Submitting..." : "Submit request"}</Button>
            <Button type="button" variant="ghost" onClick={() => setOpen(false)}>Cancel</Button>
          </div>
        </form>
        {message && <Alert variant="success" className="mt-3">{message}</Alert>}
      </CardContent>
    </Card>
  );
}
