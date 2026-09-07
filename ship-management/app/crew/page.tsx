"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase-browser";
import AppShell from "@/components/AppShell";
import StatusBadge from "@/components/StatusBadge";

type Crew = {
  id: string;
  full_name: string;
  rank: string | null;
  nationality: string | null;
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

export default function CrewPage() {
  const supabase = createClient();
  const [crew, setCrew] = useState<Crew[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [form, setForm] = useState({
    full_name: "",
    rank: "",
    nationality: "",
    passport_no: "",
    seaman_book_no: "",
    phone: "",
    email: "",
    status: "standby",
  });

  const [expanded, setExpanded] = useState<string | null>(null);
  const [certsByCrewId, setCertsByCrewId] = useState<Record<string, Cert[]>>({});
  const [typeOptions, setTypeOptions] = useState<TypeOption[]>([]);
  const [showCertForm, setShowCertForm] = useState<string | null>(null);
  const [savingCert, setSavingCert] = useState(false);
  const [certForm, setCertForm] = useState({
    certificate_type_id: "",
    new_type_name: "",
    issue_date: "",
    expiry_date: "",
    file: null as File | null,
  });

  async function load() {
    const { data } = await supabase.from("crew").select("*").order("full_name");
    setCrew(data ?? []);
    const { data: typeData } = await supabase.from("certificate_types").select("id, name").order("name");
    setTypeOptions(typeData ?? []);
  }

  useEffect(() => {
    load();
  }, []);

  async function loadCerts(crewId: string) {
    const { data } = await supabase
      .from("crew_certifications_status")
      .select("id, issue_date, expiry_date, status, document_url, certificate_types(name)")
      .eq("crew_id", crewId)
      .order("expiry_date", { ascending: true });
    setCertsByCrewId((prev) => ({ ...prev, [crewId]: (data as any) ?? [] }));
  }

  function toggleExpand(crewId: string) {
    if (expanded === crewId) {
      setExpanded(null);
    } else {
      setExpanded(crewId);
      setShowCertForm(null);
      if (!certsByCrewId[crewId]) loadCerts(crewId);
    }
  }

  async function addCrew(e: React.FormEvent) {
    e.preventDefault();
    setUploading(true);

    let photoUrl: string | null = null;
    if (photoFile) {
      const path = `${Date.now()}_${photoFile.name}`;
      const { error: uploadError } = await supabase.storage.from("avatars").upload(path, photoFile);
      if (uploadError) {
        alert(`Couldn't upload photo: ${uploadError.message}`);
        setUploading(false);
        return;
      }
      const { data: publicUrl } = supabase.storage.from("avatars").getPublicUrl(path);
      photoUrl = publicUrl.publicUrl;
    }

    const { error } = await supabase.from("crew").insert({
      full_name: form.full_name,
      rank: form.rank || null,
      nationality: form.nationality || null,
      passport_no: form.passport_no || null,
      seaman_book_no: form.seaman_book_no || null,
      phone: form.phone || null,
      email: form.email || null,
      status: form.status,
      photo_url: photoUrl,
    });
    setUploading(false);
    if (error) {
      alert(`Couldn't save this crew member: ${error.message}`);
      return;
    }
    setForm({
      full_name: "",
      rank: "",
      nationality: "",
      passport_no: "",
      seaman_book_no: "",
      phone: "",
      email: "",
      status: "standby",
    });
    setPhotoFile(null);
    setShowForm(false);
    load();
  }

  async function updateStatus(id: string, status: string) {
    await supabase.from("crew").update({ status }).eq("id", id);
    load();
  }

  async function changePhoto(id: string, file: File) {
    const path = `${id}_${Date.now()}_${file.name}`;
    const { error: uploadError } = await supabase.storage.from("avatars").upload(path, file);
    if (uploadError) {
      alert(`Couldn't upload photo: ${uploadError.message}`);
      return;
    }
    const { data: publicUrl } = supabase.storage.from("avatars").getPublicUrl(path);
    await supabase.from("crew").update({ photo_url: publicUrl.publicUrl }).eq("id", id);
    load();
  }

  async function addCert(crewId: string, e: React.FormEvent) {
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
    setShowCertForm(null);
    loadCerts(crewId);
    load();
  }

  async function viewDocument(path: string) {
    const { data } = await supabase.storage.from("documents").createSignedUrl(path, 60 * 5);
    if (data?.signedUrl) window.open(data.signedUrl, "_blank");
  }

  return (
    <AppShell>
      <div className="p-8 max-w-6xl">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-xl font-semibold mb-1">Crew</h1>
            <p className="text-sm text-ink/60">Roster, status, and certificates. Click a name to view and add their certificates.</p>
          </div>
          <button
            onClick={() => setShowForm(!showForm)}
            className="bg-harbor-900 text-paper text-sm px-4 py-2 rounded-sm hover:bg-harbor-800"
          >
            {showForm ? "Cancel" : "Add crew member"}
          </button>
        </div>

        {showForm && (
          <form onSubmit={addCrew} className="panel rounded-sm p-5 mb-6 grid grid-cols-3 gap-4">
            <div className="col-span-3 flex items-center gap-4">
              <div className="w-16 h-16 rounded-full bg-ink/5 border border-ink/15 overflow-hidden flex items-center justify-center shrink-0">
                {photoFile ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={URL.createObjectURL(photoFile)} alt="" className="w-full h-full object-cover" />
                ) : (
                  <span className="text-xs text-ink/40">No photo</span>
                )}
              </div>
              <div>
                <label className="block text-xs text-ink/60 mb-1">Profile picture</label>
                <input type="file" accept="image/*" onChange={(e) => setPhotoFile(e.target.files?.[0] ?? null)} className="text-xs" />
              </div>
            </div>
            <Field label="Full name" value={form.full_name} onChange={(v) => setForm({ ...form, full_name: v })} required />
            <Field label="Rank" value={form.rank} onChange={(v) => setForm({ ...form, rank: v })} placeholder="e.g. Chief Engineer" />
            <Field label="Nationality" value={form.nationality} onChange={(v) => setForm({ ...form, nationality: v })} />
            <Field label="Passport no." value={form.passport_no} onChange={(v) => setForm({ ...form, passport_no: v })} />
            <Field label="Seaman's book no." value={form.seaman_book_no} onChange={(v) => setForm({ ...form, seaman_book_no: v })} />
            <Field label="Phone" value={form.phone} onChange={(v) => setForm({ ...form, phone: v })} />
            <Field label="Email" value={form.email} onChange={(v) => setForm({ ...form, email: v })} type="email" />
            <div className="col-span-3">
              <button disabled={uploading} className="bg-harbor-900 text-paper text-sm px-4 py-2 rounded-sm hover:bg-harbor-800 disabled:opacity-60">
                {uploading ? "Saving…" : "Save crew member"}
              </button>
            </div>
          </form>
        )}

        <div className="space-y-2">
                    {crew.map((c) => (
            <div key={c.id} className="panel rounded-sm overflow-hidden">
              <button onClick={() => toggleExpand(c.id)} className="w-full text-left px-4 py-3 flex items-center gap-4 hover:bg-paper/50">
                <label
                  onClick={(e) => e.stopPropagation()}
                  className="w-9 h-9 rounded-full bg-ink/5 border border-ink/15 overflow-hidden flex items-center justify-center cursor-pointer shrink-0"
                >
                  {c.photo_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={c.photo_url} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <span className="text-[10px] text-ink/40">{c.full_name?.[0]}</span>
                  )}
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => e.target.files?.[0] && changePhoto(c.id, e.target.files[0])}
                  />
                </label>

                <div className="flex-1 grid grid-cols-4 gap-4 items-center">
                  <p className="text-sm font-medium">{c.full_name}</p>
                  <p className="text-sm text-ink/60">{c.rank ?? "—"}</p>
                  <p className="text-sm text-ink/60">{c.nationality ?? "—"}</p>
                  <p className="text-sm text-ink/60">{c.phone || c.email || "—"}</p>
                </div>

                <select
                  value={c.status}
                  onChange={(e) => {
                    e.stopPropagation();
                    updateStatus(c.id, e.target.value);
                  }}
                  onClick={(e) => e.stopPropagation()}
                  className="text-xs border border-ink/15 rounded-sm px-1.5 py-1 bg-transparent shrink-0"
                >
                  <option value="onboard">On board</option>
                  <option value="leave">On leave</option>
                  <option value="standby">Standby</option>
                  <option value="training">Training</option>
                </select>

                <span className="text-xs text-ink/40 shrink-0">{expanded === c.id ? "▲" : "▼"}</span>
              </button>

              {expanded === c.id && (
                <div className="border-t border-ink/10 p-4">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-sm font-medium">Certificates</h3>
                    <div className="flex items-center gap-3">
                      <Link href={`/crew/${c.id}`} className="text-xs text-harbor-700 hover:underline">
                        Full profile / download PDF
                      </Link>
                      <button
                        onClick={() => setShowCertForm(showCertForm === c.id ? null : c.id)}
                        className="text-xs text-harbor-700 hover:underline"
                      >
                        {showCertForm === c.id ? "Cancel" : "+ Add certificate"}
                      </button>
                    </div>
                  </div>

                  {showCertForm === c.id && (
                    <form onSubmit={(e) => addCert(c.id, e)} className="grid grid-cols-2 gap-3 mb-4 bg-paper/60 p-4 rounded-sm border border-ink/10">
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
                        <th>File</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(certsByCrewId[c.id] ?? []).map((cert) => (
                        <tr key={cert.id}>
                          <td className="font-medium">{cert.certificate_types?.name ?? "—"}</td>
                          <td className="text-ink/60">{cert.issue_date ?? "—"}</td>
                          <td className="text-ink/60">{cert.expiry_date ?? "—"}</td>
                          <td>
                            <StatusBadge status={cert.status} />
                          </td>
                          <td>
                            {cert.document_url ? (
                              <button onClick={() => viewDocument(cert.document_url!)} className="text-xs text-harbor-700 hover:underline">
                                View
                              </button>
                            ) : (
                              <span className="text-xs text-ink/30">—</span>
                            )}
                          </td>
                        </tr>
                      ))}
                      {(certsByCrewId[c.id] ?? []).length === 0 && (
                        <tr>
                          <td colSpan={5} className="text-center text-ink/50 py-6">
                            No certificates on file yet.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          ))}
          {crew.length === 0 && (
            <div className="panel rounded-sm p-8 text-center text-ink/50 text-sm">
              No crew records yet — add your first one above.
            </div>
          )}
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
