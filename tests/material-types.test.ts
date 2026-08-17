import { describe, expect, it } from "vitest";

import {
  getMaterialType,
  getMaterialTypes,
  inventorySearchResults,
} from "@/features/inventory/data/mock-data";

describe("material types", () => {
  it("returns a unique alphabetical list of material types", () => {
    const materials = getMaterialTypes();
    const names = materials.map((material) => material.name);

    expect(new Set(names).size).toBe(names.length);
    expect(names).toEqual([...names].sort((a, b) => a.localeCompare(b)));
  });

  it("connects a material type to every matching project", () => {
    const markerBoards = getMaterialType("marker-boards");

    expect(markerBoards?.projects.map((project) => project.projectName)).toEqual([
      "FW Maudrie Walton",
      "Allen ISD",
      "Douglas ISD",
      "Chisum ISD",
      "Naaman Forest GISD",
      "Plano West",
    ]);
  });

  it("opens material search results at the material-type workspace", () => {
    const markerBoardResult = inventorySearchResults.find(
      (result) => result.type === "Material" && result.title === "Marker Boards",
    );

    expect(markerBoardResult?.href).toBe("/inventory/materials/marker-boards");
  });
});
