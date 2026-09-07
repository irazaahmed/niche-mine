// Hand-written to match supabase/migrations/0001_init.sql. Once the
// nichemine-dev Supabase project is live, this can be regenerated with:
//   npx supabase gen types typescript --project-id <id> > lib/supabase/types.ts
//
// Shape (Tables/Views/Functions, each table's Relationships array) mirrors
// what `supabase gen types` emits — @supabase/postgrest-js's generic
// helpers require exactly this shape (GenericSchema/GenericTable in
// @supabase/postgrest-js/src/types/common/common.ts); leaving out
// `Relationships`/`Views`/`Functions` collapses every Row/Insert/Update
// type to `never`.

export type UserRole = "user" | "admin";
export type UserStatus = "active" | "blocked";
export type NicheStatus = "researching" | "finalized" | "rejected";

export interface Database {
  public: {
    Tables: {
      users: {
        Row: {
          id: string;
          email: string;
          role: UserRole;
          plan: string;
          status: UserStatus;
          ai_calls_count: number;
          ai_calls_limit: number;
          last_reset_date: string;
          created_at: string;
        };
        Insert: Partial<Database["public"]["Tables"]["users"]["Row"]> & {
          id: string;
          email: string;
        };
        Update: Partial<Database["public"]["Tables"]["users"]["Row"]>;
        Relationships: [];
      };
      niches: {
        Row: {
          id: string;
          user_id: string;
          country: string;
          status: NicheStatus;
          created_at: string;
        };
        Insert: Partial<Database["public"]["Tables"]["niches"]["Row"]> & {
          user_id: string;
          country: string;
        };
        Update: Partial<Database["public"]["Tables"]["niches"]["Row"]>;
        Relationships: [];
      };
      seed_keyword_batches: {
        Row: {
          id: string;
          niche_id: string;
          ai_prompt_used: string | null;
          filters_applied: Record<string, unknown> | null;
          csv_file_url: string | null;
          parsed_data: unknown | null;
          created_at: string;
        };
        Insert: Partial<Database["public"]["Tables"]["seed_keyword_batches"]["Row"]> & {
          niche_id: string;
        };
        Update: Partial<Database["public"]["Tables"]["seed_keyword_batches"]["Row"]>;
        Relationships: [];
      };
      selected_keywords: {
        Row: {
          id: string;
          seed_batch_id: string;
          keyword: string;
          volume: number | null;
          created_at: string;
        };
        Insert: Partial<Database["public"]["Tables"]["selected_keywords"]["Row"]> & {
          seed_batch_id: string;
          keyword: string;
        };
        Update: Partial<Database["public"]["Tables"]["selected_keywords"]["Row"]>;
        Relationships: [];
      };
      competitor_sites: {
        Row: {
          id: string;
          selected_keyword_id: string;
          url: string;
          dr: number | null;
          created_at: string;
        };
        Insert: Partial<Database["public"]["Tables"]["competitor_sites"]["Row"]> & {
          selected_keyword_id: string;
          url: string;
        };
        Update: Partial<Database["public"]["Tables"]["competitor_sites"]["Row"]>;
        Relationships: [];
      };
      reverse_engineered_data: {
        Row: {
          id: string;
          competitor_site_id: string;
          organic_traffic: number | null;
          paid_traffic: number | null;
          top_keywords: { keyword: string; volume: number }[] | null;
          ai_analysis: string | null;
          created_at: string;
        };
        Insert: Partial<Database["public"]["Tables"]["reverse_engineered_data"]["Row"]> & {
          competitor_site_id: string;
        };
        Update: Partial<Database["public"]["Tables"]["reverse_engineered_data"]["Row"]>;
        Relationships: [];
      };
      final_shortlist: {
        Row: {
          id: string;
          niche_id: string;
          summary: string | null;
          score: number | null;
          created_at: string;
        };
        Insert: Partial<Database["public"]["Tables"]["final_shortlist"]["Row"]> & {
          niche_id: string;
        };
        Update: Partial<Database["public"]["Tables"]["final_shortlist"]["Row"]>;
        Relationships: [];
      };
      activity_log: {
        Row: {
          id: string;
          user_id: string;
          action: string;
          metadata: Record<string, unknown> | null;
          created_at: string;
        };
        Insert: Partial<Database["public"]["Tables"]["activity_log"]["Row"]> & {
          user_id: string;
          action: string;
        };
        Update: Partial<Database["public"]["Tables"]["activity_log"]["Row"]>;
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
}

export type UserRow = Database["public"]["Tables"]["users"]["Row"];
export type NicheRow = Database["public"]["Tables"]["niches"]["Row"];
export type SeedKeywordBatchRow = Database["public"]["Tables"]["seed_keyword_batches"]["Row"];
export type SelectedKeywordRow = Database["public"]["Tables"]["selected_keywords"]["Row"];
export type CompetitorSiteRow = Database["public"]["Tables"]["competitor_sites"]["Row"];
export type ReverseEngineeredDataRow = Database["public"]["Tables"]["reverse_engineered_data"]["Row"];
export type FinalShortlistRow = Database["public"]["Tables"]["final_shortlist"]["Row"];
export type ActivityLogRow = Database["public"]["Tables"]["activity_log"]["Row"];
