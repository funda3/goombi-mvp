import { render, screen } from "@testing-library/react";

import { MapLegend } from "./MapLegend";

test("map legend includes the public Goombi marker layers", () => {
  render(<MapLegend />);

  expect(screen.getByText("Circle = Accommodation")).toBeInTheDocument();
  expect(screen.getByText("Square = Workspace")).toBeInTheDocument();
  expect(screen.getByText("Bold Star = Event")).toBeInTheDocument();
  expect(screen.getByLabelText("Bold event marker")).toBeInTheDocument();
  expect(screen.getByText("Solid Moon = Nightlife")).toBeInTheDocument();
  expect(screen.getByLabelText("Bold nightlife moon marker")).toBeInTheDocument();
  expect(screen.getByText("Fork/Food pin = Restaurant")).toBeInTheDocument();
  expect(screen.getByText("Lion = Safari & Wildlife")).toBeInTheDocument();
  expect(screen.getByLabelText("Safari & Wildlife lion marker")).toBeInTheDocument();
  expect(screen.getByText("Township stay = Black circle")).toBeInTheDocument();
  expect(screen.getByText("Township culture/attraction = Black diamond")).toBeInTheDocument();
  expect(screen.getByText("Township market/restaurant = Small black circle")).toBeInTheDocument();
});
