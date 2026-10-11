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
