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

test("renders exactly 7 public layer buttons", () => {
  renderPanel();
  const layerNames = ["Stays", "Workspace", "Events", "Nightlife", "Restaurants", "Safari & Wildlife", "Township Tourism"];
  layerNames.forEach((name) => {
    expect(screen.getByRole("button", { name })).toBeInTheDocument();
  });
  expect(layerNames).toHaveLength(7);
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

test("category filter includes Safari & Wildlife option", () => {
  renderPanel();
  expect(screen.getByRole("option", { name: "Safari & Wildlife" })).toBeInTheDocument();
});

test("category filter includes Township Tourism option", () => {
  renderPanel();
  expect(screen.getByRole("option", { name: "Township Tourism" })).toBeInTheDocument();
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

test("Township layer chip uses black styling when selected", () => {
  renderPanel({ category: "township" });
  const button = screen.getByRole("button", { name: "Township Tourism" });
  const style = button.getAttribute("style") ?? "";
  expect(style).toMatch(/border-color:\s*(#111827|rgb\(17,\s*24,\s*39\))/i);
  expect(style).toMatch(/background-color:\s*(#111827|rgb\(17,\s*24,\s*39\))/i);
  expect(style).toMatch(/color:\s*(#fff|#ffffff|rgb\(255,\s*255,\s*255\))/i);
});

test("Township layer chip uses black border/text when inactive", () => {
  renderPanel({ category: "accommodation" });
  const button = screen.getByRole("button", { name: "Township Tourism" });
  const style = button.getAttribute("style") ?? "";
  expect(style).toMatch(/border-color:\s*(#111827|rgb\(17,\s*24,\s*39\))/i);
  expect(style).toMatch(/color:\s*(#111827|rgb\(17,\s*24,\s*39\))/i);
  expect(style).toMatch(/background-color:\s*transparent/i);
});

test("township header tagline uses dark accent", () => {
  renderPanel({ category: "township" });
  const tagline = screen.getByText("Authentic South African township experiences");
  expect(tagline.className).toContain("text-slate-900");
  expect(tagline.className).not.toContain("text-orange-700");
});
