const STYLES: Record<string, string> = {
  valid: "bg-signal-ok/10 text-signal-ok border-signal-ok/30",
  expiring_soon: "bg-signal-warn/10 text-signal-warn border-signal-warn/30",
  expired: "bg-signal-bad/10 text-signal-bad border-signal-bad/30",
  unknown: "bg-ink/5 text-ink/50 border-ink/15",
  onboard: "bg-signal-ok/10 text-signal-ok border-signal-ok/30",
  leave: "bg-ink/5 text-ink/50 border-ink/15",
  standby: "bg-brass-500/10 text-brass-500 border-brass-500/30",
  training: "bg-harbor-700/10 text-harbor-700 border-harbor-700/30",
  open: "bg-signal-bad/10 text-signal-bad border-signal-bad/30",
  in_progress: "bg-signal-warn/10 text-signal-warn border-signal-warn/30",
  completed: "bg-harbor-700/10 text-harbor-700 border-harbor-700/30",
  verified: "bg-signal-ok/10 text-signal-ok border-signal-ok/30",
  at_sea: "bg-harbor-700/10 text-harbor-700 border-harbor-700/30",
  in_port: "bg-signal-ok/10 text-signal-ok border-signal-ok/30",
  anchored: "bg-signal-warn/10 text-signal-warn border-signal-warn/30",
  dry_dock: "bg-signal-bad/10 text-signal-bad border-signal-bad/30",
};

const LABELS: Record<string, string> = {
  valid: "Valid",
  expiring_soon: "Expiring soon",
  expired: "Expired",
  unknown: "No date set",
  onboard: "On board",
  leave: "On leave",
  standby: "Standby",
  training: "Training",
  open: "Open",
  in_progress: "In progress",
  completed: "Completed",
  verified: "Verified",
  at_sea: "At sea",
  in_port: "In port",
  anchored: "Anchored",
  dry_dock: "Dry dock",
};

export default function StatusBadge({ status }: { status: string }) {
  const style = STYLES[status] ?? "bg-ink/5 text-ink/50 border-ink/15";
  const label = LABELS[status] ?? status;
  return (
    <span className={`inline-block text-xs px-2 py-0.5 rounded-full border ${style}`}>
      {label}
    </span>
  );
}
