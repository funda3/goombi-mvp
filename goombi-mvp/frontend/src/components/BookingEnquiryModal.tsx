import { FormEvent, useEffect, useState } from "react";
import { X } from "lucide-react";

import { api } from "../services/api";
import { isWorkspace, type Listing } from "../types/listing";
import { getListingPhoto } from "../utils/listingPhoto";

type Props = {
  listing: Listing;
  onClose: () => void;
};

type FormState = {
  name: string;
  email: string;
  phone: string;
  checkIn: string;
  checkOut: string;
  guests: number;
  startDate: string;
  message: string;
};

type Errors = Partial<Record<keyof FormState, string>>;

const empty: FormState = {
  name: "",
  email: "",
  phone: "",
  checkIn: "",
  checkOut: "",
  guests: 1,
  startDate: "",
  message: "",
};

function validate(form: FormState, workspace: boolean): Errors {
  const errors: Errors = {};
  if (form.name.trim().length < 2) errors.name = "Name must be at least 2 characters.";
  if (!form.email.includes("@") || form.email.indexOf(".") < form.email.indexOf("@")) {
    errors.email = "Enter a valid email address.";
  }
  if (!workspace) {
    if (!form.checkIn) errors.checkIn = "Check-in date is required.";
    if (!form.checkOut) errors.checkOut = "Check-out date is required.";
    if (form.checkIn && form.checkOut && form.checkOut <= form.checkIn) {
      errors.checkOut = "Check-out must be after check-in.";
    }
  } else {
    if (!form.startDate) errors.startDate = "Preferred start date is required.";
  }
  return errors;
}

export function BookingEnquiryModal({ listing, onClose }: Props) {
  const [form, setForm] = useState<FormState>(empty);
  const [errors, setErrors] = useState<Errors>({});
  const [touched, setTouched] = useState<Partial<Record<keyof FormState, boolean>>>({});
  const [busy, setBusy] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [apiError, setApiError] = useState("");

  const workspace = isWorkspace(listing);

  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [onClose]);

  function set<K extends keyof FormState>(field: K, value: FormState[K]) {
    const next = { ...form, [field]: value };
    setForm(next);
    if (touched[field]) {
      setErrors(validate(next, workspace));
    }
  }

  function blur(field: keyof FormState) {
    const next = { ...touched, [field]: true };
    setTouched(next);
    setErrors(validate(form, workspace));
  }

  async function submit(e: FormEvent) {
    e.preventDefault();
    const allTouched = Object.fromEntries(Object.keys(empty).map((k) => [k, true])) as typeof touched;
    setTouched(allTouched);
    const errs = validate(form, workspace);
    setErrors(errs);
    if (Object.keys(errs).length > 0) return;

    setBusy(true);
    setApiError("");
    try {
      await api.createBookingEnquiry({
        listing_id: listing.id,
        listing_name: listing.name,
        name: form.name.trim(),
        email: form.email.trim(),
        phone: form.phone.trim() || undefined,
        message: form.message.trim() || undefined,
        check_in: !workspace && form.checkIn ? form.checkIn : undefined,
        check_out: !workspace && form.checkOut ? form.checkOut : undefined,
        guests: !workspace ? form.guests : undefined,
        start_date: workspace && form.startDate ? form.startDate : undefined,
      });
      setSubmitted(true);
    } catch (err) {
      setApiError(err instanceof Error ? err.message : "Something went wrong. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  const isValid = Object.keys(validate(form, workspace)).length === 0;

  const price = workspace
    ? listing.pricing_status === "public_price" && listing.price_amount != null
      ? `R${listing.price_amount}/${listing.price_unit}`
      : "Pricing on request"
    : `R${listing.price_per_night}/night`;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="w-full max-w-[480px] rounded-xl bg-white shadow-2xl overflow-y-auto max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between gap-3 px-5 pt-5 pb-4 border-b border-slate-100">
          <h2 className="text-lg font-semibold text-slate-950 leading-tight">
            Enquire about <span className="text-emerald-700">{listing.name}</span>
          </h2>
          <button type="button" aria-label="Close" className="secondary-button h-9 w-9 shrink-0 p-0" onClick={onClose}>
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Listing summary */}
        <div className="px-5 pt-4">
          <div className="flex items-center gap-3 rounded-lg bg-slate-50 p-3">
            <img
              src={getListingPhoto(listing, 0)}
              alt=""
              className="h-16 w-16 shrink-0 rounded-md object-cover bg-slate-200"
            />
            <div className="min-w-0">
              <p className="truncate font-semibold text-slate-900">{listing.name}</p>
              <p className="text-sm text-slate-500">{listing.suburb}</p>
              <p className="text-sm font-medium text-emerald-700">{price}</p>
            </div>
          </div>
        </div>

        {/* Success state */}
        {submitted ? (
          <div className="px-5 py-8 text-center">
            <p className="text-2xl mb-2">✅</p>
            <p className="font-semibold text-slate-900">Enquiry sent!</p>
            <p className="mt-1 text-sm text-slate-600">The host will contact you within 24 hours.</p>
            <button type="button" className="primary-button mt-5" onClick={onClose}>Close</button>
          </div>
        ) : (
          <form onSubmit={submit} className="px-5 pb-5 pt-4 grid gap-4" noValidate>
            {/* Name */}
            <label className="label">
              Full name <span className="text-rose-500">*</span>
              <input
                className="field"
                value={form.name}
                onChange={(e) => set("name", e.target.value)}
                onBlur={() => blur("name")}
              />
              {touched.name && errors.name && <span className="text-xs text-rose-600">{errors.name}</span>}
            </label>

            {/* Email */}
            <label className="label">
              Email address <span className="text-rose-500">*</span>
              <input
                className="field"
                type="email"
                value={form.email}
                onChange={(e) => set("email", e.target.value)}
                onBlur={() => blur("email")}
              />
              {touched.email && errors.email && <span className="text-xs text-rose-600">{errors.email}</span>}
            </label>

            {/* Phone */}
            <label className="label">
              Phone number <span className="text-slate-400 text-xs font-normal">(optional)</span>
              <input
                className="field"
                type="tel"
                value={form.phone}
                onChange={(e) => set("phone", e.target.value)}
              />
            </label>

            {/* Accommodation-specific fields */}
            {!workspace && (
              <>
                <div className="grid grid-cols-2 gap-3">
                  <label className="label">
                    Check-in <span className="text-rose-500">*</span>
                    <input
                      className="field"
                      type="date"
                      value={form.checkIn}
                      onChange={(e) => set("checkIn", e.target.value)}
                      onBlur={() => blur("checkIn")}
                    />
                    {touched.checkIn && errors.checkIn && <span className="text-xs text-rose-600">{errors.checkIn}</span>}
                  </label>
                  <label className="label">
                    Check-out <span className="text-rose-500">*</span>
                    <input
                      className="field"
                      type="date"
                      value={form.checkOut}
                      onChange={(e) => set("checkOut", e.target.value)}
                      onBlur={() => blur("checkOut")}
                    />
                    {touched.checkOut && errors.checkOut && <span className="text-xs text-rose-600">{errors.checkOut}</span>}
                  </label>
                </div>
                <label className="label">
                  Number of guests <span className="text-rose-500">*</span>
                  <input
                    className="field"
                    type="number"
                    min={1}
                    max={listing.max_guests}
                    value={form.guests}
                    onChange={(e) => set("guests", Number(e.target.value))}
                    onBlur={() => blur("guests")}
                  />
                </label>
              </>
            )}

            {/* Workspace-specific fields */}
            {workspace && (
              <label className="label">
                Preferred start date <span className="text-rose-500">*</span>
                <input
                  className="field"
                  type="date"
                  value={form.startDate}
                  onChange={(e) => set("startDate", e.target.value)}
                  onBlur={() => blur("startDate")}
                />
                {touched.startDate && errors.startDate && <span className="text-xs text-rose-600">{errors.startDate}</span>}
              </label>
            )}

            {/* Message */}
            <label className="label">
              Message / special requests <span className="text-slate-400 text-xs font-normal">(optional)</span>
              <textarea
                className="field min-h-20"
                maxLength={300}
                value={form.message}
                onChange={(e) => set("message", e.target.value)}
              />
              <span className="text-xs text-slate-400 text-right">{form.message.length}/300</span>
            </label>

            {apiError && (
              <p className="rounded-md bg-rose-50 px-3 py-2 text-sm text-rose-700">{apiError}</p>
            )}

            <button
              type="submit"
              className="primary-button w-full"
              disabled={busy || !isValid}
            >
              {busy ? "Sending…" : "Send Enquiry"}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
