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
type ShipOption = { id: string; name: string };

type Assignment = {
  id: string;
  ship_id: string;
  rank_on_assignment: string | null;
  sign_on_date: string | null;
  sign_off_date: string | null;
  ships: { name: string } | null;
};

export default function CrewProfilePage() {
  const params = useParams();
  const router = useRouter();
  const crewId = params.id as string;
  const supabase = createClient();

  const [crew, setCrew] = useState<Crew | null>(null);
  const [certs, setCerts] = useState<Cert[]>([]);
  const [typeOptions, setTypeOptions] = useState<TypeOption[]>([]);
  const [ships, setShips] = useState<ShipOption[]>([]);
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [showAssignForm, setShowAssignForm] = useState(false);
  const [savingAssignment, setSavingAssignment] = useState(false);
  const [assignForm, setAssignForm] = useState({
    ship_id: "",
    rank_on_assignment: "",
    sign_on_date: new Date().toISOString().slice(0, 10),
  });
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

    const { data: shipData } = await supabase.from("ships").select("id, name").order("name");
    setShips(shipData ?? []);

    const { data: assignmentData } = await supabase
      .from("crew_assignments")
      .select("id, ship_id, rank_on_assignment, sign_on_date, sign_off_date, ships(name)")
      .eq("crew_id", crewId)
      .order("sign_on_date", { ascending: false });
    setAssignments((assignmentData as any) ?? []);
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

  async function assignToVessel(e: React.FormEvent) {
    e.preventDefault();
    setSavingAssignment(true);

    // Close out any currently open assignment as of the new sign-on date
    const current = assignments.find((a) => !a.sign_off_date);
    if (current) {
      await supabase.from("crew_assignments").update({ sign_off_date: assignForm.sign_on_date }).eq("id", current.id);
    }

    const { error } = await supabase.from("crew_assignments").insert({
      crew_id: crewId,
      ship_id: assignForm.ship_id,
      rank_on_assignment: assignForm.rank_on_assignment || crew?.rank || null,
      sign_on_date: assignForm.sign_on_date,
    });
    setSavingAssignment(false);
    if (error) {
      alert(`Couldn't save this assignment: ${error.message}`);
      return;
    }
    setAssignForm({ ship_id: "", rank_on_assignment: "", sign_on_date: new Date().toISOString().slice(0, 10) });
    setShowAssignForm(false);
    load();
  }

  async function signOff(assignmentId: string) {
    const date = prompt("Sign-off date (YYYY-MM-DD):", new Date().toISOString().slice(0, 10));
    if (!date) return;
    const { error } = await supabase.from("crew_assignments").update({ sign_off_date: date }).eq("id", assignmentId);
    if (error) {
      alert(`Couldn't update sign-off date: ${error.message}`);
      return;
    }
    load();
  }

  const currentAssignment = assignments.find((a) => !a.sign_off_date);

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

          <div className="panel rounded-sm mb-6 print-hide">
            <div className="px-5 py-3 border-b border-ink/10 flex items-center justify-between">
              <h2 className="text-sm font-medium">Vessel Assignment</h2>
              <button onClick={() => setShowAssignForm(!showAssignForm)} className="text-xs text-harbor-700 hover:underline">
                {showAssignForm ? "Cancel" : "+ Assign to vessel"}
              </button>
            </div>

            <div className="px-5 py-4">
              {currentAssignment ? (
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs text-ink/40">Currently assigned to</p>
                    <p className="text-sm font-medium">
                      {currentAssignment.ships?.name ?? "—"}
                      {currentAssignment.rank_on_assignment ? ` · ${currentAssignment.rank_on_assignment}` : ""}
                    </p>
                    <p className="text-xs text-ink/50 mt-0.5">Signed on {currentAssignment.sign_on_date ?? "—"}</p>
                  </div>
                  <button onClick={() => signOff(currentAssignment.id)} className="text-xs text-ink/50 hover:text-signal-bad">
                    Sign off
                  </button>
                </div>
              ) : (
                <p className="text-sm text-ink/50">Not currently assigned to a vessel.</p>
              )}
            </div>

            {showAssignForm && (
              <form onSubmit={assignToVessel} className="p-4 border-t border-ink/10 grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs text-ink/60 mb-1">Vessel</label>
                  <select
                    required
                    value={assignForm.ship_id}
                    onChange={(e) => setAssignForm({ ...assignForm, ship_id: e.target.value })}
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
                <div>
                  <label className="block text-xs text-ink/60 mb-1">Rank for this assignment</label>
                  <input
                    value={assignForm.rank_on_assignment}
                    onChange={(e) => setAssignForm({ ...assignForm, rank_on_assignment: e.target.value })}
                    placeholder={crew.rank ?? "e.g. Able Seaman"}
                    className="w-full border border-ink/20 rounded-sm px-3 py-1.5 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs text-ink/60 mb-1">Sign-on date</label>
                  <input
                    type="date"
                    required
                    value={assignForm.sign_on_date}
                    onChange={(e) => setAssignForm({ ...assignForm, sign_on_date: e.target.value })}
                    className="w-full border border-ink/20 rounded-sm px-3 py-1.5 text-sm"
                  />
                </div>
                {currentAssignment && (
                  <p className="col-span-3 text-xs text-ink/40">
                    Assigning to a new vessel will automatically sign off the current assignment as of this date.
                  </p>
                )}
                <div className="col-span-3">
                  <button disabled={savingAssignment} className="bg-harbor-900 text-paper text-sm px-4 py-1.5 rounded-sm hover:bg-harbor-800 disabled:opacity-60">
                    {savingAssignment ? "Saving…" : "Save assignment"}
                  </button>
                </div>
              </form>
            )}

            {assignments.length > 0 && (
              <table className="log-table w-full">
                <thead>
                  <tr>
                    <th>Vessel</th>
                    <th>Rank</th>
                    <th>Signed On</th>
                    <th>Signed Off</th>
                  </tr>
                </thead>
                <tbody>
                  {assignments.map((a) => (
                    <tr key={a.id}>
                      <td className="font-medium">{a.ships?.name ?? "—"}</td>
                      <td className="text-ink/60">{a.rank_on_assignment ?? "—"}</td>
                      <td className="text-ink/60">{a.sign_on_date ?? "—"}</td>
                      <td className="text-ink/60">{a.sign_off_date ?? "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
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
