import "server-only";

// Os 4 grupos do histórico de 6 meses, compartilhados entre a visão do admin
// (qualquer vendedora) e a visão da própria vendedora (só os dela).
export const CRM_HISTORICO_GRUPOS = ["cliente engajado", "cliente parado", "lead engajado", "lead não engajado"] as const;
export type CrmHistoricoGrupo = (typeof CRM_HISTORICO_GRUPOS)[number];
