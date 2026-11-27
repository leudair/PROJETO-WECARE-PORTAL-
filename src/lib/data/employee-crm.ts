import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireProfile } from "./auth";
import { CRM_HISTORICO_GRUPOS, type CrmHistoricoGrupo } from "./crm-shared";

// wa_funcionarios tem RLS sem nenhuma politica (so o service role le), por
// isso usa o client admin aqui — mas sempre travado pelo profile_id de quem
// esta logado, nunca por um id vindo de fora. Mesma logica pro
// crm_classificacao: a funcionaria so pode ver a linha do proprio codigo.

// codigo da vendedora (W1, W11, etc) ligado ao profile de quem esta logado,
// ou null se ainda nao tiver vinculo em wa_funcionarios.
export async function minhaCodigoVendedora() {
  const profile = await requireProfile();
  const admin = createAdminClient();
  const { data, error } = await admin.from("wa_funcionarios").select("codigo").eq("profile_id", profile.id).maybeSingle();
  if (error) throw error;
  return data?.codigo ?? null;
}

export async function meuResumoCrm() {
  const codigo = await minhaCodigoVendedora();
  if (!codigo) return null;
  const admin = createAdminClient();

  const contagem = async (grupo?: CrmHistoricoGrupo, pais?: "Brasil" | "fora") => {
    let query = admin.from("crm_classificacao").select("*", { count: "exact", head: true }).eq("codigo_vendedora", codigo);
    if (grupo) query = query.eq("grupo_historico", grupo);
    if (pais) query = query.eq("pais", pais);
    const { count, error } = await query;
    if (error) throw error;
    return count ?? 0;
  };

  const [total, brasil, fora, porGrupo, referencia] = await Promise.all([
    contagem(),
    contagem(undefined, "Brasil"),
    contagem(undefined, "fora"),
    Promise.all(
      CRM_HISTORICO_GRUPOS.map(async (grupo) => ({
        grupo,
        brasil: await contagem(grupo, "Brasil"),
        fora: await contagem(grupo, "fora"),
      })),
    ),
    admin.from("crm_classificacao").select("data_referencia").eq("codigo_vendedora", codigo).limit(1).maybeSingle(),
  ]);

  if (total === 0) return null;
  return { codigo, total, brasil, fora, porGrupo, dataReferencia: referencia.data?.data_referencia ?? null };
}

export async function minhaListaCrm(filtro: { grupo?: CrmHistoricoGrupo; busca?: string; pagina?: number } = {}) {
  const codigo = await minhaCodigoVendedora();
  const pagina = filtro.pagina ?? 0;
  const porPagina = 50;
  if (!codigo) return { contatos: [], total: 0, pagina, porPagina };

  const admin = createAdminClient();
  let query = admin
    .from("crm_classificacao")
    .select("*", { count: "exact" })
    .eq("codigo_vendedora", codigo)
    .order("nome_novo", { ascending: true })
    .range(pagina * porPagina, pagina * porPagina + porPagina - 1);

  if (filtro.grupo) query = query.eq("grupo_historico", filtro.grupo);
  if (filtro.busca) query = query.or(`nome_novo.ilike.%${filtro.busca}%,telefone.ilike.%${filtro.busca}%`);

  const { data, error, count } = await query;
  if (error) throw error;
  return { contatos: data, total: count ?? 0, pagina, porPagina };
}
