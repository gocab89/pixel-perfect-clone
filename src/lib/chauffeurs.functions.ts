import { z } from "zod";
import { createServerFn } from "@tanstack/react-start";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";
import { buildPhone, chauffeurSchema } from "./chauffeur-schema";

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
    const { error } = await db.from("chauffeurs").insert(data);
    if (error) {
      if (error.code === "23505") {
        return { ok: false as const, error: "Cette immatriculation est déjà enregistrée. Vérifiez les informations saisies ou contactez l'administrateur." };
      }
      console.error("registerChauffeur", error);
      return { ok: false as const, error: "Une erreur est survenue. Veuillez réessayer." };
    }
    return { ok: true as const };
  });

const phoneQuerySchema = z
  .string()
  .transform((v) => v.replace(/[\s.-]/g, ""))
  .pipe(z.string().regex(/^\+?[0-9]{8,15}$/, "Numéro de téléphone invalide"));

export const verifyChauffeur = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => phoneQuerySchema.parse(data))
  .handler(async ({ data }) => {
    const phone = data.startsWith("+") ? data : `+221${data.replace(/^0+/, "")}`;
    const { data: rows, error } = await publicDb().rpc("verify_chauffeur", { _telephone: phone });
    if (error) {
      console.error("verifyChauffeur", error);
      return { ok: false as const, error: "Une erreur est survenue. Veuillez réessayer." };
    }
    const chauffeur = rows?.[0] ?? null;
    return { ok: true as const, chauffeur };
  });
