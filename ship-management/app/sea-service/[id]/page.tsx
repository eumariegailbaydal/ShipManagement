"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase-browser";
import AppShell from "@/components/AppShell";

type Cert = {
  id: string;
  crew_name: string | null;
  seaman_book_no: string | null;
  passport_no: string | null;
  nationality: string | null;
  position: string | null;
  vessel_name: string | null;
  vessel_imo: string | null;
  vessel_flag: string | null;
  vessel_type: string | null;
  date_of_joining: string | null;
  date_of_discharge: string | null;
  place_of_issue: string | null;
  date_of_issue: string | null;
  issued_by_name: string | null;
  issued_by_title: string | null;
  remarks: string | null;
};

function fmt(d: string | null) {
  if (!d) return "—";
  return new Date(d).toLocaleDateString(undefined, { year: "numeric", month: "long", day: "numeric" });
}

export default function SeaServiceCertificatePage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;
  const supabase = createClient();
  const [cert, setCert] = useState<Cert | null>(null);

  useEffect(() => {
    async function load() {
      const { data } = await supabase.from("sea_service_records").select("*").eq("id", id).single();
      setCert(data);
    }
    if (id) load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  if (!cert) {
    return (
      <AppShell>
        <div className="p-8 text-sm text-ink/50">Loading…</div>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <div className="p-8 max-w-3xl">
        <div className="flex items-center justify-between mb-6 print-hide">
          <button onClick={() => router.push("/sea-service")} className="text-xs text-harbor-700 hover:underline">
            ← Back to Sea Service
          </button>
          <button onClick={() => window.print()} className="bg-harbor-900 text-paper text-sm px-4 py-2 rounded-sm hover:bg-harbor-800">
            Print certificate
          </button>
        </div>

        <div className="panel rounded-sm p-10">
          {/* Letterhead */}
          <div className="flex items-center gap-4 border-b-2 border-harbor-900 pb-5 mb-6">
            <img src="/logo.svg" alt="RSL logo" className="w-16 h-16" />
            <div>
              <p className="text-lg font-semibold text-harbor-900">RSL Shipboard Division Management</p>
              <p className="text-xs text-ink/50">Certificate of Sea Service</p>
            </div>
          </div>

          <h1 className="text-center text-lg font-semibold tracking-wide mb-8 uppercase">Certificate of Sea Service</h1>

          <p className="text-sm text-ink/80 mb-6 leading-relaxed">
            This is to certify that <strong>{cert.crew_name ?? "—"}</strong>
            {cert.nationality ? `, a ${cert.nationality} national,` : ","} holding Seaman's Book No.{" "}
            <strong>{cert.seaman_book_no ?? "—"}</strong>
            {cert.passport_no ? ` and Passport No. ${cert.passport_no}` : ""}, served on board the vessel{" "}
            <strong>{cert.vessel_name ?? "—"}</strong>
            {cert.vessel_imo ? ` (IMO ${cert.vessel_imo})` : ""}
            {cert.vessel_flag ? `, flying the flag of ${cert.vessel_flag}` : ""}
            {cert.vessel_type ? `, a ${cert.vessel_type},` : ","} in the capacity of{" "}
            <strong>{cert.position ?? "—"}</strong>.
          </p>

          <div className="grid grid-cols-2 gap-x-8 gap-y-3 text-sm mb-6 border-t border-b border-ink/10 py-5">
            <DetailRow label="Date of Joining" value={fmt(cert.date_of_joining)} />
            <DetailRow label="Date of Discharge" value={cert.date_of_discharge ? fmt(cert.date_of_discharge) : "Still serving"} />
            <DetailRow label="Vessel Type" value={cert.vessel_type} />
            <DetailRow label="Flag State" value={cert.vessel_flag} />
          </div>

          {cert.remarks && (
            <div className="mb-6">
              <p className="text-xs text-ink/40 mb-1">Remarks</p>
              <p className="text-sm text-ink/80">{cert.remarks}</p>
            </div>
          )}

          <p className="text-sm text-ink/80 mb-10">
            This certificate is issued at {cert.place_of_issue ?? "—"} on {fmt(cert.date_of_issue)} for whatever legal purpose it may serve.
          </p>

          {/* Signatories */}
          <div className="grid grid-cols-2 gap-12 mt-16">
            <div>
              <div className="border-b border-ink/40 h-16"></div>
              <p className="text-sm font-medium mt-2">{cert.issued_by_name || "\u00A0"}</p>
              <p className="text-xs text-ink/50">{cert.issued_by_title || "Authorized Signatory"}</p>
              <p className="text-xs text-ink/50">RSL Ship Management</p>
            </div>
            <div>
              <div className="border-b border-ink/40 h-16"></div>
              <p className="text-sm font-medium mt-2">{cert.crew_name || "\u00A0"}</p>
              <p className="text-xs text-ink/50">Seafarer</p>
            </div>
          </div>
        </div>
      </div>
    </AppShell>
  );
}

function DetailRow({ label, value }: { label: string; value: string | null }) {
  return (
    <div>
      <p className="text-xs text-ink/40">{label}</p>
      <p className="text-ink/80">{value || "—"}</p>
    </div>
  );
}
