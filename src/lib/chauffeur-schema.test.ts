import { describe, it, expect } from "vitest";
import { buildPhone, chauffeurSchema } from "./chauffeur-schema";

const base = { prenom: "Moussa", nom: "Diop", immatriculation: "dk 1234 a", type_vehicule: "KAIVI", couleur_vehicule: "Blanc", indicatif: "+221", numero: "77 123 45 67" };

describe("recensement", () => {
  it("defaults Senegal numbers to +221 format", () => {
    expect(buildPhone("+221", "77 123 45 67")).toBe("+221771234567");
  });
  it("rejects invalid Senegal numbers", () => {
    expect(buildPhone("+221", "12345")).toBeNull();
  });
  it("accepts international numbers", () => {
    expect(buildPhone("+33", "06 12 34 56 78")).toBe("+33612345678");
  });
  it("normalizes the plate", () => {
    const r = chauffeurSchema.parse(base);
    expect(r.immatriculation).toBe("DK-1234-A");
  });
  it("requires a known color", () => {
    expect(chauffeurSchema.safeParse({ ...base, couleur_vehicule: "Rose" }).success).toBe(false);
  });
  it("accepts the KAIVI vehicle type", () => {
    const r = chauffeurSchema.parse({ ...base, type_vehicule: "KAIVI" });
    expect(r.type_vehicule).toBe("KAIVI");
  });
  it("accepts the MG5 vehicle type", () => {
    const r = chauffeurSchema.parse({ ...base, type_vehicule: "MG5" });
    expect(r.type_vehicule).toBe("MG5");
  });
  it("rejects an unknown vehicle type", () => {
    expect(chauffeurSchema.safeParse({ ...base, type_vehicule: "CLIO" }).success).toBe(false);
  });
});
