import { render, screen } from "@testing-library/react";
import Navbar from "./Navbar";

test("displays correct cart count", () => {
  render(<Navbar cartCount={3} />);
  expect(screen.getByText("3")).toBeInTheDocument();
});