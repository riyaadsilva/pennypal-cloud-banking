import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import Penny from "../components/Penny.jsx";
import { Coin, Progress } from "../components/ui.jsx";
import Landing from "../pages/Landing.jsx";
import { AuthProvider } from "../context/AuthContext.jsx";

globalThis.IntersectionObserver = class { observe() {} unobserve() {} disconnect() {} };
globalThis.fetch = async () => ({ ok: false, status: 401, json: async () => ({}) });

describe("PennyPal smoke tests", () => {
  it("renders every Penny mood", () => {
    for (const mood of ["happy", "wave", "think", "celebrate", "sleep", "oops"]) {
      const { unmount } = render(<Penny mood={mood} />);
      expect(screen.getByRole("img", { name: new RegExp(mood) })).toBeTruthy();
      unmount();
    }
  });
  it("renders the coin icon and an accessible progress bar", () => {
    render(<><Coin /><Progress value={42} label="demo" /></>);
    expect(screen.getByRole("progressbar", { name: "demo" }).getAttribute("aria-valuenow")).toBe("42");
  });
  it("landing page shows the hero heading and both calls to action", () => {
    render(<MemoryRouter><AuthProvider><Landing /></AuthProvider></MemoryRouter>);
    expect(screen.getByRole("heading", { level: 1 }).textContent).toContain("Little Money");
    expect(screen.getByText("Get Started")).toBeTruthy();
    expect(screen.getByText("Explore Demo")).toBeTruthy();
  });
});
