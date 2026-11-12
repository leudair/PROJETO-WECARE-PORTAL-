// Tipos escritos a mao a partir de supabase/migrations/0001_init.sql.
// Assim que o projeto Supabase existir, substituir por:
//   npx supabase gen types typescript --project-id <id> > src/lib/supabase/database.types.ts

export interface LembreteTelegramItem {
  id: number;
  cliente_nome: string | null;
  cliente_telefone: string;
  contato_data: string | null;
  status: string;
  enviado_em: string | null;
  aberto_em: string | null;
  cliques: number;
  confirmado_em: string | null;
  resultado: "chamei" | "nao_consegui" | null;
}

export interface LembretesTelegram {
  no_telegram: boolean;
  na_fila: number;
  recebidos: number;
  recebidos_hoje: number;
  abertos: number;
  chamados: number;
  chamados_hoje: number;
  nao_conseguiu: number;
  sem_resposta: number;
  lista: LembreteTelegramItem[];
}

export type ContactType = "cliente" | "lead";
export type ContactStatus = "pending" | "done";
export type DispatchStatus = "scheduled" | "sent" | "replied" | "failed";
// Resumo por vendedora calculado no banco (portal_resumo_vendedora).
export interface PortalResumo {
  lembretes_cadastrados: number;
  vendas_portal_qtd: number;
  vendas_portal_valor: number;
  disparos_enviados: number;
  disparos_respondidos: number;
  disparos_falhados: number;
  site_conversas: number;
  site_vendas_qtd: number;
  site_vendas_valor: number;
  site_cancelados: number;
  followups_programados: number;
  followups_pendentes: number;
  codigo_w: string | null;
}

export type CorContato = "verde" | "azul" | "amarelo" | "cinza";
export type ContagemCores = Record<CorContato, number>;
export interface ContatoCor {
  telefone: string;
  nome: string | null;
  cor: CorContato;
  qtd_compras: number | null;
  valor_estimado: number | null;
  data_compra: string | null;
  ultima_msg_cliente: string | null;
  motivo: string | null;
}

export type ProfileRole = "employee" | "admin" | "manager" | "financeiro";

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          full_name: string;
          whatsapp_number: string;
          role: ProfileRole;
          created_at: string;
        };
        Insert: {
          id: string;
          full_name: string;
          whatsapp_number: string;
          role?: ProfileRole;
          created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["profiles"]["Insert"]>;
        Relationships: [];
      };
      contacts: {
        Row: {
          id: string;
          owner_id: string;
          name: string;
          instagram_handle: string | null;
          phone: string;
          contact_type: ContactType;
          attempt_stage: number | null;
          next_contact_date: string;
          status: ContactStatus;
          last_purchase_value: number | null;
          lead_interest_value: number | null;
          converted: boolean;
          converted_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          owner_id: string;
          name: string;
          instagram_handle?: string | null;
          phone: string;
          contact_type: ContactType;
          attempt_stage?: number | null;
          next_contact_date: string;
          status?: ContactStatus;
          last_purchase_value?: number | null;
          lead_interest_value?: number | null;
          converted?: boolean;
          converted_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["contacts"]["Insert"]>;
        Relationships: [
          {
            foreignKeyName: "contacts_owner_id_fkey";
            columns: ["owner_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      message_templates: {
        Row: {
          stage: number;
          body: string;
          updated_at: string;
        };
        Insert: {
          stage: number;
          body?: string;
          updated_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["message_templates"]["Insert"]>;
        Relationships: [];
      };
      reminder_dispatches: {
        Row: {
          id: string;
          contact_id: string;
          employee_id: string;
          scheduled_for: string;
          sent_at: string | null;
          zapi_message_id: string | null;
          replied_at: string | null;
          status: DispatchStatus;
          confirmation_code: string | null;
          flagged_suspicious: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          contact_id: string;
          employee_id: string;
          scheduled_for: string;
          sent_at?: string | null;
          zapi_message_id?: string | null;
          replied_at?: string | null;
          status?: DispatchStatus;
          confirmation_code?: string | null;
          flagged_suspicious?: boolean;
          created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["reminder_dispatches"]["Insert"]>;
        Relationships: [
          {
            foreignKeyName: "reminder_dispatches_contact_id_fkey";
            columns: ["contact_id"];
            isOneToOne: false;
            referencedRelation: "contacts";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "reminder_dispatches_employee_id_fkey";
            columns: ["employee_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      employee_notices: {
        Row: {
          id: string;
          employee_id: string;
          created_by: string;
          message: string;
          read_at: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          employee_id: string;
          created_by: string;
          message: string;
          read_at?: string | null;
          created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["employee_notices"]["Insert"]>;
        Relationships: [
          {
            foreignKeyName: "employee_notices_employee_id_fkey";
            columns: ["employee_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "employee_notices_created_by_fkey";
            columns: ["created_by"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      financial_entries: {
        Row: {
          id: string;
          employee_id: string;
          week_start_date: string;
          week_end_date: string;
          faturamento: number;
          custo_operacional: number;
          custo_anuncios: number;
          created_by: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          employee_id: string;
          week_start_date: string;
          week_end_date: string;
          faturamento: number;
          custo_operacional: number;
          custo_anuncios: number;
          created_by: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["financial_entries"]["Insert"]>;
        Relationships: [
          {
            foreignKeyName: "financial_entries_employee_id_fkey";
            columns: ["employee_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "financial_entries_created_by_fkey";
            columns: ["created_by"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      monthly_revenue_entries: {
        Row: {
          id: string;
          employee_id: string;
          month_start_date: string;
          faturamento: number;
          created_by: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          employee_id: string;
          month_start_date: string;
          faturamento: number;
          created_by: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["monthly_revenue_entries"]["Insert"]>;
        Relationships: [
          {
            foreignKeyName: "monthly_revenue_entries_employee_id_fkey";
            columns: ["employee_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "monthly_revenue_entries_created_by_fkey";
            columns: ["created_by"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      portal_expediente: {
        Row: {
          id: number;
          profile_id: string;
          dia: string;
          aberto_em: string;
          fechado_em: string | null;
        };
        Insert: never;
        Update: never;
        Relationships: [];
      };
      portal_relatorio_dia: {
        Row: {
          id: number;
          profile_id: string;
          dia: string;
          resumo: PortalResumo;
          observacao: string | null;
          assinado_em: string;
          gerente_id: string | null;
          gerente_assinado_em: string | null;
          gerente_observacao: string | null;
        };
        Insert: never;
        Update: never;
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: {
      portal_tem_codigo: { Args: Record<PropertyKey, never>; Returns: boolean };
      portal_definir_codigo: { Args: { p_novo: string; p_atual?: string | null }; Returns: string };
      portal_abrir_dia: { Args: { p_codigo: string }; Returns: string };
      portal_fechar_dia: { Args: { p_codigo: string; p_observacao?: string | null }; Returns: string };
      portal_gerente_assinar: {
        Args: { p_relatorio: number; p_codigo: string; p_observacao?: string | null };
        Returns: string;
      };
      portal_registrar_ver_como: { Args: { p_alvo: string }; Returns: undefined };
      portal_contatos_por_cor: { Args: { p_profile: string }; Returns: ContagemCores };
      portal_lista_contatos_cor: {
        Args: { p_profile: string; p_cor: string; p_limite?: number };
        Returns: ContatoCor[];
      };
      portal_lembretes_telegram: {
        Args: { p_profile: string; p_dias?: number; p_limite?: number };
        Returns: LembretesTelegram | null;
      };
      portal_resumo_vendedora: { Args: { p_profile: string; p_de: string; p_ate: string }; Returns: PortalResumo };
      get_weekly_leaderboard: {
        Args: Record<PropertyKey, never>;
        Returns: {
          employee_id: string;
          full_name: string;
          faturamento: number;
          week_start_date: string;
          week_end_date: string;
        }[];
      };
    };
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
}
