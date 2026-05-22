import { fireEvent, render, screen } from "@testing-library/react";
import { useState } from "react";

import { ListingDetailDrawer } from "./ListingDetailDrawer";
import { MockMap } from "./MockMap";
import type { Listing } from "../types/listing";

const listing: Listing = {
  id: "demo-marker",
  name: "Bryanston Marker Stay",
  category: "guesthouse",
  province: "Gauteng",
  city: "Johannesburg",
  suburb: "Bryanston",
  address: "Demo address",
  latitude: -26.0524,
  longitude: 28.0241,
  price_per_night: 1180,
  max_guests: 4,
  rooms: 2,
  description: "Synthetic listing.",
  amenities: ["WiFi"],
  photos: [],
  owner_name: "Demo Owner",
  owner_phone: "+27110000000",
  verified_status: true,
  source_type: "manual_seed",
  created_at: "2026-05-22T00:00:00Z",
  updated_at: "2026-05-22T00:00:00Z",
};

const workspace: Listing = {
  ...listing,
  id: "workspace-marker",
  name: "TBE Boardroom",
  category: "workspace",
  provider_name: "The Business Exchange / TBE",
  workspace_type: "boardroom",
  pricing_status: "public_price",
  price_amount: 86.25,
  price_unit: "hour displayed",
  capacity: 18,
  booking_url: "https://example.com/book",
  source_url: "https://example.com/source",
  source_note: "Public provider record.",
};

function SelectionHarness() {
  const [selected, setSelected] = useState<Listing>();
  return (
    <>
      <MockMap listings={[listing]} selectedId={selected?.id} onSelect={setSelected} />
      <ListingDetailDrawer listing={selected} onClose={() => setSelected(undefined)} />
    </>
  );
}

test("renders zoom controls and updates the zoom label", () => {
  render(<MockMap listings={[listing]} onSelect={() => undefined} />);

  expect(screen.getByRole("button", { name: "Zoom in" })).toBeInTheDocument();
  expect(screen.getByRole("button", { name: "Zoom out" })).toBeInTheDocument();
  expect(screen.getByRole("button", { name: "Reset map view" })).toBeInTheDocument();
  expect(screen.getByText("1.00x")).toBeInTheDocument();

  fireEvent.click(screen.getByRole("button", { name: "Zoom in" }));
  expect(screen.getByText("1.25x")).toBeInTheDocument();
}, 10000);

test("resets zoom to the default view", () => {
  render(<MockMap listings={[listing]} onSelect={() => undefined} />);

  fireEvent.click(screen.getByRole("button", { name: "Zoom in" }));
  fireEvent.click(screen.getByRole("button", { name: "Reset map view" }));

  expect(screen.getByText("1.00x")).toBeInTheDocument();
});

test("marker click still opens listing details", () => {
  render(<SelectionHarness />);

  fireEvent.click(screen.getByRole("button", { name: "Open Bryanston Marker Stay" }));

  expect(screen.getByRole("heading", { name: "Bryanston Marker Stay" })).toBeInTheDocument();
});

test("workspace marker and drawer expose provider pricing and source", () => {
  function WorkspaceHarness() {
    const [selected, setSelected] = useState<Listing>();
    return (
      <>
        <MockMap listings={[workspace]} selectedId={selected?.id} onSelect={setSelected} />
        <ListingDetailDrawer listing={selected} onClose={() => setSelected(undefined)} />
      </>
    );
  }

  render(<WorkspaceHarness />);
  const marker = screen.getByRole("button", { name: "Open TBE Boardroom" });
  expect(marker).toHaveClass("rotate-45");

  fireEvent.click(marker);

  expect(screen.getByText(/The Business Exchange/)).toBeInTheDocument();
  expect(screen.getByText("Displayed price 86.25/hour displayed")).toBeInTheDocument();
  expect(screen.getByText(/Public provider record/)).toBeInTheDocument();
});
