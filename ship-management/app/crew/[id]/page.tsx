"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase-browser";
import AppShell from "@/components/AppShell";
import StatusBadge from "@/components/StatusBadge";

type Crew = {
  id: string;
  full_name: string;
  rank: string | null;
  nationality: string | null;
  passport_no: string | null;
  seaman_book_no: string | null;
  phone: string | null;
  email: string | null;
  status: string;
  photo_url: string | null;
};

type Cert = {
  id: string;
  issue_date: string | null;
  expiry_date: string | null;
  status: string;
  document_url: string | null;
  certificate_types: { name: string } | null;
};

type TypeOption = { id: string; name: string };

export default function CrewProfilePage() {
  const params = useParams();
  const router = useRouter();
  const crewId = params.id as string;
  const supabase = createClient();

  const [crew, setCrew] = useState<Crew | null>(null);
  const [certs, setCerts] = useState<Cert[]>([]);
  const [typeOptions, setTypeOptions] = useState<TypeOption[]>([]);
  const [showCertForm, setShowCertForm] = useState(false);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [savingCert, setSavingCert] = useState(false);

  const [certForm, setCertForm] = useState({
    certificate_type_id: "",
    new_type_name: "",
    issue_date: "",
    expiry_date: "",
    file: null as File | null,
  });

  async function load() {
    const { data: crewData } = await supabase.from("crew").select("*").eq("id", crewId).single();
    setCrew(crewData);

    const { data: certData } = await supabase
      .from("crew_certifications_status")
      .select("id, issue_date, expiry_date, status, document_url, certificate_types(name)")
      .eq("crew_id", crewId)
      .order("expiry_date", { ascending: true });
    setCerts((certData as any) ?? []);

    const { data: typeData } = await supabase.from("certificate_types").select("id, name").order("name");
    setTypeOptions(typeData ?? []);
  }

  useEffect(() => {
    if (crewId) load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [crewId]);

  async function changePhoto(file: File) {
    setUploadingPhoto(true);
    const path = `${crewId}_${Date.now()}_${file.name}`;
    const { error: uploadError } = await supabase.storage.from("avatars").upload(path, file);
    if (uploadError) {
      alert(`Couldn't upload photo: ${uploadError.message}`);
      setUploadingPhoto(false);
      return;
    }
    const { data: publicUrl } = supabase.storage.from("avatars").getPublicUrl(path);
    await supabase.from("crew").update({ photo_url: publicUrl.publicUrl }).eq("id", crewId);
    setUploadingPhoto(false);
    load();
  }

  async function addCert(e: React.FormEvent) {
    e.preventDefault();
    setSavingCert(true);

    let certTypeId = certForm.certificate_type_id;
    if (!certTypeId && certForm.new_type_name) {
      const { data: newType } = await supabase.from("certificate_types").insert({ name: certForm.new_type_name }).select().single();
      certTypeId = newType?.id;
    }
    if (!certTypeId) {
      setSavingCert(false);
      return;
    }

    let documentUrl: string | null = null;
    if (certForm.file) {
      const path = `certificates/${crewId}/${Date.now()}_${certForm.file.name}`;
      const { error: uploadError } = await supabase.storage.from("documents").upload(path, certForm.file);
      if (uploadError) {
        alert(`Couldn't upload the certificate file: ${uploadError.message}`);
        setSavingCert(false);
        return;
      }
      documentUrl = path;
    }

    const { error } = await supabase.from("crew_certifications").insert({
      crew_id: crewId,
      certificate_type_id: certTypeId,
      issue_date: certForm.issue_date || null,
      expiry_date: certForm.expiry_date || null,
      document_url: documentUrl,
    });
    setSavingCert(false);
    if (error) {
      alert(`Couldn't save this certificate: ${error.message}`);
      return;
    }
    setCertForm({ certificate_type_id: "", new_type_name: "", issue_date: "", expiry_date: "", file: null });
    setShowCertForm(false);
    load();
  }

  async function viewDocument(path: string) {
    const { data } = await supabase.storage.from("documents").createSignedUrl(path, 60 * 5);
    if (data?.signedUrl) window.open(data.signedUrl, "_blank");
  }

  if (!crew) {
    return (
      <AppShell>
        <div className="p-8 text-sm text-ink/50">Loading…</div>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <div className="p-8 max-w-4xl">
        <button onClick={() => router.push("/crew")} className="text-xs text-harbor-700 hover:underline mb-4">
          ← Back to Crew
        </button>

        <div id="crew-profile-printable">
          <div className="panel rounded-sm p-6 mb-6 flex items-start gap-6">
            <div className="relative shrink-0">
              <div className="w-28 h-28 rounded-full bg-ink/5 border border-ink/15 overflow-hidden flex items-center justify-center">
                {crew.photo_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={crew.photo_url} alt="" className="w-full h-full object-cover" />
                ) : (
                  <span className="text-2xl text-ink/30">{crew.full_name?.[0]}</span>
                )}
              </div>
              <label className="print-hide block mt-2 text-center">
                <span className="text-xs text-harbor-700 hover:underline cursor-pointer">
                  {uploadingPhoto ? "Uploading…" : "Change photo"}
                </span>
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => e.target.files?.[0] && changePhoto(e.target.files[0])}
                />
              </label>
            </div>

            <div className="flex-1">
              <div className="flex items-center gap-3 mb-1">
                <h1 className="text-xl font-semibold">{crew.full_name}</h1>
                <StatusBadge status={crew.status} />
              </div>
              <p className="text-sm text-ink/60 mb-4">{crew.rank ?? "Rank not set"}</p>

              <div className="grid grid-cols-2 gap-x-8 gap-y-2 text-sm">
                <DetailRow label="Nationality" value={crew.nationality} />
                <DetailRow label="Passport No." value={crew.passport_no} />
                <DetailRow label="Seaman's Book No." value={crew.seaman_book_no} />
                <DetailRow label="Phone" value={crew.phone} />
                <DetailRow label="Email" value={crew.email} />
              </div>
            </div>
          </div>

          <div className="panel rounded-sm">
            <div className="px-5 py-3 border-b border-ink/10 flex items-center justify-between print-hide">
              <h2 className="text-sm font-medium">Certificates</h2>
              <button onClick={() => setShowCertForm(!showCertForm)} className="text-xs text-harbor-700 hover:underline">
                {showCertForm ? "Cancel" : "+ Add certificate"}
              </button>
            </div>
            <h2 className="hidden print-show text-sm font-medium px-5 pt-4">Certificates</h2>

            {showCertForm && (
              <form onSubmit={addCert} className="p-4 border-b border-ink/10 grid grid-cols-2 gap-3 print-hide">
                <div>
                  <label className="block text-xs text-ink/60 mb-1">Certificate type</label>
                  <select
                    value={certForm.certificate_type_id}
                    onChange={(e) => setCertForm({ ...certForm, certificate_type_id: e.target.value })}
                    className="w-full border border-ink/20 rounded-sm px-3 py-1.5 text-sm"
                  >
                    <option value="">New type…</option>
                    {typeOptions.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.name}
                      </option>
                    ))}
                  </select>
                </div>
                {!certForm.certificate_type_id && (
                  <div>
                    <label className="block text-xs text-ink/60 mb-1">New certificate type name</label>
                    <input
                      value={certForm.new_type_name}
                      onChange={(e) => setCertForm({ ...certForm, new_type_name: e.target.value })}
                      placeholder="e.g. STCW Basic Safety"
                      className="w-full border border-ink/20 rounded-sm px-3 py-1.5 text-sm"
                    />
                  </div>
                )}
                <div>
                  <label className="block text-xs text-ink/60 mb-1">Issue date</label>
                  <input
                    type="date"
                    value={certForm.issue_date}
                    onChange={(e) => setCertForm({ ...certForm, issue_date: e.target.value })}
                    className="w-full border border-ink/20 rounded-sm px-3 py-1.5 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs text-ink/60 mb-1">Expiry date</label>
                  <input
                    type="date"
                    value={certForm.expiry_date}
                    onChange={(e) => setCertForm({ ...certForm, expiry_date: e.target.value })}
                    className="w-full border border-ink/20 rounded-sm px-3 py-1.5 text-sm"
                  />
                </div>
                <div className="col-span-2">
                  <label className="block text-xs text-ink/60 mb-1">Attach file (scan/photo of certificate)</label>
                  <input
                    type="file"
                    accept="image/*,.pdf"
                    onChange={(e) => setCertForm({ ...certForm, file: e.target.files?.[0] ?? null })}
                    className="text-xs"
                  />
                </div>
                <div className="col-span-2">
                  <button disabled={savingCert} className="bg-harbor-900 text-paper text-sm px-4 py-1.5 rounded-sm hover:bg-harbor-800 disabled:opacity-60">
                    {savingCert ? "Saving…" : "Save certificate"}
                  </button>
                </div>
              </form>
            )}

            <table className="log-table w-full">
              <thead>
                <tr>
                  <th>Certificate</th>
                  <th>Issued</th>
                  <th>Expires</th>
                  <th>Status</th>
                  <th className="print-hide">File</th>
                </tr>
              </thead>
              <tbody>
                {certs.map((c) => (
                  <tr key={c.id}>
                    <td className="font-medium">{c.certificate_types?.name ?? "—"}</td>
                    <td className="text-ink/60">{c.issue_date ?? "—"}</td>
                    <td className="text-ink/60">{c.expiry_date ?? "—"}</td>
                    <td>
                      <StatusBadge status={c.status} />
                    </td>
                    <td className="print-hide">
                      {c.document_url ? (
                        <button onClick={() => viewDocument(c.document_url!)} className="text-xs text-harbor-700 hover:underline">
                          View
                        </button>
                      ) : (
                        <span className="text-xs text-ink/30">—</span>
                      )}
                    </td>
                  </tr>
                ))}
                {certs.length === 0 && (
                  <tr>
                    <td colSpan={5} className="text-center text-ink/50 py-8">
                      No certificates on file yet.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        <button
          onClick={() => window.print()}
          className="print-hide mt-6 bg-harbor-900 text-paper text-sm px-4 py-2 rounded-sm hover:bg-harbor-800"
        >
          Download PDF profile
        </button>
        <p className="print-hide text-xs text-ink/50 mt-2">
          This opens your browser's print dialog — choose "Save as PDF" as the destination to download it.
        </p>
      </div>

      <style jsx global>{`
        @media print {
          .print-hide {
            display: none !important;
          }
          .print-show {
            display: block !important;
          }
          aside {
            display: none !important;
          }
          body {
            background: white !important;
          }
        }
      `}</style>
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
