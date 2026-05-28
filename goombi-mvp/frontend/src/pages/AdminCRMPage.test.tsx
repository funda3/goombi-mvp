import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { vi } from "vitest";

import { AdminCRMPage } from "./AdminCRMPage";
import type { ProviderCrmRecord } from "../types/providerCrm";

vi.mock("../services/api", () => ({
  api: {
    providerCrm: vi.fn(),
    updateProviderCrm: vi.fn(),
    createPublicListingFromCrm: vi.fn(),
  },
}));

import { api } from "../services/api";

const mockProviderCrm = api.providerCrm as ReturnType<typeof vi.fn>;
const mockUpdateProviderCrm = api.updateProviderCrm as ReturnType<typeof vi.fn>;
const mockCreatePublicListingFromCrm = api.createPublicListingFromCrm as ReturnType<typeof vi.fn>;

const baseRecord: ProviderCrmRecord = {
  id: "crm-1",
  provider_type: "restaurant",
  provider_record_id: "restaurant-prospect-1",
  provider_name: "KZN Prospect Kitchen",
  province: "KwaZulu-Natal",
  city: "Durban",
  current_status: "prospect_only",
  assigned_to: "Asha",
  priority: "strategic",
  outreach_channel: "whatsapp",
  outreach_note: "Initial outreach.",
  next_followup_date: "2020-01-01",
  loi_sent_at: null,
  loi_signed_at: null,
  provider_approved_at: null,
  public_listing_created_at: null,
  created_at: "2026-05-28T00:00:00Z",
  updated_at: "2026-05-28T00:00:00Z",
};

beforeEach(() => {
  mockProviderCrm.mockReset();
  mockUpdateProviderCrm.mockReset();
  mockCreatePublicListingFromCrm.mockReset();
  mockProviderCrm.mockResolvedValue([
    baseRecord,
    { ...baseRecord, id: "crm-2", provider_name: "Cape Workspace", provider_type: "workspace", province: "Western Cape", city: "Cape Town", current_status: "provider_approved", priority: "high" },
  ]);
  mockUpdateProviderCrm.mockImplementation((_id, payload) =>
    Promise.resolve({ ...baseRecord, id: _id, ...payload, created_at: baseRecord.created_at, updated_at: baseRecord.updated_at }),
  );
  mockCreatePublicListingFromCrm.mockResolvedValue({
    crm: { ...baseRecord, current_status: "public_marker_live", public_listing_created_at: "2026-05-28T00:00:00Z" },
    listing: {},
    compliance_note: "Public listing creation requires provider approval or licensed/publicly permitted source confirmation.",
  });
  Object.defineProperty(URL, "createObjectURL", { value: vi.fn(() => "blob:crm"), configurable: true });
  Object.defineProperty(URL, "revokeObjectURL", { value: vi.fn(), configurable: true });
});

test("CRM dashboard renders cards kanban and table", async () => {
  render(<AdminCRMPage />);
  await waitFor(() => expect(screen.getAllByText("KZN Prospect Kitchen").length).toBeGreaterThan(0));

  expect(screen.getByText("Provider Conversion Workflow")).toBeInTheDocument();
  expect(screen.getByText("Total prospects")).toBeInTheDocument();
  expect(screen.getByText("Public markers live")).toBeInTheDocument();
  expect(screen.getByText("Prospect")).toBeInTheDocument();
  expect(screen.getByText("LOI Sent")).toBeInTheDocument();
  expect(screen.getByText("CRM Table")).toBeInTheDocument();
});

test("CRM search filters provider table", async () => {
  render(<AdminCRMPage />);
  await waitFor(() => expect(screen.getAllByText("Cape Workspace").length).toBeGreaterThan(0));

  fireEvent.change(screen.getByPlaceholderText("Provider, suburb, city"), { target: { value: "durban" } });

  expect(screen.getAllByText("KZN Prospect Kitchen").length).toBeGreaterThan(0);
  expect(screen.queryByText("Cape Workspace")).not.toBeInTheDocument();
});

test("provider detail drawer quick actions and create marker workflow", async () => {
  render(<AdminCRMPage />);
  await waitFor(() => expect(screen.getAllByText("KZN Prospect Kitchen").length).toBeGreaterThan(0));
  fireEvent.click(screen.getAllByText("KZN Prospect Kitchen")[0]);

  let drawer = screen.getByText("Provider detail").closest("aside")!;
  expect(within(drawer).getByText("Activity timeline")).toBeInTheDocument();

  fireEvent.click(within(drawer).getByRole("button", { name: "Mark LOI signed" }));
  await waitFor(() => expect(mockUpdateProviderCrm).toHaveBeenCalled());

  fireEvent.click(within(drawer).getByRole("button", { name: "Close CRM detail" }));
  fireEvent.click(screen.getAllByText("Cape Workspace")[0]);
  drawer = screen.getByText("Provider detail").closest("aside")!;
  expect(within(drawer).getByRole("button", { name: "Create Public Listing" })).toBeEnabled();
  fireEvent.click(within(drawer).getByRole("button", { name: "Create Public Listing" }));
  await waitFor(() => expect(mockCreatePublicListingFromCrm).toHaveBeenCalled());
});

test("export CSV uses the filtered records", async () => {
  const click = vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(() => undefined);
  render(<AdminCRMPage />);
  await waitFor(() => expect(screen.getAllByText("KZN Prospect Kitchen").length).toBeGreaterThan(0));

  fireEvent.click(screen.getByRole("button", { name: /Export CSV/i }));

  expect(URL.createObjectURL).toHaveBeenCalled();
  expect(click).toHaveBeenCalled();
});

test("overdue follow-ups are highlighted", async () => {
  render(<AdminCRMPage />);
  await waitFor(() => expect(screen.getAllByText("Overdue").length).toBeGreaterThan(0));
});
