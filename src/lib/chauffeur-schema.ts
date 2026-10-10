import { z } from "zod";

export const TYPE_VEHICULES = ["KAIVI", "MG5"] as const;

export const COULEURS = [
  "Blanc", "Noir", "Gris", "Argent", "Rouge", "Bleu",
  "Vert", "Jaune", "Beige", "Marron", "Autre",
] as const;

export const INDICATIFS = [
  { code: "+221", pays: "Sénégal" },
  { code: "+33", pays: "France" },
  { code: "+223", pays: "Mali" },
  { code: "+224", pays: "Guinée" },
  { code: "+220", pays: "Gambie" },
  { code: "+222", pays: "Mauritanie" },
  { code: "+225", pays: "Côte d'Ivoire" },
  { code: "+245", pays: "Guinée-Bissau" },
  { code: "+1", pays: "États-Unis / Canada" },
] as const;

/** Normalise une plaque: majuscules, espaces/points -> tirets. */
export function normalizePlate(v: string) {
  return v.trim().toUpperCase().replace(/[\s.]+/g, "-").replace(/-+/g, "-");
}

// Formats sénégalais: ancien "DK-1234-A", nouveau "AA-123-AB", ou variantes alphanumériques.
const PLATE_RE = /^(?:[A-Z]{1,3}-?\d{3,4}-?[A-Z]{0,3}|[A-Z]{2}-?\d{3}-?[A-Z]{2})$/;

/** Retourne le numéro complet au format E.164 ou null si invalide. */
export function buildPhone(indicatif: string, numero: string): string | null {
  const digits = numero.replace(/[\s.\-()]/g, "").replace(/^0+/, "");
  if (!/^\d+$/.test(digits)) return null;
  if (indicatif === "+221") {
    // Mobiles 70/71/75/76/77/78 et fixes 33, 9 chiffres
    if (!/^(7[0-8]|33)\d{7}$/.test(digits)) return null;
  }
  const full = `${indicatif}${digits}`;
  return /^\+[1-9]\d{6,14}$/.test(full) ? full : null;
}

const nameField = (label: string) =>
  z.string().trim().min(1, `Le ${label} est obligatoire`).max(80, `Le ${label} est trop long`)
    .regex(/^[\p{L}\s'’-]+$/u, `Le ${label} contient des caractères non valides`);

export const chauffeurSchema = z
  .object({
    prenom: nameField("prénom"),
    nom: nameField("nom"),
    immatriculation: z.string().transform(normalizePlate)
      .refine((v) => PLATE_RE.test(v), "Immatriculation invalide (ex : DK-1234-A ou AA-123-BC)"),
    type_vehicule: z.enum(TYPE_VEHICULES, { message: "Veuillez choisir un type de véhicule" }),
    couleur_vehicule: z.enum(COULEURS, { message: "Veuillez choisir une couleur" }),
    indicatif: z.string().regex(/^\+\d{1,4}$/, "Indicatif invalide"),
    numero: z.string().trim().min(1, "Le numéro de téléphone est obligatoire"),
    website: z.string().max(0).optional(), // anti-robot (honeypot)
  })
  .transform((d, ctx) => {
    const telephone = buildPhone(d.indicatif, d.numero);
    if (!telephone) {
      ctx.addIssue({ code: "custom", path: ["numero"], message: "Numéro de téléphone invalide" });
      return z.NEVER;
    }
    return { prenom: d.prenom, nom: d.nom, immatriculation: d.immatriculation, type_vehicule: d.type_vehicule, couleur_vehicule: d.couleur_vehicule, telephone };
  });

export type ChauffeurInput = z.input<typeof chauffeurSchema>;
