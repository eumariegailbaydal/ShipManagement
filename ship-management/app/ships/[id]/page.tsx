"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase-browser";
import AppShell from "@/components/AppShell";

type Ship = {
  id: string;
  name: string;
  imo_number: string | null;
  type: string | null;
  flag: string | null;
  year_built: number | null;
  photo_url: string | null;
};

// Every particulars field, grouped into the 8 sections. Key = DB column name.
const SECTIONS: { title: string; fields: { key: string; label: string }[] }[] = [
  {
    title: "General Vessel Information",
    fields: [
      { key: "official_number", label: "Official Number" },
      { key: "call_sign", label: "Call Sign" },
      { key: "port_of_registry", label: "Port of Registry" },
      { key: "classification_society", label: "Classification Society" },
      { key: "class_notation", label: "Class Notation" },
      { key: "place_of_build", label: "Place of Build" },
      { key: "builder_shipyard", label: "Builder / Shipyard" },
      { key: "former_names", label: "Former Names" },
      { key: "vessel_status", label: "Vessel Status" },
    ],
  },
  {
    title: "Dimensions & Tonnage",
    fields: [
      { key: "loa", label: "Length Overall (LOA)" },
      { key: "lbp", label: "Length Between Perpendiculars (LBP)" },
      { key: "breadth", label: "Breadth / Beam" },
      { key: "depth", label: "Depth" },
      { key: "design_draft", label: "Design Draft" },
      { key: "maximum_draft", label: "Maximum Draft" },
      { key: "gross_tonnage", label: "Gross Tonnage (GT)" },
      { key: "net_tonnage", label: "Net Tonnage (NT)" },
      { key: "deadweight", label: "Deadweight (DWT)" },
      { key: "lightship_weight", label: "Lightship Weight" },
      { key: "displacement", label: "Displacement" },
    ],
  },
  {
    title: "Capacity & Cargo Information",
    fields: [
      { key: "cargo_type", label: "Cargo Type" },
      { key: "cargo_capacity", label: "Cargo Capacity" },
      { key: "cargo_hold_tank_capacity", label: "Cargo Hold/Tank Capacity" },
      { key: "number_of_holds_tanks", label: "Number of Cargo Holds/Tanks" },
      { key: "teu_capacity", label: "TEU Capacity (if applicable)" },
      { key: "reefer_capacity", label: "Reefer Capacity" },
      { key: "fuel_tank_capacity", label: "Fuel Tank Capacity" },
      { key: "fresh_water_capacity", label: "Fresh Water Capacity" },
      { key: "ballast_water_capacity", label: "Ballast Water Capacity" },
    ],
  },
  {
    title: "Main Engine / Propulsion",
    fields: [
      { key: "main_engine_maker", label: "Main Engine Maker" },
      { key: "main_engine_model", label: "Main Engine Model" },
      { key: "engine_type", label: "Engine Type" },
      { key: "number_of_engines", label: "Number of Engines" },
      { key: "mcr", label: "MCR" },
      { key: "rated_power", label: "Rated Power (kW/HP)" },
      { key: "rated_rpm", label: "Rated RPM" },
      { key: "propeller_type", label: "Propeller Type" },
      { key: "number_of_propellers", label: "Number of Propellers" },
      { key: "service_speed", label: "Service Speed" },
      { key: "maximum_speed", label: "Maximum Speed" },
      { key: "fuel_type", label: "Fuel Type" },
    ],
  },
  {
    title: "Auxiliary Machinery",
    fields: [
      { key: "aux_engine_1", label: "Auxiliary Engine 1" },
      { key: "aux_engine_2", label: "Auxiliary Engine 2" },
      { key: "aux_engine_3", label: "Auxiliary Engine 3" },
      { key: "generator_capacity", label: "Generator Capacity" },
      { key: "emergency_generator", label: "Emergency Generator" },
      { key: "boiler", label: "Boiler" },
      { key: "exhaust_gas_boiler", label: "Exhaust Gas Boiler/Economizer" },
      { key: "air_compressors", label: "Air Compressors" },
      { key: "fresh_water_generator", label: "Fresh Water Generator" },
      { key: "sewage_treatment_plant", label: "Sewage Treatment Plant" },
      { key: "oily_water_separator", label: "Oily Water Separator" },
    ],
  },
  {
    title: "Navigation & Communication Equipment",
    fields: [
      { key: "radar", label: "Radar" },
      { key: "ecdis", label: "ECDIS" },
      { key: "gps_gnss", label: "GPS/GNSS" },
      { key: "ais", label: "AIS" },
      { key: "gyro_compass", label: "Gyro Compass" },
      { key: "magnetic_compass", label: "Magnetic Compass" },
      { key: "echo_sounder", label: "Echo Sounder" },
      { key: "speed_log", label: "Speed Log" },
      { key: "gmdss_equipment", label: "GMDSS Equipment" },
      { key: "vhf", label: "VHF" },
      { key: "mf_hf", label: "MF/HF" },
      { key: "satellite_comm", label: "Inmarsat/Satellite Communication" },
      { key: "epirb", label: "EPIRB" },
      { key: "sart", label: "SART" },
    ],
  },
  {
    title: "Safety & Life-Saving Equipment",
    fields: [
      { key: "lifeboats", label: "Lifeboats" },
      { key: "rescue_boat", label: "Rescue Boat" },
      { key: "liferafts", label: "Liferafts" },
      { key: "life_jackets", label: "Life Jackets" },
      { key: "immersion_suits", label: "Immersion Suits" },
      { key: "epirbs", label: "EPIRBs" },
      { key: "sarts", label: "SARTs" },
      { key: "fire_extinguishers", label: "Fire Extinguishers" },
      { key: "fire_detection_system", label: "Fire Detection System" },
      { key: "fixed_firefighting_system", label: "Fixed Fire-Fighting System" },
      { key: "emergency_fire_pump", label: "Emergency Fire Pump" },
      { key: "firemans_equipment", label: "Fireman's Equipment" },
    ],
  },
  {
    title: "Crew & Accommodation",
    fields: [
      { key: "max_persons_on_board", label: "Maximum Persons On Board" },
      { key: "safe_manning_requirement", label: "Safe Manning Requirement" },
      { key: "crew_capacity", label: "Crew Capacity" },
      { key: "officer_capacity", label: "Officer Capacity" },
      { key: "rating_capacity", label: "Rating Capacity" },
      { key: "cabin_room_count", label: "Cabin/Room Count" },
      { key: "mess_room", label: "Mess Room" },
      { key: "galley", label: "Galley" },
      { key: "hospital_sick_bay", label: "Hospital/Sick Bay" },
      { key: "recreation_facilities", label: "Recreation Facilities" },
    ],
  },
];

export default function ShipDetailPage() {
  const params = useParams();
  const router = useRouter();
  const shipId = params.id as string;
  const supabase = createClient();

  const [ship, setShip] = useState<Ship | null>(null);
  const [particulars, setParticulars] = useState<Record<string, string>>({});
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);

  async function load() {
    const { data: shipData } = await supabase.from("ships").select("*").eq("id", shipId).single();
    setShip(shipData);

    const { data: particularsData } = await supabase.from("ship_particulars").select("*").eq("ship_id", shipId).maybeSingle();
    setParticulars(particularsData ?? {});
  }

  useEffect(() => {
    if (shipId) load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [shipId]);

  function setField(key: string, value: string) {
    setParticulars((p) => ({ ...p, [key]: value }));
  }

  async function save() {
    setSaving(true);
    const payload: Record<string, any> = { ship_id: shipId, updated_at: new Date().toISOString() };
    SECTIONS.forEach((s) => s.fields.forEach((f) => (payload[f.key] = particulars[f.key] || null)));

    const { error } = await supabase.from("ship_particulars").upsert(payload, { onConflict: "ship_id" });
    setSaving(false);
    if (error) {
      alert(`Couldn't save particulars: ${error.message}`);
      return;
    }
    setEditing(false);
    load();
  }

  if (!ship) {
    return (
      <AppShell>
        <div className="p-8 text-sm text-ink/50">Loading…</div>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <div className="p-8 max-w-5xl">
        <button onClick={() => router.push("/ships")} className="text-xs text-harbor-700 hover:underline mb-4">
          ← Back to Ships
        </button>

        <div className="panel rounded-sm p-6 mb-6 flex items-center gap-5">
          <div className="w-20 h-20 rounded-sm bg-ink/5 border border-ink/15 overflow-hidden flex items-center justify-center shrink-0">
            {ship.photo_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={ship.photo_url} alt="" className="w-full h-full object-cover" />
            ) : (
              <span className="text-xs text-ink/40">No photo</span>
            )}
          </div>
          <div className="flex-1">
            <h1 className="text-xl font-semibold">{ship.name}</h1>
            <p className="text-sm text-ink/60 mt-0.5">
              {ship.type ?? "Type not set"} · IMO {ship.imo_number ?? "—"} · Flag {ship.flag ?? "—"} · Built {ship.year_built ?? "—"}
            </p>
          </div>
          <button
            onClick={() => (editing ? save() : setEditing(true))}
            disabled={saving}
            className="bg-harbor-900 text-paper text-sm px-4 py-2 rounded-sm hover:bg-harbor-800 disabled:opacity-60 shrink-0"
          >
            {saving ? "Saving…" : editing ? "Save particulars" : "Edit particulars"}
          </button>
        </div>

        <div className="space-y-6">
          {SECTIONS.map((section) => (
            <div key={section.title} className="panel rounded-sm">
              <div className="px-5 py-3 border-b border-ink/10">
                <h2 className="text-sm font-medium">{section.title}</h2>
              </div>
              <div className="p-5 grid grid-cols-3 gap-4">
                {section.fields.map((f) => (
                  <div key={f.key}>
                    <label className="block text-xs text-ink/60 mb-1">{f.label}</label>
                    {editing ? (
                      <input
                        value={particulars[f.key] ?? ""}
                        onChange={(e) => setField(f.key, e.target.value)}
                        className="w-full border border-ink/20 rounded-sm px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-harbor-700"
                      />
                    ) : (
                      <p className="text-sm text-ink/80">{particulars[f.key] || "—"}</p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </AppShell>
  );
}
