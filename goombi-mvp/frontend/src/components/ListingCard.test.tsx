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
