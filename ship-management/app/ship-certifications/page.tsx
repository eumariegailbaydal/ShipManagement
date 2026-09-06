"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase-browser";
import AppShell from "@/components/AppShell";
import StatusBadge from "@/components/StatusBadge";

type ShipCert = {
  id: string;
  ship_id: string;
  cert_name: string;
  cert_no: string | null;
  cert_type: string | null;
  issue_date: string | null;
  expiry_date: string | null;
  status: string;
  ships: { name: string } | null;
};

type Inspection = {
  id: string;
  ship_id: string;
  inspection_type: string | null;
  inspector: string | null;
  scheduled_date: string | null;
  completed_date: string | null;
  result: string | null;
  ships: { name: string } | null;
};

type ShipOption = { id: string; name: string };

export default function ShipCertificationsPage() {
  const supabase = createClient();
  const [certs, setCerts] = useState<ShipCert[]>([]);
  const [inspections, setInspections] = useState<Inspection[]>([]);
  const [ships, setShips] = useState<ShipOption[]>([]);
  const [showCertForm, setShowCertForm] = useState(false);
  const [showInspectionForm, setShowInspectionForm] = useState(false);

  const [certForm, setCertForm] = useState({
    ship_id: "",
    cert_name: "",
    cert_no: "",
    cert_type: "class",
    issue_date: "",
    expiry_date: "",
  });

  const [inspectionForm, setInspectionForm] = useState({
    ship_id: "",
    inspection_type: "",
    inspector: "",
    scheduled_date: "",
    completed_date: "",
    result: "",
  });

  async function load() {
    const { data: certData } = await supabase
      .from("ship_certifications_status")
      .select("*, ships(name)")
      .order("expiry_date", { ascending: true });
    setCerts((certData as any) ?? []);

    const { data: inspectionData } = await supabase
      .from("inspections")
      .select("*, ships(name)")
      .order("scheduled_date", { ascending: false });
    setInspections((inspectionData as any) ?? []);

    const { data: shipData } = await supabase.from("ships").select("id, name").order("name");
    setShips(shipData ?? []);
  }

  useEffect(() => {
    load();
  }, []);

  async function addCert(e: React.FormEvent) {
    e.preventDefault();
    const { error } = await supabase.from("ship_certifications").insert({
      ship_id: certForm.ship_id,
      cert_name: certForm.cert_name,
      cert_no: certForm.cert_no || null,
      cert_type: certForm.cert_type,
      issue_date: certForm.issue_date || null,
      expiry_date: certForm.expiry_date || null,
    });
    if (error) {
      alert(`Couldn't save this certificate: ${error.message}`);
      return;
    }
    setCertForm({ ship_id: "", cert_name: "", cert_no: "", cert_type: "class", issue_date: "", expiry_date: "" });
    setShowCertForm(false);
    load();
  }

  async function addInspection(e: React.FormEvent) {
    e.preventDefault();
    const { error } = await supabase.from("inspections").insert({
      ship_id: inspectionForm.ship_id,
      inspection_type: inspectionForm.inspection_type,
      inspector: inspectionForm.inspector || null,
      scheduled_date: inspectionForm.scheduled_date || null,
      completed_date: inspectionForm.completed_date || null,
      result: inspectionForm.result || null,
    });
    if (error) {
      alert(`Couldn't save this inspection: ${error.message}`);
      return;
    }
    setInspectionForm({ ship_id: "", inspection_type: "", inspector: "", scheduled_date: "", completed_date: "", result: "" });
    setShowInspectionForm(false);
    load();
  }

  return (
    <AppShell>
      <div className="p-8 max-w-6xl">
        <h1 className="text-xl font-semibold mb-1">Ship Certifications & Inspections</h1>
        <p className="text-sm text-ink/60 mb-6">Class, flag, and insurance certificates, plus survey and inspection history.</p>

        {/* Ship Certificates */}
        <div className="flex items-center justify-between mb-3 mt-8">
          <h2 className="text-base font-medium">Ship Certificates</h2>
          <button
            onClick={() => setShowCertForm(!showCertForm)}
            className="bg-harbor-900 text-paper text-sm px-4 py-2 rounded-sm hover:bg-harbor-800"
          >
            {showCertForm ? "Cancel" : "Add certificate"}
          </button>
        </div>

        {showCertForm && (
          <form onSubmit={addCert} className="panel rounded-sm p-5 mb-6 grid grid-cols-3 gap-4">
            <div>
              <label className="block text-xs text-ink/60 mb-1">Ship</label>
              <select
                required
                value={certForm.ship_id}
                onChange={(e) => setCertForm({ ...certForm, ship_id: e.target.value })}
                className="w-full border border-ink/20 rounded-sm px-3 py-1.5 text-sm"
              >
                <option value="">Select…</option>
                {ships.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
            </div>
            <Field label="Certificate name" value={certForm.cert_name} onChange={(v) => setCertForm({ ...certForm, cert_name: v })} placeholder="e.g. Safety Management Certificate" required />
            <Field label="Cert. No." value={certForm.cert_no} onChange={(v) => setCertForm({ ...certForm, cert_no: v })} />
            <div>
              <label className="block text-xs text-ink/60 mb-1">Type</label>
              <select
                value={certForm.cert_type}
                onChange={(e) => setCertForm({ ...certForm, cert_type: e.target.value })}
                className="w-full border border-ink/20 rounded-sm px-3 py-1.5 text-sm"
              >
                <option value="class">Class</option>
                <option value="flag">Flag</option>
                <option value="insurance">Insurance</option>
                <option value="other">Other</option>
              </select>
            </div>
            <Field label="Issue date" value={certForm.issue_date} onChange={(v) => setCertForm({ ...certForm, issue_date: v })} type="date" />
            <Field label="Expiry / renewal date" value={certForm.expiry_date} onChange={(v) => setCertForm({ ...certForm, expiry_date: v })} type="date" />
            <div className="col-span-3">
              <button className="bg-harbor-900 text-paper text-sm px-4 py-2 rounded-sm hover:bg-harbor-800">
                Save certificate
              </button>
            </div>
          </form>
        )}

        <div className="panel rounded-sm mb-10">
          <table className="log-table w-full">
            <thead>
              <tr>
                <th>Ship</th>
                <th>Certificate</th>
                <th>Cert. No.</th>
                <th>Type</th>
                <th>Renewal Date</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {certs.map((c) => (
                <tr key={c.id}>
                  <td className="font-medium">{c.ships?.name ?? "—"}</td>
                  <td className="text-ink/60">{c.cert_name}</td>
                  <td className="text-ink/60">{c.cert_no ?? "—"}</td>
                  <td className="text-ink/60 capitalize">{c.cert_type ?? "—"}</td>
                  <td className="text-ink/60">{c.expiry_date ?? "—"}</td>
                  <td>
                    <StatusBadge status={c.status} />
                  </td>
                </tr>
              ))}
              {certs.length === 0 && (
                <tr>
                  <td colSpan={6} className="text-center text-ink/50 py-8">
                    No ship certificates yet — add your first one above.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Inspections */}
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-base font-medium">Inspections & Surveys</h2>
          <button
            onClick={() => setShowInspectionForm(!showInspectionForm)}
            className="bg-harbor-900 text-paper text-sm px-4 py-2 rounded-sm hover:bg-harbor-800"
          >
            {showInspectionForm ? "Cancel" : "Add inspection"}
          </button>
        </div>

        {showInspectionForm && (
          <form onSubmit={addInspection} className="panel rounded-sm p-5 mb-6 grid grid-cols-3 gap-4">
            <div>
              <label className="block text-xs text-ink/60 mb-1">Ship</label>
              <select
                required
                value={inspectionForm.ship_id}
                onChange={(e) => setInspectionForm({ ...inspectionForm, ship_id: e.target.value })}
                className="w-full border border-ink/20 rounded-sm px-3 py-1.5 text-sm"
              >
                <option value="">Select…</option>
                {ships.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
            </div>
            <Field label="Inspection type" value={inspectionForm.inspection_type} onChange={(v) => setInspectionForm({ ...inspectionForm, inspection_type: v })} placeholder="e.g. Port State Control" required />
            <Field label="Inspector" value={inspectionForm.inspector} onChange={(v) => setInspectionForm({ ...inspectionForm, inspector: v })} />
            <Field label="Scheduled date" value={inspectionForm.scheduled_date} onChange={(v) => setInspectionForm({ ...inspectionForm, scheduled_date: v })} type="date" />
            <Field label="Completed date" value={inspectionForm.completed_date} onChange={(v) => setInspectionForm({ ...inspectionForm, completed_date: v })} type="date" />
            <Field label="Result" value={inspectionForm.result} onChange={(v) => setInspectionForm({ ...inspectionForm, result: v })} placeholder="e.g. Passed, no deficiencies" />
            <div className="col-span-3">
              <button className="bg-harbor-900 text-paper text-sm px-4 py-2 rounded-sm hover:bg-harbor-800">
                Save inspection
              </button>
            </div>
          </form>
        )}

        <div className="panel rounded-sm">
          <table className="log-table w-full">
            <thead>
              <tr>
                <th>Ship</th>
                <th>Type</th>
                <th>Inspector</th>
                <th>Scheduled</th>
                <th>Completed</th>
                <th>Result</th>
              </tr>
            </thead>
            <tbody>
              {inspections.map((i) => (
                <tr key={i.id}>
                  <td className="font-medium">{i.ships?.name ?? "—"}</td>
                  <td className="text-ink/60">{i.inspection_type ?? "—"}</td>
                  <td className="text-ink/60">{i.inspector ?? "—"}</td>
                  <td className="text-ink/60">{i.scheduled_date ?? "—"}</td>
                  <td className="text-ink/60">{i.completed_date ?? "—"}</td>
                  <td className="text-ink/60">{i.result ?? "—"}</td>
                </tr>
              ))}
              {inspections.length === 0 && (
                <tr>
                  <td colSpan={6} className="text-center text-ink/50 py-8">
                    No inspections logged yet — add your first one above.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </AppShell>
  );
}

function Field({
  label,
  value,
  onChange,
  type = "text",
  required,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
  required?: boolean;
  placeholder?: string;
}) {
  return (
    <div>
      <label className="block text-xs text-ink/60 mb-1">{label}</label>
      <input
        type={type}
        required={required}
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full border border-ink/20 rounded-sm px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-harbor-700"
      />
    </div>
  );
}
