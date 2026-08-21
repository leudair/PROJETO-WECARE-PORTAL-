// Tipos escritos a mao a partir de supabase/migrations/0001_init.sql.
// Assim que o projeto Supabase existir, substituir por:
//   npx supabase gen types typescript --project-id <id> > src/lib/supabase/database.types.ts

export type ContactType = "cliente" | "lead";
export type ContactStatus = "pending" | "done";
export type DispatchStatus = "scheduled" | "sent" | "replied" | "failed";
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
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
}
