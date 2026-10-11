import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { chauffeurSchema } from "./chauffeur-schema";

type AuthCtx = { supabase: any; userId: string };

async function requireAdmin(context: AuthCtx) {
  const { data: isAdmin } = await context.supabase.rpc("has_role", { _user_id: context.userId, _role: "admin" });
  if (!isAdmin) throw new Error("Accès refusé : droits administrateur requis.");
}

export const listChauffeurs = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data: isAdmin } = await context.supabase.rpc("has_role", { _user_id: context.userId, _role: "admin" });
    if (!isAdmin) return { isAdmin: false as const, rows: [] };
    const { data, error } = await context.supabase
      .from("chauffeurs")
      .select("id, prenom, nom, immatriculation, type_vehicule, couleur_vehicule, telephone, created_at")
      .order("created_at", { ascending: false })
      .limit(20000);
    if (error) {
      console.error(error);
      throw new Error("Impossible de charger les inscriptions.");
    }
    return { isAdmin: true as const, rows: data };
  });

export const updateChauffeur = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => {
    const { id, ...rest } = input as { id: string } & Record<string, unknown>;
    if (!id || typeof id !== "string") throw new Error("Identifiant manquant.");
    return { id, data: chauffeurSchema.parse(rest) };
  })
  .handler(async ({ data, context }) => {
    await requireAdmin(context);
    const { error } = await context.supabase.from("chauffeurs").update(data.data).eq("id", data.id);
    if (error) {
      if (error.code === "23505") return { ok: false as const, error: "Ce véhicule est déjà inscrit au recensement." };
      console.error("updateChauffeur", error);
      return { ok: false as const, error: "Une erreur est survenue. Veuillez réessayer." };
    }
    return { ok: true as const };
  });

export const deleteChauffeur = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => {
    const { id } = input as { id: string };
    if (!id || typeof id !== "string") throw new Error("Identifiant manquant.");
    return { id };
  })
  .handler(async ({ data, context }) => {
    await requireAdmin(context);
    const { error } = await context.supabase.from("chauffeurs").delete().eq("id", data.id);
    if (error) {
      console.error("deleteChauffeur", error);
      return { ok: false as const, error: "Une erreur est survenue. Veuillez réessayer." };
    }
    return { ok: true as const };
  });
