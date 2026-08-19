import { describe, expect, it } from "vitest";
import { nearestNeighborhood } from "./geocode";

const neighborhoods = [
  { name_ca: "Russafa", municipality: "València", lat: 39.463, lng: -0.3735 },
  { name_ca: "Benimaclet", municipality: "València", lat: 39.485, lng: -0.362 },
];

describe("nearestNeighborhood", () => {
  it("finds the closest neighborhood", () => {
    const n = nearestNeighborhood(neighborhoods, { lat: 39.4635, lng: -0.374 });
    expect(n?.name_ca).toBe("Russafa");
  });

  it("returns null beyond the distance threshold", () => {
    const n = nearestNeighborhood(neighborhoods, { lat: 40.1, lng: -0.3 });
    expect(n).toBeNull();
  });
});
