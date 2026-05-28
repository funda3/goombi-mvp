import { render, screen } from "@testing-library/react";

import { MapLegend } from "./MapLegend";

test("map legend includes the public Goombi marker layers", () => {
  render(<MapLegend />);

  expect(screen.getByText("Circle = Accommodation")).toBeInTheDocument();
  expect(screen.getByText("Square = Workspace")).toBeInTheDocument();
  expect(screen.getByText("Star/Pulse = Event")).toBeInTheDocument();
  expect(screen.getByText("Moon/Pulse = Nightlife")).toBeInTheDocument();
  expect(screen.getByText("Fork/Food pin = Restaurant")).toBeInTheDocument();
});
