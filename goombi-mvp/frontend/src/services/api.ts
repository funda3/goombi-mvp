import type { BookingEnquiryDraft, Enquiry, EnquiryDraft, Listing, ListingDraft } from "../types/listing";
import type { EventCategory, EventRecord, EventRecurringType } from "../types/event";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || `http://${window.location.hostname}:8000`;

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    headers: { "Content-Type": "application/json", ...init?.headers },
    ...init,
  });
  if (!response.ok) {
    const payload = await response.json().catch(() => ({ detail: "Request failed" }));
    throw new Error(payload.detail || "Request failed");
  }
  if (response.status === 204) {
    return undefined as T;
  }
  return response.json() as Promise<T>;
}

export const api = {
  listings: () => request<Listing[]>("/api/listings"),
  events: (filters?: {
    province?: string;
    city?: string;
    category?: EventCategory;
    recurring_type?: EventRecurringType;
  }) => {
    const params = new URLSearchParams();
    if (filters?.province) params.set("province", filters.province);
    if (filters?.city) params.set("city", filters.city);
    if (filters?.category) params.set("category", filters.category);
    if (filters?.recurring_type) params.set("recurring_type", filters.recurring_type);
    const query = params.toString();
    return request<EventRecord[]>(`/api/events${query ? `?${query}` : ""}`);
  },
  eventById: (id: string) => request<EventRecord>(`/api/events/${id}`),
  createListing: (payload: ListingDraft) =>
    request<Listing>("/api/listings", { method: "POST", body: JSON.stringify(payload) }),
  updateListing: (id: string, payload: ListingDraft) =>
    request<Listing>(`/api/listings/${id}`, { method: "PUT", body: JSON.stringify(payload) }),
  deleteListing: (id: string) => request<void>(`/api/listings/${id}`, { method: "DELETE" }),
  createEnquiry: (payload: EnquiryDraft) =>
    request("/api/enquiries", { method: "POST", body: JSON.stringify(payload) }),
  createBookingEnquiry: (payload: BookingEnquiryDraft) =>
    request("/api/enquiries", { method: "POST", body: JSON.stringify(payload) }),
  enquiries: () => request<Enquiry[]>("/api/enquiries"),
  requestOtp: (cellphone: string) =>
    request<{ message: string }>("/api/otp/request", {
      method: "POST",
      body: JSON.stringify({ cellphone }),
    }),
  verifyOtp: (cellphone: string, code: string) =>
    request<{ message: string; otp_verified: boolean }>("/api/otp/verify", {
      method: "POST",
      body: JSON.stringify({ cellphone, code }),
    }),
};
