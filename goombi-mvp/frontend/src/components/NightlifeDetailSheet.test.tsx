import { render, screen } from "@testing-library/react";

import { NightlifeDetailSheet } from "./NightlifeDetailSheet";
import type { EventRecord } from "../types/event";
import type { Listing } from "../types/listing";
import type { NightlifeVenue } from "../types/nightlife";

const venue: NightlifeVenue = {
  id: "nightlife-kzn-origin",
  name: "Origin Nightclub",
  province: "KwaZulu-Natal",
  city: "Durban",
  suburb: "Umhlanga",
  address: "Umhlanga nightlife strip",
  latitude: -29.7269,
  longitude: 31.0842,
  coordinate_accuracy: "approximate",
  nightlife_tier: "premium",
  music_focus: ["afrobeats", "house"],
  venue_type: "nightclub",
  description: "Demo nightlife venue",
  opening_pattern: "Fri-Sat nights",
  website_url: null,
  instagram_url: null,
  source_type: "manual_seed",
  source_note: "Seed",
  verified_status: "unverified_public_research",
};

const accommodation: Listing = {
  id: "acc-1",
  name: "Umhlanga Stay",
  category: "guesthouse",
  listing_type: "accommodation",
  province: "KwaZulu-Natal",
  city: "Durban",
  suburb: "Umhlanga",
  address: "1 Test Street",
  latitude: -29.727,
  longitude: 31.084,
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

test("shows nightlife details", () => {
  render(<NightlifeDetailSheet venue={venue} allListings={[accommodation]} allEvents={[event]} onClose={() => undefined} />);

  expect(screen.getByRole("heading", { name: "Origin Nightclub" })).toBeInTheDocument();
  expect(screen.getByText("Goombi Nightlife")).toBeInTheDocument();
});

test("uses right-side desktop bounds above nearby services", () => {
  render(<NightlifeDetailSheet venue={venue} allListings={[accommodation]} allEvents={[event]} onClose={() => undefined} />);

  const sheet = screen.getByTestId("nightlife-bottom-sheet");
  expect(sheet).toHaveAttribute("data-placement", "right-drawer");
  expect(sheet.className).toContain("md:right-20");
  expect(sheet.className).toContain("md:top-24");
  expect(sheet.className).toContain("md:bottom-52");
  expect(sheet.className).toContain("md:max-h-none");
  expect(sheet.querySelector(".overflow-y-auto")).toBeInTheDocument();
});
