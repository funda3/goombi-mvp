import { render, screen } from "@testing-library/react";

import { ListingCard } from "./ListingCard";
import type { Listing } from "../types/listing";

test("renders listing summary and verified badge", () => {
  const listing: Listing = {
    id: "demo",
    name: "Jacaranda House",
    category: "guesthouse",
    province: "Gauteng",
    city: "Johannesburg",
    suburb: "Bryanston",
    address: "Demo",
    latitude: -26.05,
    longitude: 28.02,
    price_per_night: 1100,
    max_guests: 4,
    rooms: 2,
    description: "Demo",
    amenities: [],
    photos: [],
    owner_name: "Owner",
    owner_phone: "+27110000000",
    verified_status: true,
    source_type: "manual_seed",
    created_at: "2026-05-22T00:00:00Z",
    updated_at: "2026-05-22T00:00:00Z",
  };

  render(<ListingCard listing={listing} />);
  expect(screen.getByText("Jacaranda House")).toBeInTheDocument();
  expect(screen.getByText("R1100/night")).toBeInTheDocument();
  expect(screen.getByLabelText("Verified listing")).toBeInTheDocument();
});

test("renders non-accommodation listing with null rooms and max_guests without crashing", () => {
  const listing: Listing = {
    id: "estate-01",
    name: "Waterfall Estate",
    category: "accommodation",
    listing_type: "estate_living_zone",
    province: "Gauteng",
    city: "Johannesburg",
    suburb: "Midrand",
    address: "Estate Rd",
    latitude: -26.02,
    longitude: 28.12,
    price_per_night: 0,
    max_guests: null,
    rooms: null,
    description: "Estate discovery listing.",
    amenities: [],
    photos: [],
    owner_name: "",
    owner_phone: "",
    verified_status: false,
    source_type: "manual_seed",
    created_at: "2026-05-22T00:00:00Z",
    updated_at: "2026-05-22T00:00:00Z",
  };

  // Must not throw and must render name
  render(<ListingCard listing={listing} />);
  expect(screen.getByText("Waterfall Estate")).toBeInTheDocument();
  // No "0 rooms" or "0 guests" shown
  expect(screen.queryByText(/0 rooms/i)).not.toBeInTheDocument();
});
