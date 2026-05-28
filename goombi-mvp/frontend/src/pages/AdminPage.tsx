import { ChangeEvent, FormEvent, useEffect, useMemo, useState } from "react";
import { Building2, FileUp, MapPinned, Pencil, Plus, Trash2, Utensils } from "lucide-react";
import Papa from "papaparse";

import { api } from "../services/api";
import {
  ALL_LISTING_TYPES,
  ALL_PARTNER_STATUSES,
  displayCategory,
  getListingType,
  isWorkspace,
  type Enquiry,
  type Listing,
  type ListingDraft,
  type ListingType,
} from "../types/listing";
import type { RestaurantProspect } from "../types/restaurantProspect";

const LAYER_LABELS: Record<ListingType, string> = {
  accommodation: "Stays",
  workspace: "Workspace",
  tourism_experience: "Experiences",
  restaurant: "Eats",
  transport_node: "Transport",
  estate_living_zone: "Estates",
  event_space: "Events",
};

const emptyDraft: ListingDraft = {
  name: "",
  category: "guesthouse",
  listing_type: "accommodation",
  partner_status: "seed",
  featured: false,
  province: "Gauteng",
  city: "Johannesburg",
  suburb: "",
  address: "Demo coordinate and address",
  latitude: -26.083,
  longitude: 28.022,
  price_per_night: 900,
  max_guests: 2,
  rooms: 1,
  description: "Synthetic manually uploaded Goombi demo listing.",
  short_description: "",
  long_description: "",
  amenities: ["WiFi"],
  photos: [],
  images: [],
  tags: [],
  owner_name: "Manual Demo Owner",
  owner_phone: "+27110000000",
  contact_email: "",
  contact_phone: "",
  website_url: "",
  whatsapp_url: "",
  provider_name: "",
  provider_type: "",
  workspace_type: "serviced_office",
  pricing_status: "not_publicly_available",
  price_amount: null,
  price_unit: "",
  price_from: null,
  price_to: null,
  capacity: null,
  cuisine_tags: [],
  price_band_goombi: "",
  description_goombi: "",
  booking_url: "",
  source_url: "",
  source_note: "",
  estate_type: "",
  lifestyle_summary: "",
  long_stay_relevant: false,
  verified_status: false,
  source_type: "manual_seed",
};

function draftFromListing(listing: Listing): ListingDraft {
  const { id, created_at, updated_at, ...draft } = listing;
  return draft;
}

function coerceDraft(row: Record<string, unknown>): ListingDraft {
  const amenities = typeof row.amenities === "string" ? row.amenities.split("|").filter(Boolean) : row.amenities;
  const photos = typeof row.photos === "string" ? row.photos.split("|").filter(Boolean) : row.photos;
  const images = typeof row.images === "string" ? row.images.split("|").filter(Boolean) : row.images;
  const tags = typeof row.tags === "string" ? row.tags.split("|").filter(Boolean) : row.tags;
  return {
    ...emptyDraft,
    ...row,
    category:
      row.category === "workspace"
        ? "workspace"
        : row.category === "restaurant"
          ? "restaurant"
        : row.category === "bnb" || row.category === "guesthouse"
          ? row.category
          : "accommodation",
    listing_type: ALL_LISTING_TYPES.includes(row.listing_type as never)
      ? (row.listing_type as ListingDraft["listing_type"])
      : "accommodation",
    partner_status: ALL_PARTNER_STATUSES.includes(row.partner_status as never)
      ? (row.partner_status as ListingDraft["partner_status"])
      : "seed",
    latitude: Number(row.latitude ?? emptyDraft.latitude),
    longitude: Number(row.longitude ?? emptyDraft.longitude),
    price_per_night: Number(row.price_per_night ?? emptyDraft.price_per_night),
    max_guests: Number(row.max_guests ?? emptyDraft.max_guests),
    rooms: Number(row.rooms ?? emptyDraft.rooms),
    price_amount: row.price_amount === "" || row.price_amount === undefined ? null : Number(row.price_amount),
    price_from: row.price_from === "" || row.price_from === undefined ? null : Number(row.price_from),
    price_to: row.price_to === "" || row.price_to === undefined ? null : Number(row.price_to),
    capacity: row.capacity === "" || row.capacity === undefined ? null : Number(row.capacity),
    cuisine_tags: typeof row.cuisine_tags === "string" ? row.cuisine_tags.split("|").map((item) => item.trim()).filter(Boolean) : [],
    price_band_goombi: String(row.price_band_goombi ?? ""),
    description_goombi: String(row.description_goombi ?? ""),
    amenities: Array.isArray(amenities) ? amenities.map(String) : emptyDraft.amenities,
    photos: Array.isArray(photos) ? photos.map(String) : emptyDraft.photos,
    images: Array.isArray(images) ? images.map(String) : emptyDraft.images,
    tags: Array.isArray(tags) ? tags.map(String) : emptyDraft.tags,
    featured:
      row.featured === true || row.featured === "true" || row.featured === "TRUE",
    verified_status:
      row.verified_status === true ||
      row.verified_status === "true" ||
      row.verified_status === "TRUE",
    source_type: "manual_seed",
  } as ListingDraft;
}

const REGION_OPTIONS = ["all", "Gauteng", "Western Cape", "KwaZulu-Natal"] as const;
type RegionOption = typeof REGION_OPTIONS[number];

export function AdminPage() {
  const [listings, setListings] = useState<Listing[]>([]);
  const [enquiries, setEnquiries] = useState<Enquiry[]>([]);
  const [restaurantProspects, setRestaurantProspects] = useState<RestaurantProspect[]>([]);
  const [draft, setDraft] = useState<ListingDraft>(emptyDraft);
  const [editingId, setEditingId] = useState("");
  const [status, setStatus] = useState("");
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [regionFilter, setRegionFilter] = useState<RegionOption>("all");
  const [layerFilter, setLayerFilter] = useState<ListingType | "all">("all");
  const [nameQuery, setNameQuery] = useState("");
  const [sortKey, setSortKey] = useState<"name" | "layer" | "province" | "price" | "verified">("name");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");
  const [verifiedFilter, setVerifiedFilter] = useState<"all" | "verified" | "unverified">("all");
  const [restaurantProspectProvince, setRestaurantProspectProvince] = useState<RegionOption>("all");

  const refresh = () => api.listings().then(setListings);
  const refreshRestaurantProspects = () => api.restaurantProspects().then(setRestaurantProspects);

  useEffect(() => {
    refresh()
      .catch((error) => setStatus(error instanceof Error ? error.message : "Admin listings failed to load."))
      .finally(() => setLoading(false));
    api.enquiries()
      .then((data) => setEnquiries([...data].sort((a, b) => b.created_at.localeCompare(a.created_at))))
      .catch(() => {});
    refreshRestaurantProspects().catch(() => {});
  }, []);

  const suburbs = useMemo(() => Array.from(new Set(listings.map((listing) => listing.suburb))).sort(), [listings]);

  const filteredListings = useMemo(() => {
    const query = nameQuery.trim().toLowerCase();
    return listings.filter((l) => {
      const matchesRegion = regionFilter === "all" || l.province === regionFilter;
      const matchesLayer = layerFilter === "all" || getListingType(l) === layerFilter;
      const matchesName = query === "" || l.name.toLowerCase().includes(query);
      const matchesVerified =
        verifiedFilter === "all" ||
        (verifiedFilter === "verified" && l.verified_status) ||
        (verifiedFilter === "unverified" && !l.verified_status);
      return matchesRegion && matchesLayer && matchesName && matchesVerified;
    });
  }, [listings, regionFilter, layerFilter, nameQuery, verifiedFilter]);

  const sortedListings = useMemo(() => {
    const dir = sortDir === "asc" ? 1 : -1;
    return [...filteredListings].sort((a, b) => {
      switch (sortKey) {
        case "name":     return dir * a.name.localeCompare(b.name);
        case "layer":    return dir * displayCategory(a).localeCompare(displayCategory(b));
        case "province": return dir * a.province.localeCompare(b.province);
        case "price":    return dir * (a.price_per_night - b.price_per_night);
        case "verified": return dir * (Number(b.verified_status) - Number(a.verified_status));
        default:         return 0;
      }
    });
  }, [filteredListings, sortKey, sortDir]);

  const filteredRestaurantProspects = useMemo(
    () =>
      restaurantProspects.filter((prospect) =>
        restaurantProspectProvince === "all" || prospect.province === restaurantProspectProvince,
      ),
    [restaurantProspectProvince, restaurantProspects],
  );

  function handleSort(key: typeof sortKey) {
    if (key === sortKey) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDir("asc");
    }
  }

  function SortIndicator({ col }: { col: typeof sortKey }) {
    if (col !== sortKey) return <span className="ml-1 text-slate-300">↕</span>;
    return <span className="ml-1">{sortDir === "asc" ? "▲" : "▼"}</span>;
  }

  async function save(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    try {
      if (editingId) {
        await api.updateListing(editingId, draft);
        setStatus("Listing updated.");
      } else {
        await api.createListing(draft);
        setStatus("Listing added.");
      }
      setEditingId("");
      setDraft(emptyDraft);
      await refresh();
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Listing save failed.");
    } finally {
      setBusy(false);
    }
  }

  async function remove(listing: Listing) {
    if (!window.confirm(`Delete ${listing.name}?`)) return;
    setBusy(true);
    try {
      await api.deleteListing(listing.id);
      setStatus("Listing deleted.");
      await refresh();
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Delete failed.");
    } finally {
      setBusy(false);
    }
  }

  async function upload(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    setBusy(true);
    try {
      const text = await file.text();
      const rows =
        file.name.toLowerCase().endsWith(".json")
          ? JSON.parse(text)
          : Papa.parse<Record<string, unknown>>(text, { header: true, skipEmptyLines: true }).data;
      if (!Array.isArray(rows)) throw new Error("Seed file must contain rows.");
      await Promise.all(rows.map((row) => api.createListing(coerceDraft(row))));
      setStatus(`${rows.length} seed listing${rows.length === 1 ? "" : "s"} imported.`);
      await refresh();
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Import failed.");
    } finally {
      event.target.value = "";
      setBusy(false);
    }
  }

  async function convertRestaurantProspect(prospect: RestaurantProspect) {
    if (prospect.approval_status !== "provider_approved") return;
    setBusy(true);
    try {
      await api.createListing({
        ...emptyDraft,
        name: prospect.name,
        category: "restaurant",
        listing_type: "restaurant",
        partner_status: "active",
        province: prospect.province,
        region: prospect.province,
        city: prospect.city,
        suburb: prospect.suburb,
        address: `${prospect.suburb}, ${prospect.city}`,
        latitude: prospect.latitude,
        longitude: prospect.longitude,
        price_per_night: 0,
        max_guests: null,
        rooms: null,
        cuisine_tags: prospect.cuisine_tags,
        price_band_goombi: prospect.price_band,
        description: "Provider-approved Goombi restaurant marker.",
        description_goombi: "Provider-approved Goombi restaurant marker.",
        amenities: [],
        photos: [],
        owner_name: "Restaurant provider",
        owner_phone: "",
        website_url: prospect.public_website_url ?? "",
        booking_url: prospect.public_contact_url ?? prospect.public_website_url ?? "",
        provider_type: prospect.cuisine_tags.join(", "),
        verified_status: true,
        source_type: "provider_approved",
        source_note: "Converted from internal prospect record after provider approval. TripAdvisor-derived metrics and notes are not published.",
      });
      setStatus(`${prospect.name} converted to a public restaurant marker.`);
      await refresh();
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Restaurant conversion failed.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <nav className="fixed left-1/2 top-4 z-30 flex -translate-x-1/2 items-center gap-1 rounded-lg border border-white/70 bg-white/95 p-1 shadow-panel backdrop-blur">
        <a className="nav-link" href="/" title="Map discovery">
          <MapPinned className="h-4 w-4" />Map
        </a>
        <a className="nav-link nav-link-active" href="/admin" title="Admin listings">
          <Building2 className="h-4 w-4" />Admin
        </a>
      </nav>
    <main className="min-h-screen bg-[#e7f1ec] px-4 pb-10 pt-24 text-slate-950 lg:px-8">
      {/* Enquiry stats card */}
      <div className="mx-auto mb-6 max-w-7xl rounded-lg border border-emerald-100 bg-white p-5 shadow-panel">
        <p className="text-xs font-bold uppercase text-emerald-700">Enquiries</p>
        <p className="mt-1 text-3xl font-semibold">{enquiries.length} total</p>
        {enquiries.length > 0 && (
          <ul className="mt-3 grid gap-1">
            {enquiries.slice(0, 3).map((enq) => (
              <li key={enq.id} className="flex items-center justify-between gap-3 text-sm text-slate-700">
                <span className="font-medium truncate">{enq.listing_name ?? enq.listing_id}</span>
                <span className="shrink-0 text-xs text-slate-400">{enq.created_at.slice(0, 10)}</span>
              </li>
            ))}
          </ul>
        )}
      </div>
      <section className="mx-auto mb-6 max-w-7xl overflow-hidden rounded-lg border border-amber-100 bg-white shadow-panel">
        <div className="border-b border-amber-100 p-5">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="inline-flex items-center gap-2 text-xs font-bold uppercase text-amber-700">
                <Utensils className="h-4 w-4" />Restaurant Prospects
              </p>
              <h2 className="mt-1 text-2xl font-semibold">Audit seed records</h2>
              <p className="mt-1 max-w-3xl text-sm text-slate-600">
                Internal-only prospect data for outreach and gap analysis. These records are not shown on the public map until provider approval.
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <label className="text-xs font-bold uppercase text-slate-500" htmlFor="restaurant-prospect-province">
                Province
              </label>
              <select
                id="restaurant-prospect-province"
                className="field w-48"
                value={restaurantProspectProvince}
                onChange={(event) => setRestaurantProspectProvince(event.target.value as RegionOption)}
              >
                <option value="all">All provinces</option>
                <option value="Gauteng">Gauteng</option>
                <option value="Western Cape">Western Cape</option>
                <option value="KwaZulu-Natal">KwaZulu-Natal</option>
              </select>
              <span className="rounded-md bg-emerald-50 px-3 py-2 text-sm font-semibold text-emerald-900">
                KZN restaurant audit seed completed — records remain internal until provider approval.
              </span>
            </div>
          </div>
        </div>
        {restaurantProspects.length === 0 ? (
          <p className="p-5 text-sm text-slate-600">No restaurant prospects loaded.</p>
        ) : filteredRestaurantProspects.length === 0 ? (
          <p className="p-5 text-sm text-slate-600">No restaurant prospects match the selected province.</p>
        ) : (
          <div className="overflow-auto">
            <table className="min-w-full border-collapse text-left text-sm">
              <thead className="bg-slate-50 text-xs font-bold uppercase text-slate-600">
                <tr>
                  <th className="p-3">Restaurant</th>
                  <th className="p-3">Province</th>
                  <th className="p-3">Suburb</th>
                  <th className="p-3">Cuisine</th>
                  <th className="p-3">Approval</th>
                  <th className="p-3">Source document</th>
                  <th className="p-3">Action</th>
                </tr>
              </thead>
              <tbody>
                {filteredRestaurantProspects.slice(0, 80).map((prospect) => (
                  <tr className="border-t border-slate-100" key={prospect.id}>
                    <td className="p-3 font-semibold">{prospect.name}</td>
                    <td className="p-3 text-slate-600">{prospect.province}</td>
                    <td className="p-3 text-slate-600">{prospect.suburb}</td>
                    <td className="p-3 text-slate-600">{prospect.cuisine_tags.join(", ") || "-"}</td>
                    <td className="p-3">
                      <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                        prospect.approval_status === "provider_approved"
                          ? "bg-emerald-100 text-emerald-800"
                          : "bg-slate-100 text-slate-600"
                      }`}>
                        {prospect.approval_status.replace(/_/g, " ")}
                      </span>
                    </td>
                    <td className="p-3 text-xs text-slate-500">{prospect.source_document}</td>
                    <td className="p-3">
                      <button
                        className="secondary-button"
                        disabled={busy || prospect.approval_status !== "provider_approved"}
                        type="button"
                        onClick={() => convertRestaurantProspect(prospect)}
                      >
                        Convert to public restaurant marker
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {filteredRestaurantProspects.length > 80 && (
              <p className="border-t border-slate-100 p-3 text-xs text-slate-500">
                Showing first 80 of {filteredRestaurantProspects.length} prospect records.
              </p>
            )}
          </div>
        )}
      </section>
      <div className="mx-auto grid max-w-7xl gap-6 lg:grid-cols-[24rem_1fr]">
        <form className="h-fit rounded-lg border border-emerald-100 bg-white p-5 shadow-panel" onSubmit={save}>
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-xs font-bold uppercase text-emerald-700">Manual upload</p>
              <h1 className="mt-1 text-2xl font-semibold">{editingId ? "Edit listing" : "Add listing"}</h1>
            </div>
            <label className="secondary-button cursor-pointer" title="Import CSV or JSON">
              <FileUp className="h-4 w-4" />
              <input accept=".csv,.json" className="hidden" type="file" onChange={upload} />
            </label>
          </div>
          <div className="mt-5 grid gap-3">
            <label className="label">Name<input className="field" required value={draft.name} onChange={(event) => setDraft({ ...draft, name: event.target.value })} /></label>
            <div className="grid grid-cols-2 gap-3">
              <label className="label">Category<select className="field" value={draft.category} onChange={(event) => setDraft({ ...draft, category: event.target.value as ListingDraft["category"] })}><option value="guesthouse">Guesthouse</option><option value="bnb">B&B</option><option value="accommodation">Accommodation</option><option value="workspace">Workspace</option><option value="restaurant">Restaurant</option></select></label>
              <label className="label">Suburb<input className="field" list="known-suburbs" required value={draft.suburb} onChange={(event) => setDraft({ ...draft, suburb: event.target.value })} /></label>
            </div>
            <datalist id="known-suburbs">{suburbs.map((suburb) => <option key={suburb} value={suburb} />)}</datalist>
            <label className="label">Address<input className="field" required value={draft.address} onChange={(event) => setDraft({ ...draft, address: event.target.value })} /></label>
            <div className="grid grid-cols-2 gap-3">
              <label className="label">Latitude<input className="field" required type="number" step="0.0001" value={draft.latitude} onChange={(event) => setDraft({ ...draft, latitude: Number(event.target.value) })} /></label>
              <label className="label">Longitude<input className="field" required type="number" step="0.0001" value={draft.longitude} onChange={(event) => setDraft({ ...draft, longitude: Number(event.target.value) })} /></label>
            </div>
            {draft.category === "workspace" ? (
              <>
                <div className="grid grid-cols-2 gap-3">
                  <label className="label">Provider<input className="field" required value={draft.provider_name ?? ""} onChange={(event) => setDraft({ ...draft, provider_name: event.target.value })} /></label>
                  <label className="label">Workspace type<select className="field" value={draft.workspace_type ?? "serviced_office"} onChange={(event) => setDraft({ ...draft, workspace_type: event.target.value as ListingDraft["workspace_type"] })}><option value="coworking">Coworking</option><option value="meeting_room">Meeting room</option><option value="boardroom">Boardroom</option><option value="serviced_office">Serviced office</option><option value="virtual_office">Virtual office</option></select></label>
                </div>
                <div className="grid grid-cols-3 gap-3">
                  <label className="label">Pricing<select className="field" value={draft.pricing_status ?? "not_publicly_available"} onChange={(event) => setDraft({ ...draft, pricing_status: event.target.value as ListingDraft["pricing_status"] })}><option value="not_publicly_available">Not public</option><option value="public_price">Public price</option></select></label>
                  <label className="label">Amount<input className="field" min={0} type="number" value={draft.price_amount ?? ""} onChange={(event) => setDraft({ ...draft, price_amount: event.target.value ? Number(event.target.value) : null })} /></label>
                  <label className="label">Unit<input className="field" value={draft.price_unit ?? ""} onChange={(event) => setDraft({ ...draft, price_unit: event.target.value })} /></label>
                </div>
                <label className="label">Capacity<input className="field" min={1} type="number" value={draft.capacity ?? ""} onChange={(event) => setDraft({ ...draft, capacity: event.target.value ? Number(event.target.value) : null })} /></label>
                <label className="label">Booking URL<input className="field" value={draft.booking_url ?? ""} onChange={(event) => setDraft({ ...draft, booking_url: event.target.value })} /></label>
                <label className="label">Source URL<input className="field" required value={draft.source_url ?? ""} onChange={(event) => setDraft({ ...draft, source_url: event.target.value })} /></label>
                <label className="label">Source note<textarea className="field min-h-16" required value={draft.source_note ?? ""} onChange={(event) => setDraft({ ...draft, source_note: event.target.value })} /></label>
              </>
            ) : (
              <div className="grid grid-cols-3 gap-3">
                <label className="label">Price<input className="field" min={0} type="number" value={draft.price_per_night} onChange={(event) => setDraft({ ...draft, price_per_night: Number(event.target.value) })} /></label>
                <label className="label">Guests<input className="field" min={1} type="number" value={draft.max_guests ?? ""} onChange={(event) => setDraft({ ...draft, max_guests: Number(event.target.value) || null })} /></label>
                <label className="label">Rooms<input className="field" min={1} type="number" value={draft.rooms ?? ""} onChange={(event) => setDraft({ ...draft, rooms: Number(event.target.value) || null })} /></label>
              </div>
            )}
            <label className="label">Description<textarea className="field min-h-20" required value={draft.description} onChange={(event) => setDraft({ ...draft, description: event.target.value })} /></label>
            <label className="label">Amenities, comma separated<input className="field" value={draft.amenities.join(", ")} onChange={(event) => setDraft({ ...draft, amenities: event.target.value.split(",").map((item) => item.trim()).filter(Boolean) })} /></label>

            {/* Discovery & partner fields */}
            <div className="rounded-md border border-slate-200 p-3 grid gap-3">
              <p className="text-xs font-bold uppercase text-slate-500">Layer & Discovery</p>
              <div className="grid grid-cols-2 gap-3">
                <label className="label">Layer type
                  <select className="field" value={draft.listing_type ?? "accommodation"} onChange={(event) => setDraft({ ...draft, listing_type: event.target.value as ListingDraft["listing_type"] })}>
                    {ALL_LISTING_TYPES.map((t) => <option key={t} value={t}>{t.replace(/_/g, " ")}</option>)}
                  </select>
                </label>
                <label className="label">Partner status
                  <select className="field" value={draft.partner_status ?? "seed"} onChange={(event) => setDraft({ ...draft, partner_status: event.target.value as ListingDraft["partner_status"] })}>
                    {ALL_PARTNER_STATUSES.map((s) => <option key={s} value={s}>{s.replace(/_/g, " ")}</option>)}
                  </select>
                </label>
              </div>
              <label className="label">Tags (pipe-separated)<input className="field" placeholder="e.g. pool|pet-friendly|garden" value={(draft.tags ?? []).join("|")} onChange={(event) => setDraft({ ...draft, tags: event.target.value.split("|").map((t) => t.trim()).filter(Boolean) })} /></label>
              <label className="label">Provider / operator type<input className="field" value={draft.provider_type ?? ""} onChange={(event) => setDraft({ ...draft, provider_type: event.target.value })} /></label>
              <div className="grid grid-cols-2 gap-3">
                <label className="label">Website URL<input className="field" type="url" value={draft.website_url ?? ""} onChange={(event) => setDraft({ ...draft, website_url: event.target.value })} /></label>
                <label className="label">WhatsApp URL<input className="field" type="url" value={draft.whatsapp_url ?? ""} onChange={(event) => setDraft({ ...draft, whatsapp_url: event.target.value })} /></label>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <label className="label">Contact phone<input className="field" value={draft.contact_phone ?? ""} onChange={(event) => setDraft({ ...draft, contact_phone: event.target.value })} /></label>
                <label className="label">Contact email<input className="field" type="email" value={draft.contact_email ?? ""} onChange={(event) => setDraft({ ...draft, contact_email: event.target.value })} /></label>
              </div>
              <label className="flex items-center justify-between rounded-md border border-slate-200 p-3 text-sm font-medium">
                Featured listing
                <input checked={draft.featured ?? false} className="h-4 w-4 accent-emerald-700" type="checkbox" onChange={(event) => setDraft({ ...draft, featured: event.target.checked })} />
              </label>
              {draft.listing_type === "estate_living_zone" && (
                <>
                  <label className="label">Estate type (e.g. Security Estate)<input className="field" placeholder="Security Estate" value={draft.estate_type ?? ""} onChange={(event) => setDraft({ ...draft, estate_type: event.target.value })} /></label>
                  <label className="label">Lifestyle summary<textarea className="field min-h-16" placeholder="Describe the estate lifestyle..." value={draft.lifestyle_summary ?? ""} onChange={(event) => setDraft({ ...draft, lifestyle_summary: event.target.value })} /></label>
                  <label className="flex items-center justify-between rounded-md border border-slate-200 p-3 text-sm font-medium">
                    Long stay friendly
                    <input checked={draft.long_stay_relevant ?? false} className="h-4 w-4 accent-emerald-700" type="checkbox" onChange={(event) => setDraft({ ...draft, long_stay_relevant: event.target.checked })} />
                  </label>
                </>
              )}
            </div>

            {draft.category !== "workspace" && <div className="grid grid-cols-2 gap-3">
              <label className="label">Owner<input className="field" required value={draft.owner_name} onChange={(event) => setDraft({ ...draft, owner_name: event.target.value })} /></label>
              <label className="label">Phone<input className="field" required value={draft.owner_phone} onChange={(event) => setDraft({ ...draft, owner_phone: event.target.value })} /></label>
            </div>}
            <label className="flex items-center justify-between rounded-md border border-slate-200 p-3 text-sm font-medium">
              Verified
              <input checked={draft.verified_status} className="h-4 w-4 accent-emerald-700" type="checkbox" onChange={(event) => setDraft({ ...draft, verified_status: event.target.checked })} />
            </label>
            <div className="flex flex-wrap gap-2">
              <button className="primary-button" disabled={busy} type="submit"><Plus className="h-4 w-4" />{editingId ? "Save edit" : "Add listing"}</button>
              {editingId && <button className="secondary-button" type="button" onClick={() => { setEditingId(""); setDraft(emptyDraft); }}>Cancel</button>}
            </div>
          </div>
        </form>
        <section className="overflow-hidden rounded-lg border border-emerald-100 bg-white shadow-panel">
          <div className="border-b border-slate-200 p-5">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h2 className="text-2xl font-semibold">Listings</h2>
                <p className="mt-1 text-sm text-slate-600">Seed imports accept JSON arrays or CSV rows. Use `|` between CSV amenities or photo URLs.</p>
              </div>
              <div className="flex flex-wrap items-center gap-2 shrink-0">
                <label className="text-xs font-bold uppercase text-slate-500 sr-only" htmlFor="admin-name-search">Search</label>
                <input
                  id="admin-name-search"
                  className="field w-48"
                  type="search"
                  placeholder="Search by name…"
                  value={nameQuery}
                  onChange={(event) => setNameQuery(event.target.value)}
                />
                <label className="text-xs font-bold uppercase text-slate-500 sr-only" htmlFor="admin-region-filter">Region</label>
                <select
                  id="admin-region-filter"
                  className="field w-44"
                  value={regionFilter}
                  onChange={(event) => setRegionFilter(event.target.value as RegionOption)}
                >
                  <option value="all">All regions</option>
                  <option value="Gauteng">Gauteng</option>
                  <option value="Western Cape">Western Cape</option>
                  <option value="KwaZulu-Natal">KwaZulu-Natal</option>
                </select>
                <label className="text-xs font-bold uppercase text-slate-500 sr-only" htmlFor="admin-layer-filter">Layer</label>
                <select
                  id="admin-layer-filter"
                  className="field w-40"
                  value={layerFilter}
                  onChange={(event) => setLayerFilter(event.target.value as ListingType | "all")}
                >
                  <option value="all">All layers</option>
                  {ALL_LISTING_TYPES.map((t) => (
                    <option key={t} value={t}>{LAYER_LABELS[t]}</option>
                  ))}
                </select>
                <label className="text-xs font-bold uppercase text-slate-500 sr-only" htmlFor="admin-verified-filter">Verified</label>
                <select
                  id="admin-verified-filter"
                  className="field w-36"
                  value={verifiedFilter}
                  onChange={(event) => setVerifiedFilter(event.target.value as "all" | "verified" | "unverified")}
                >
                  <option value="all">All listings</option>
                  <option value="verified">Verified only</option>
                  <option value="unverified">Unverified only</option>
                </select>
                <span className="text-sm text-slate-500 tabular-nums whitespace-nowrap">
                  {filteredListings.length}{(regionFilter !== "all" || layerFilter !== "all" || nameQuery.trim() !== "" || verifiedFilter !== "all") ? ` / ${listings.length}` : ""} listings
                </span>
              </div>
            </div>
            {status && <p className="mt-3 rounded-md bg-emerald-50 p-3 text-sm text-emerald-950">{status}</p>}
          </div>
          {loading && <p className="p-5 text-sm text-slate-600">Loading listings...</p>}
          {!loading && listings.length === 0 && <p className="p-5 text-sm text-slate-600">No listings yet.</p>}
          {!loading && listings.length > 0 && filteredListings.length === 0 && (
            <p className="p-5 text-sm text-slate-600">No listings match the selected filters.</p>
          )}
          {!loading && filteredListings.length > 0 && (
            <div className="overflow-auto">
              <table className="min-w-full border-collapse text-left text-sm">
                <thead className="bg-slate-50 text-xs font-bold uppercase text-slate-600">
                  <tr>
                    <th className="p-3"><button className="flex items-center hover:text-slate-900" type="button" onClick={() => handleSort("name")}>Listing<SortIndicator col="name" /></button></th>
                    <th className="p-3"><button className="flex items-center hover:text-slate-900" type="button" onClick={() => handleSort("layer")}>Layer<SortIndicator col="layer" /></button></th>
                    <th className="p-3"><button className="flex items-center hover:text-slate-900" type="button" onClick={() => handleSort("province")}>Province<SortIndicator col="province" /></button></th>
                    <th className="p-3">Suburb</th>
                    <th className="p-3"><button className="flex items-center hover:text-slate-900" type="button" onClick={() => handleSort("price")}>Price<SortIndicator col="price" /></button></th>
                    <th className="p-3">Capacity</th>
                    <th className="p-3"><button className="flex items-center hover:text-slate-900" type="button" onClick={() => handleSort("verified")}>Verified<SortIndicator col="verified" /></button></th>
                    <th className="p-3">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {sortedListings.map((listing) => (
                    <tr className="border-t border-slate-100" key={listing.id}>
                      <td className="p-3 font-semibold">{listing.name}</td>
                      <td className="p-3 text-slate-600">{displayCategory(listing)}</td>
                      <td className="p-3 text-slate-600">{listing.province}</td>
                      <td className="p-3">{listing.suburb}</td>
                      <td className="p-3">{isWorkspace(listing) ? listing.pricing_status === "public_price" ? `${listing.price_amount}/${listing.price_unit}` : "Not public" : `R${listing.price_per_night}`}</td>
                      <td className="p-3">{isWorkspace(listing) ? `${listing.capacity ?? "-"} capacity` : `${listing.max_guests} guests`}</td>
                      <td className="p-3">{listing.verified_status ? "Yes" : "No"}</td>
                      <td className="p-3">
                        <div className="flex gap-2">
                          <button aria-label={`Edit ${listing.name}`} className="secondary-button h-9 w-9 p-0" type="button" onClick={() => { setEditingId(listing.id); setDraft(draftFromListing(listing)); }}><Pencil className="h-4 w-4" /></button>
                          <button aria-label={`Delete ${listing.name}`} className="secondary-button h-9 w-9 p-0" disabled={busy} type="button" onClick={() => remove(listing)}><Trash2 className="h-4 w-4" /></button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>
    </main>
    </>
  );
}
