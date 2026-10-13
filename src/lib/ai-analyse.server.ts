// Server-only: summarises a driver registration through Lovable AI Gateway (Responses API, streamed).
type Input = { prenom: string; nom: string; immatriculation: string; type_vehicule: string; couleur_vehicule: string; telephone: string };
export type Analyse = { resume: string; incomplet: boolean; points: string[] };

const SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: ["resume", "incomplet", "points"],
  properties: {
    resume: { type: "string" },
    incomplet: { type: "boolean" },
    points: { type: "array", items: { type: "string" } },
  },
};

export async function analyserInscription(c: Input): Promise<Analyse> {
  const key = process.env["LOVABLE_API_KEY"];
  if (!key) throw new Error("LOVABLE_API_KEY manquante");
  const res = await fetch("https://ai.gateway.lovable.dev/v1/responses", {
    method: "POST",
    headers: { "Content-Type": "application/json", "Lovable-API-Key": key, "X-Lovable-AIG-SDK": "fetch" },
    body: JSON.stringify({
      model: "openai/gpt-6-astra",
      stream: true,
      store: false,
      reasoning: { effort: "low" },
      instructions:
        "Tu vérifies des inscriptions de chauffeurs VTC Gocab (Sénégal) pour les Jeux Olympiques. " +
        "Formats valides : immatriculations sénégalaises du type AB-123-CD ou DK-1234-AA ; types de véhicule KAIVI et MG5 (modèles de la flotte) ; téléphones E.164. Ne signale pas ces formats. " +
        "Rédige en français un résumé d'une phrase du dossier. Indique incomplet=true si une information semble manquante, " +
        "fictive ou douteuse (prénom/nom d'une lettre, répétés ou de test, immatriculation au format inhabituel, couleur 'Autre', numéro suspect). " +
        "Liste dans points chaque problème, en phrases courtes ; tableau vide si le dossier est complet.",
      input: JSON.stringify(c),
      text: { format: { type: "json_schema", name: "analyse", strict: true, schema: SCHEMA } },
    }),
  });
  if (!res.ok || !res.body) throw new Error(`AI Gateway ${res.status}: ${(await res.text()).slice(0, 300)}`);
  const reader = res.body.getReader();
  const dec = new TextDecoder();
  let buf = "", text = "";
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    buf += dec.decode(value, { stream: true });
    let i;
    while ((i = buf.indexOf("\n")) >= 0) {
      const line = buf.slice(0, i).trim();
      buf = buf.slice(i + 1);
      if (!line.startsWith("data:")) continue;
      const payload = line.slice(5).trim();
      if (payload === "[DONE]") continue;
      try {
        const ev = JSON.parse(payload);
        if (ev.type === "response.output_text.delta") text += ev.delta;
        if (ev.type === "error" || ev.type === "response.failed") throw new Error(JSON.stringify(ev).slice(0, 300));
      } catch (e) {
        if (e instanceof Error && e.message.startsWith("{")) throw e;
      }
    }
  }
  const out = JSON.parse(text) as Analyse;
  return { resume: String(out.resume).slice(0, 500), incomplet: !!out.incomplet, points: (out.points ?? []).slice(0, 10).map(String) };
}

export async function analyserEtEnregistrer(id: string, c: Input) {
  const a = await analyserInscription(c);
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { error } = await supabaseAdmin
    .from("chauffeurs")
    .update({ ai_resume: a.resume, ai_incomplet: a.incomplet, ai_points: a.points, ai_analyse_le: new Date().toISOString() })
    .eq("id", id);
  if (error) throw error;
  return a;
}
