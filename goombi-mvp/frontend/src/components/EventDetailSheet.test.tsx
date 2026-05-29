import { render, screen } from "@testing-library/react";

import { EventDetailSheet } from "./EventDetailSheet";
import type { EventRecord } from "../types/event";
import type { Listing } from "../types/listing";

const event: EventRecord = {
  id: "event-kzn-durban-july",
  name: "Durban July",
  category: "lifestyle",
  province: "KwaZulu-Natal",
  city: "Durban",
  suburb: "Greyville",
  venue: "Greyville Racecourse",
  latitude: -29.8437,
  longitude: 31.0124,
  coordinate_accuracy: "venue",
  start_month: "July",
  end_month: "July",
  recurring_type: "annual",
  description: "High-profile horse racing and fashion lifestyle event.",
  website_url: null,
  nearby_focus: "mixed",
  source_type: "events_guide_manual_seed",
  source_document: "Goombi_SA_Events_and_Markets_Guide(2).docx",
  verified_status: "guide_seed_phase_1",
};

const nearbyAccommodation: Listing = {
  id: "acc-1",
  name: "Berea Stay",
  category: "guesthouse",
  province: "KwaZulu-Natal",
  city: "Durban",
  suburb: "Berea",
  address: "1 Test Street",
  latitude: -29.846,
  longitude: 31.01,
  price_per_night: 1200,
  max_guests: 2,
  rooms: 1,
  description: "A nearby stay.",
  amenities: [],
  photos: [],
  owner_name: "Test Owner",
  owner_phone: "+27110000000",
  verified_status: true,
  source_type: "manual_seed",
  created_at: "2026-05-22T00:00:00Z",
  updated_at: "2026-05-22T00:00:00Z",
};

const nearbyWorkspace: Listing = {
  ...nearbyAccommodation,
  id: "ws-1",
  name: "Durban Workspace",
  category: "workspace",
  workspace_type: "coworking",
  provider_name: "Workspace Co",
  pricing_status: "not_publicly_available",
  source_url: "https://example.com",
  source_note: "Seeded",
  latitude: -29.844,
  longitude: 31.013,
};

test("shows event details and nearby accommodation/workspace section", () => {
  render(<EventDetailSheet event={event} allListings={[nearbyAccommodation, nearbyWorkspace]} onClose={() => undefined} />);

  expect(screen.getByRole("heading", { name: "Durban July" })).toBeInTheDocument();
  expect(screen.getByText("Goombi Events Guide")).toBeInTheDocument();
  expect(screen.getByText("Nearby Accommodation and Workspace")).toBeInTheDocument();
  expect(screen.getByText("Berea Stay")).toBeInTheDocument();
  expect(screen.getByText("Durban Workspace")).toBeInTheDocument();
});

test("uses right-side desktop bounds above nearby services", () => {
  render(<EventDetailSheet event={event} allListings={[nearbyAccommodation, nearbyWorkspace]} onClose={() => undefined} />);

  const sheet = screen.getByTestId("event-bottom-sheet");
  expect(sheet).toHaveAttribute("data-placement", "right-drawer");
  expect(sheet.className).toContain("md:right-20");
  expect(sheet.className).toContain("md:top-24");
  expect(sheet.className).toContain("md:bottom-52");
  expect(sheet.className).toContain("md:max-h-none");
  expect(sheet.querySelector(".overflow-y-auto")).toBeInTheDocument();
});
