import { useEffect, useMemo, useState } from "react";
import { Building2, CalendarClock, Download, MapPinned, Search, Star, X } from "lucide-react";

import { api } from "../services/api";
import type { ProviderCrmRecord, ProviderCrmStatus } from "../types/providerCrm";

const STATUSES: ProviderCrmStatus[] = [
  "prospect_only",
  "contacted",
  "loi_requested",
  "loi_sent",
  "negotiation",
  "loi_signed",
  "provider_approved",
  "rejected",
  "inactive",
  "public_marker_live",
];

const KANBAN = [
  { label: "Prospect", statuses: ["prospect_only"] },
  { label: "Contacted", statuses: ["contacted"] },
  { label: "LOI Sent", statuses: ["loi_requested", "loi_sent"] },
  { label: "Negotiation", statuses: ["negotiation", "loi_signed"] },
  { label: "Approved", statuses: ["provider_approved"] },
  { label: "Public Live", statuses: ["public_marker_live"] },
] as const;

const COMPLIANCE_NOTE =
  "Public listing creation requires provider approval or licensed/publicly permitted source confirmation.";

function label(value: string) {
  return value.replace(/_/g, " ");
}

function todayIso() {
  return new Date().toISOString();
}

function isOverdue(record: ProviderCrmRecord) {
  return !!record.next_followup_date && record.current_status !== "public_marker_live" && record.next_followup_date < new Date().toISOString().slice(0, 10);
}

export function AdminCRMPage() {
  const [records, setRecords] = useState<ProviderCrmRecord[]>([]);
  const [selected, setSelected] = useState<ProviderCrmRecord | null>(null);
  const [query, setQuery] = useState("");
  const [province, setProvince] = useState("all");
  const [status, setStatus] = useState("");
  const [loading, setLoading] = useState(true);

  const refresh = () => api.providerCrm().then(setRecords);

  useEffect(() => {
    refresh()
      .catch((error) => setStatus(error instanceof Error ? error.message : "CRM failed to load."))
      .finally(() => setLoading(false));
  }, []);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return records.filter((record) => {
      const matchesProvince = province === "all" || record.province === province;
      const matchesQuery =
        q === "" ||
        record.provider_name.toLowerCase().includes(q) ||
        record.city.toLowerCase().includes(q) ||
        record.province.toLowerCase().includes(q);
      return matchesProvince && matchesQuery;
    });
  }, [province, query, records]);

  const stats = useMemo(
    () => ({
      total: records.length,
      contacted: records.filter((r) => r.current_status === "contacted").length,
      loiRequested: records.filter((r) => r.current_status === "loi_requested" || r.current_status === "loi_sent").length,
      loiSigned: records.filter((r) => r.current_status === "loi_signed").length,
      approved: records.filter((r) => r.current_status === "provider_approved").length,
      live: records.filter((r) => r.current_status === "public_marker_live").length,
      rejected: records.filter((r) => r.current_status === "rejected").length,
    }),
    [records],
  );

  async function updateRecord(record: ProviderCrmRecord, changes: Partial<ProviderCrmRecord>) {
    const next = { ...record, ...changes };
    const updated = await api.updateProviderCrm(record.id, {
      provider_type: next.provider_type,
      provider_record_id: next.provider_record_id,
      provider_name: next.provider_name,
      province: next.province,
      city: next.city,
      current_status: next.current_status,
      assigned_to: next.assigned_to ?? "",
      priority: next.priority,
      outreach_channel: next.outreach_channel ?? null,
      outreach_note: next.outreach_note ?? "",
      next_followup_date: next.next_followup_date ?? null,
      loi_sent_at: next.loi_sent_at ?? null,
      loi_signed_at: next.loi_signed_at ?? null,
      provider_approved_at: next.provider_approved_at ?? null,
      public_listing_created_at: next.public_listing_created_at ?? null,
    });
    setRecords((items) => items.map((item) => (item.id === updated.id ? updated : item)));
    setSelected(updated);
  }

  async function quickStatus(record: ProviderCrmRecord, nextStatus: ProviderCrmStatus) {
    const dates: Partial<ProviderCrmRecord> = {};
    if (nextStatus === "loi_sent") dates.loi_sent_at = todayIso();
    if (nextStatus === "loi_signed") dates.loi_signed_at = todayIso();
    if (nextStatus === "provider_approved") dates.provider_approved_at = todayIso();
    await updateRecord(record, { current_status: nextStatus, ...dates });
  }

  async function createPublicMarker(record: ProviderCrmRecord) {
    const result = await api.createPublicListingFromCrm(record.id);
    setRecords((items) => items.map((item) => (item.id === result.crm.id ? result.crm : item)));
    setSelected(result.crm);
    setStatus(`Public marker created for ${result.crm.provider_name}.`);
  }

  function exportCsv() {
    const header = ["provider_name", "provider_type", "province", "city", "current_status", "assigned_to", "next_followup_date", "priority"];
    const rows = filtered.map((record) =>
      header.map((key) => JSON.stringify(String(record[key as keyof ProviderCrmRecord] ?? ""))).join(","),
    );
    const blob = new Blob([[header.join(","), ...rows].join("\n")], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "goombi-provider-crm-export.csv";
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <>
      <nav className="fixed left-1/2 top-4 z-30 flex -translate-x-1/2 items-center gap-1 rounded-lg border border-white/70 bg-white/95 p-1 shadow-panel backdrop-blur">
        <a className="nav-link" href="/" title="Map discovery"><MapPinned className="h-4 w-4" />Map</a>
        <a className="nav-link" href="/admin" title="Admin listings"><Building2 className="h-4 w-4" />Admin</a>
        <a className="nav-link nav-link-active" href="/admin/crm" title="Provider CRM">CRM</a>
      </nav>
      <main className="min-h-screen bg-[#e7f1ec] px-4 pb-10 pt-24 text-slate-950 lg:px-8">
        <section className="mx-auto max-w-7xl">
          <div className="rounded-lg border border-emerald-100 bg-white p-5 shadow-panel">
            <p className="text-xs font-bold uppercase text-emerald-700">Provider Outreach CRM</p>
            <div className="mt-2 flex flex-wrap items-end justify-between gap-3">
              <div>
                <h1 className="text-3xl font-semibold">Provider Conversion Workflow</h1>
                <p className="mt-2 text-sm text-slate-600">{COMPLIANCE_NOTE}</p>
              </div>
              <button className="secondary-button" type="button" onClick={exportCsv}>
                <Download className="h-4 w-4" />Export CSV
              </button>
            </div>
          </div>

          <div className="mt-5 grid gap-3 md:grid-cols-4 xl:grid-cols-7">
            {[
              ["Total prospects", stats.total],
              ["Contacted", stats.contacted],
              ["LOIs requested", stats.loiRequested],
              ["LOIs signed", stats.loiSigned],
              ["Approved", stats.approved],
              ["Public markers live", stats.live],
              ["Rejected", stats.rejected],
            ].map(([name, value]) => (
              <div className="rounded-lg border border-emerald-100 bg-white p-4 shadow-panel" key={name}>
                <p className="text-xs font-bold uppercase text-slate-500">{name}</p>
                <p className="mt-2 text-2xl font-semibold">{value}</p>
              </div>
            ))}
          </div>

          <div className="mt-5 rounded-lg border border-emerald-100 bg-white p-4 shadow-panel">
            <div className="flex flex-wrap gap-3">
              <label className="label flex-1">Search
                <div className="relative">
                  <Search className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                  <input className="field pl-9" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Provider, suburb, city" />
                </div>
              </label>
              <label className="label w-56">Province
                <select className="field" value={province} onChange={(event) => setProvince(event.target.value)}>
                  <option value="all">All provinces</option>
                  <option value="Gauteng">Gauteng</option>
                  <option value="Western Cape">Western Cape</option>
                  <option value="KwaZulu-Natal">KwaZulu-Natal</option>
                </select>
              </label>
            </div>
          </div>

          <section className="mt-5 grid gap-3 xl:grid-cols-6">
            {KANBAN.map((column) => {
              const items = filtered.filter((record) => column.statuses.includes(record.current_status as never));
              return (
                <div className="min-h-48 rounded-lg border border-slate-200 bg-white p-3 shadow-panel" key={column.label}>
                  <div className="flex items-center justify-between">
                    <h2 className="font-semibold">{column.label}</h2>
                    <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-bold">{items.length}</span>
                  </div>
                  <div className="mt-3 grid gap-2">
                    {items.slice(0, 6).map((record) => (
                      <button className="rounded-md border border-slate-200 p-2 text-left text-sm hover:bg-slate-50" key={record.id} type="button" onClick={() => setSelected(record)}>
                        <span className="font-semibold">{record.provider_name}</span>
                        <span className="mt-1 block text-xs text-slate-500">{record.provider_type} · {record.city}</span>
                      </button>
                    ))}
                  </div>
                </div>
              );
            })}
          </section>

          <section className="mt-5 overflow-hidden rounded-lg border border-emerald-100 bg-white shadow-panel">
            <div className="border-b border-slate-200 p-5">
              <h2 className="text-2xl font-semibold">CRM Table</h2>
              {status && <p className="mt-2 rounded-md bg-emerald-50 p-2 text-sm text-emerald-900">{status}</p>}
            </div>
            {loading ? <p className="p-5 text-sm text-slate-600">Loading CRM...</p> : (
              <div className="overflow-auto">
                <table className="min-w-full text-left text-sm">
                  <thead className="bg-slate-50 text-xs font-bold uppercase text-slate-600">
                    <tr>
                      <th className="p-3">Provider name</th>
                      <th className="p-3">Type</th>
                      <th className="p-3">Province</th>
                      <th className="p-3">Status</th>
                      <th className="p-3">Assigned to</th>
                      <th className="p-3">Next follow-up</th>
                      <th className="p-3">Priority</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.slice(0, 120).map((record) => (
                      <tr className={`cursor-pointer border-t border-slate-100 ${isOverdue(record) ? "bg-rose-50" : ""}`} key={record.id} onClick={() => setSelected(record)}>
                        <td className="p-3 font-semibold">{record.provider_name}</td>
                        <td className="p-3">{record.provider_type}</td>
                        <td className="p-3">{record.province}</td>
                        <td className="p-3">{label(record.current_status)}</td>
                        <td className="p-3">{record.assigned_to || "-"}</td>
                        <td className="p-3">{record.next_followup_date || "-"}{isOverdue(record) && <span className="ml-2 text-xs font-bold text-rose-700">Overdue</span>}</td>
                        <td className="p-3">{record.priority === "strategic" && <Star className="mr-1 inline h-4 w-4 fill-amber-400 text-amber-500" />}{record.priority}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        </section>
      </main>
      {selected && (
        <aside className="fixed inset-y-0 right-0 z-50 w-full max-w-xl overflow-y-auto border-l border-slate-200 bg-white p-5 shadow-2xl">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-xs font-bold uppercase text-emerald-700">Provider detail</p>
              <h2 className="mt-1 text-2xl font-semibold">{selected.provider_name}</h2>
              <p className="mt-1 text-sm text-slate-500">{selected.provider_type} · {selected.city}, {selected.province}</p>
            </div>
            <button aria-label="Close CRM detail" className="secondary-button h-9 w-9 p-0" type="button" onClick={() => setSelected(null)}><X className="h-4 w-4" /></button>
          </div>
          <div className="mt-4 grid gap-3 text-sm">
            <label className="label">Workflow status
              <select className="field" value={selected.current_status} onChange={(event) => quickStatus(selected, event.target.value as ProviderCrmStatus)}>
                {STATUSES.map((item) => <option key={item} value={item}>{label(item)}</option>)}
              </select>
            </label>
            <label className="label">Assigned to<input className="field" value={selected.assigned_to ?? ""} onChange={(event) => updateRecord(selected, { assigned_to: event.target.value })} /></label>
            <label className="label">Next follow-up<input className="field" type="date" value={selected.next_followup_date ?? ""} onChange={(event) => updateRecord(selected, { next_followup_date: event.target.value })} /></label>
            <label className="label">Notes<textarea className="field min-h-24" value={selected.outreach_note ?? ""} onChange={(event) => updateRecord(selected, { outreach_note: event.target.value })} /></label>
          </div>
          <div className="mt-4 grid grid-cols-2 gap-2">
            <button className="secondary-button" type="button" onClick={() => quickStatus(selected, "contacted")}>Mark contacted</button>
            <button className="secondary-button" type="button" onClick={() => quickStatus(selected, "loi_sent")}>Send LOI</button>
            <button className="secondary-button" type="button" onClick={() => quickStatus(selected, "loi_signed")}>Mark LOI signed</button>
            <button className="secondary-button" type="button" onClick={() => quickStatus(selected, "provider_approved")}>Approve provider</button>
          </div>
          <button className="primary-button mt-3 w-full justify-center" disabled={selected.current_status !== "provider_approved"} type="button" onClick={() => createPublicMarker(selected)}>
            Create Public Listing
          </button>
          <div className="mt-5 rounded-lg border border-slate-200 p-4">
            <h3 className="font-semibold">Activity timeline</h3>
            <ul className="mt-3 grid gap-2 text-sm text-slate-600">
              <li><CalendarClock className="mr-2 inline h-4 w-4" />WhatsApp sent / outreach logged via {selected.outreach_channel ?? "pending channel"}</li>
              {selected.loi_sent_at && <li>LOI emailed: {selected.loi_sent_at.slice(0, 10)}</li>}
              {selected.loi_signed_at && <li>LOI signed: {selected.loi_signed_at.slice(0, 10)}</li>}
              {selected.provider_approved_at && <li>Provider approved: {selected.provider_approved_at.slice(0, 10)}</li>}
              {selected.public_listing_created_at && <li>Public marker live: {selected.public_listing_created_at.slice(0, 10)}</li>}
              <li>Provider requested pricing / follow-up note: {selected.outreach_note || "No notes yet."}</li>
            </ul>
          </div>
        </aside>
      )}
    </>
  );
}
