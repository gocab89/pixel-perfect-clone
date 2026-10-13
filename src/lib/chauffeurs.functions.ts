import { z } from "zod";
import { createServerFn } from "@tanstack/react-start";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";
import { buildPhone, chauffeurSchema, lookupPhone } from "./chauffeur-schema";

function publicDb() {
  const key = process.env["SUPABASE_PUBLISHABLE_KEY"]!;
  return createClient<Database>(process.env["SUPABASE_URL"]!, key, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: {
      fetch: (input, init) => {
        const h = new Headers(init?.headers);
        if (key.startsWith("sb_") && h.get("Authorization") === `Bearer ${key}`) h.delete("Authorization");
        h.set("apikey", key);
        return fetch(input, { ...init, headers: h });
      },
    },
  });
}

export const registerChauffeur = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => chauffeurSchema.parse(data))
  .handler(async ({ data }) => {
    const key = process.env["SUPABASE_PUBLISHABLE_KEY"]!;
    const db = createClient<Database>(process.env["SUPABASE_URL"]!, key, {
      auth: { persistSession: false, autoRefreshToken: false },
      global: {
        fetch: (input, init) => {
          const h = new Headers(init?.headers);
          if (key.startsWith("sb_") && h.get("Authorization") === `Bearer ${key}`) h.delete("Authorization");
          h.set("apikey", key);
          return fetch(input, { ...init, headers: h });
        },
      },
    });
    const id = crypto.randomUUID();
    const { error } = await db.from("chauffeurs").insert({ ...data, id });
    if (error) {
      if (error.code === "23505") {
        return { ok: false as const, error: "Cette immatriculation est déjà enregistrée. Vérifiez les informations saisies ou contactez l'administrateur." };
      }
      console.error("registerChauffeur", error);
      return { ok: false as const, error: "Une erreur est survenue. Veuillez réessayer." };
    }
    try {
      const { analyserEtEnregistrer } = await import("./ai-analyse.server");
      await analyserEtEnregistrer(id, data);
    } catch (e) {
      console.error("analyse IA", e); // l'inscription reste valide ; l'admin peut relancer l'analyse
    }
    return { ok: true as const };
  });

export const verifyChauffeur = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => z.string().trim().min(1).parse(data))
  .handler(async ({ data }) => {
    const phone = lookupPhone(data);
    if (!phone) return { ok: false as const, error: "Numéro de téléphone invalide." };
    const { data: rows, error } = await publicDb().rpc("verify_chauffeur", { _telephone: phone });
    if (error) {
      console.error("verifyChauffeur", error);
      return { ok: false as const, error: "Une erreur est survenue. Veuillez réessayer." };
    }
    const chauffeur = rows?.[0] ?? null;
    return { ok: true as const, chauffeur };
  });
