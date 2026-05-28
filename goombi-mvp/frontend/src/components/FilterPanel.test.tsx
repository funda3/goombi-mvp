import { render, screen } from "@testing-library/react";
import { vi } from "vitest";

import { FilterPanel } from "./FilterPanel";
import { defaultFilters } from "../data/filterListings";

vi.mock("../hooks/useIsMobile", () => ({ useIsMobile: () => false }));

function renderPanel(overrides = {}) {
  return render(
    <FilterPanel
      filters={{ ...defaultFilters, ...overrides }}
      suburbs={[]}
      resultCount={42}
      onChange={() => undefined}
    />,
  );
}

test("renders exactly 5 public layer buttons", () => {
  renderPanel();
  const layerNames = ["Stays", "Workspace", "Events", "Nightlife", "Restaurants"];
  layerNames.forEach((name) => {
    expect(screen.getByRole("button", { name })).toBeInTheDocument();
  });
  expect(layerNames).toHaveLength(5);
});

test("old generic layer buttons are not rendered", () => {
  renderPanel();
  expect(screen.queryByRole("button", { name: "Experiences" })).not.toBeInTheDocument();
  expect(screen.queryByRole("button", { name: "Eats" })).not.toBeInTheDocument();
  expect(screen.queryByRole("button", { name: "Transport" })).not.toBeInTheDocument();
  expect(screen.queryByRole("button", { name: "Estates" })).not.toBeInTheDocument();
});

test("Stays layer button is rendered", () => {
  renderPanel();
  expect(screen.getByRole("button", { name: "Stays" })).toBeInTheDocument();
});

test("Workspace layer button is rendered", () => {
  renderPanel();
  expect(screen.getByRole("button", { name: "Workspace" })).toBeInTheDocument();
});

test("Restaurants layer button is rendered", () => {
  renderPanel();
  expect(screen.getByRole("button", { name: "Restaurants" })).toBeInTheDocument();
});

test("Relocation layer button is NOT rendered", () => {
  renderPanel();
  expect(screen.queryByRole("button", { name: "Relocation" })).not.toBeInTheDocument();
});

test("Property layer button is NOT rendered", () => {
  renderPanel();
  expect(screen.queryByRole("button", { name: "Property" })).not.toBeInTheDocument();
});

test("Business Hubs layer button is NOT rendered", () => {
  renderPanel();
  expect(screen.queryByRole("button", { name: /business/i })).not.toBeInTheDocument();
});

test("result count is displayed", () => {
  renderPanel();
  expect(screen.getByText("42 results")).toBeInTheDocument();
});

test("category filter includes Events option", () => {
  renderPanel();
  expect(screen.getByRole("option", { name: "Events" })).toBeInTheDocument();
});

test("category filter includes Nightlife option", () => {
  renderPanel();
  expect(screen.getByRole("option", { name: "Nightlife" })).toBeInTheDocument();
});

test("category filter includes Restaurants option", () => {
  renderPanel();
  expect(screen.getByRole("option", { name: "Restaurants" })).toBeInTheDocument();
});

test("event type filter renders all event categories", () => {
  renderPanel();
  expect(screen.getByRole("option", { name: "All event types" })).toBeInTheDocument();
  expect(screen.getByRole("option", { name: "Music" })).toBeInTheDocument();
  expect(screen.getByRole("option", { name: "Nature" })).toBeInTheDocument();
});

test("nightlife filters render tier music and venue controls", () => {
  renderPanel();
  expect(screen.getByRole("option", { name: "All nightlife tiers" })).toBeInTheDocument();
  expect(screen.getByRole("option", { name: "All music styles" })).toBeInTheDocument();
  expect(screen.getByRole("option", { name: "All venue types" })).toBeInTheDocument();
});
