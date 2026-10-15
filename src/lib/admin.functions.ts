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
      .select("id, prenom, nom, immatriculation, type_vehicule, couleur_vehicule, telephone, created_at, ai_resume, ai_incomplet, ai_points, ai_analyse_le")
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

export const analyseChauffeur = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => {
    const { id } = input as { id: string };
    if (!id || typeof id !== "string") throw new Error("Identifiant manquant.");
    return { id };
  })
  .handler(async ({ data, context }) => {
    await requireAdmin(context);
    const { data: c, error } = await context.supabase
      .from("chauffeurs").select("prenom, nom, immatriculation, type_vehicule, couleur_vehicule, telephone").eq("id", data.id).single();
    if (error || !c) return { ok: false as const, error: "Chauffeur introuvable." };
    try {
      const { analyserEtEnregistrer } = await import("./ai-analyse.server");
      await analyserEtEnregistrer(data.id, c);
      return { ok: true as const };
    } catch (e) {
      console.error("analyseChauffeur", e);
      const m = String(e);
      if (m.includes(" 402") || m.includes(" 403")) return { ok: false as const, error: "Crédits IA épuisés ou accès IA désactivé pour l'espace de travail." };
      if (m.includes(" 429")) return { ok: false as const, error: "Trop de demandes à l'IA. Réessayez dans un instant." };
      return { ok: false as const, error: "L'analyse IA a échoué. Réessayez plus tard." };
    }
  });

// Analyse en lot : traite au plus 5 dossiers non analysés par appel, s'arrête à la première erreur.
export const analyseLot = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await requireAdmin(context);
    const { data: rows, error } = await context.supabase
      .from("chauffeurs").select("id, prenom, nom, immatriculation, type_vehicule, couleur_vehicule, telephone")
      .is("ai_analyse_le", null).order("created_at", { ascending: false }).limit(5);
    if (error) return { ok: false as const, error: "Impossible de charger les dossiers.", traites: 0, restants: 0 };
    const { analyserEtEnregistrer } = await import("./ai-analyse.server");
    let traites = 0;
    for (const r of rows ?? []) {
      try {
        const { id, ...c } = r;
        await analyserEtEnregistrer(id, c);
        traites++;
      } catch (e) {
        console.error("analyseLot", e);
        const m = String(e);
        const msg = m.includes(" 402") || m.includes(" 403") ? "Crédits IA épuisés ou accès IA désactivé pour l'espace de travail."
          : m.includes(" 429") ? "Trop de demandes à l'IA. Réessayez dans quelques minutes."
          : "L'analyse IA a échoué pour un dossier. Réessayez plus tard.";
        return { ok: false as const, error: msg, traites, restants: -1 };
      }
    }
    const { count } = await context.supabase.from("chauffeurs").select("id", { count: "exact", head: true }).is("ai_analyse_le", null);
    return { ok: true as const, traites, restants: count ?? 0 };
  });
