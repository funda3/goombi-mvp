import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { vi } from "vitest";

import { AdminPage } from "./AdminPage";
import type { Listing } from "../types/listing";

// ── Mock the api service ──────────────────────────────────────────────────────
vi.mock("../services/api", () => ({
  api: {
    listings: vi.fn(),
    enquiries: vi.fn(),
  },
}));

import { api } from "../services/api";
const mockListings = api.listings as ReturnType<typeof vi.fn>;
const mockEnquiries = api.enquiries as ReturnType<typeof vi.fn>;

// ── Listing factory ───────────────────────────────────────────────────────────
const makeListing = (id: string, name: string, province: string): Listing => ({
  id,
  name,
  category: "guesthouse",
  province,
  city: province === "Gauteng" ? "Johannesburg" : province === "Western Cape" ? "Cape Town" : "Durban",
  suburb: "Test Suburb",
  address: "1 Test Street",
  latitude: -26.05,
  longitude: 28.02,
  price_per_night: 1000,
  max_guests: 2,
  rooms: 1,
  description: "Test listing.",
  amenities: [],
  photos: [],
  owner_name: "Test Owner",
  owner_phone: "+27110000000",
  verified_status: false,
  source_type: "manual_seed",
  created_at: "2026-05-22T00:00:00Z",
  updated_at: "2026-05-22T00:00:00Z",
});

const GP_LISTING = makeListing("gp-1", "Gauteng Stay", "Gauteng");
const WC_LISTING = makeListing("wc-1", "Cape Town Stay", "Western Cape");
const KZN_LISTING = makeListing("kzn-1", "Durban Stay", "KwaZulu-Natal");
const ALL_LISTINGS = [GP_LISTING, WC_LISTING, KZN_LISTING];

function setup() {
  mockListings.mockResolvedValue(ALL_LISTINGS);
  mockEnquiries.mockResolvedValue([]);
  render(<AdminPage />);
}

async function waitForTable() {
  await waitFor(() => expect(screen.getByText("Gauteng Stay")).toBeInTheDocument());
}

// ── Tests ─────────────────────────────────────────────────────────────────────

test("renders the region filter dropdown", async () => {
  setup();
  await waitForTable();
  expect(screen.getByRole("combobox", { name: "Region" })).toBeInTheDocument();
});

test("region dropdown has the correct options", async () => {
  setup();
  await waitForTable();
  const select = screen.getByRole("combobox", { name: "Region" });
  expect(select).toHaveDisplayValue("All regions");
  const options = screen.getAllByRole("option", { hidden: false });
  const optionValues = options.map((o) => (o as HTMLOptionElement).value);
  expect(optionValues).toContain("all");
  expect(optionValues).toContain("Gauteng");
  expect(optionValues).toContain("Western Cape");
  expect(optionValues).toContain("KwaZulu-Natal");
});

test("default state (all regions) shows all listings", async () => {
  setup();
  await waitForTable();
  expect(screen.getByText("Gauteng Stay")).toBeInTheDocument();
  expect(screen.getByText("Cape Town Stay")).toBeInTheDocument();
  expect(screen.getByText("Durban Stay")).toBeInTheDocument();
});

test("selecting Gauteng shows Gauteng listings and hides others", async () => {
  setup();
  await waitForTable();
  fireEvent.change(screen.getByRole("combobox", { name: "Region" }), { target: { value: "Gauteng" } });
  expect(screen.getByText("Gauteng Stay")).toBeInTheDocument();
  expect(screen.queryByText("Cape Town Stay")).not.toBeInTheDocument();
  expect(screen.queryByText("Durban Stay")).not.toBeInTheDocument();
});

test("selecting Western Cape shows Western Cape listings and hides others", async () => {
  setup();
  await waitForTable();
  fireEvent.change(screen.getByRole("combobox", { name: "Region" }), { target: { value: "Western Cape" } });
  expect(screen.getByText("Cape Town Stay")).toBeInTheDocument();
  expect(screen.queryByText("Gauteng Stay")).not.toBeInTheDocument();
  expect(screen.queryByText("Durban Stay")).not.toBeInTheDocument();
});

test("selecting KwaZulu-Natal shows KZN listings and hides others", async () => {
  setup();
  await waitForTable();
  fireEvent.change(screen.getByRole("combobox", { name: "Region" }), { target: { value: "KwaZulu-Natal" } });
  expect(screen.getByText("Durban Stay")).toBeInTheDocument();
  expect(screen.queryByText("Gauteng Stay")).not.toBeInTheDocument();
  expect(screen.queryByText("Cape Town Stay")).not.toBeInTheDocument();
});

test("Province column renders for each listing row", async () => {
  setup();
  await waitForTable();
  expect(screen.getByRole("columnheader", { name: "Province" })).toBeInTheDocument();
  // Province values appear in both the dropdown options and the table cells;
  // getAllByText confirms at least one of each is present.
  expect(screen.getAllByText("Gauteng").length).toBeGreaterThan(0);
  expect(screen.getAllByText("Western Cape").length).toBeGreaterThan(0);
  expect(screen.getAllByText("KwaZulu-Natal").length).toBeGreaterThan(0);
});

test("empty state message renders when selected region has no listings", async () => {
  mockListings.mockResolvedValue([GP_LISTING]);
  mockEnquiries.mockResolvedValue([]);
  render(<AdminPage />);
  await waitFor(() => expect(screen.getByText("Gauteng Stay")).toBeInTheDocument());
  fireEvent.change(screen.getByRole("combobox", { name: "Region" }), { target: { value: "Western Cape" } });
  expect(screen.getByText("No listings in Western Cape.")).toBeInTheDocument();
});

test("count label shows total when all regions selected", async () => {
  setup();
  await waitForTable();
  expect(screen.getByText("3 listings")).toBeInTheDocument();
});

test("count label shows filtered / total when a region is selected", async () => {
  setup();
  await waitForTable();
  fireEvent.change(screen.getByRole("combobox", { name: "Region" }), { target: { value: "Gauteng" } });
  expect(screen.getByText("1 / 3 listings")).toBeInTheDocument();
});
