export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.18"
  }
  public: {
    Tables: {
      coin_ledger: {
        Row: {
          amount: number
          created_at: string
          id: string
          source_key: string
          user_id: string
        }
        Insert: {
          amount: number
          created_at?: string
          id?: string
          source_key: string
          user_id: string
        }
        Update: {
          amount?: number
          created_at?: string
          id?: string
          source_key?: string
          user_id?: string
        }
        Relationships: []
      }
      cosmetic_catalog: {
        Row: {
          event: string | null
          id: string
          kind: string
          name_en: string
          name_th: string
          price: number
          value: string
        }
        Insert: {
          event?: string | null
          id: string
          kind: string
          name_en: string
          name_th: string
          price: number
          value: string
        }
        Update: {
          event?: string | null
          id?: string
          kind?: string
          name_en?: string
          name_th?: string
          price?: number
          value?: string
        }
        Relationships: []
      }
      cosmetic_inventory: {
        Row: {
          acquired_at: string
          item_id: string
          user_id: string
        }
        Insert: {
          acquired_at?: string
          item_id: string
          user_id: string
        }
        Update: {
          acquired_at?: string
          item_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "cosmetic_inventory_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "cosmetic_catalog"
            referencedColumns: ["id"]
          },
        ]
      }
      cosmetic_preferences: {
        Row: {
          clock_skin: string
          focus_background: string
          site_theme: string
          updated_at: string
          user_id: string
        }
        Insert: {
          clock_skin?: string
          focus_background?: string
          site_theme?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          clock_skin?: string
          focus_background?: string
          site_theme?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      daily_goals: {
        Row: {
          completed_at: string | null
          created_at: string
          goal_date: string
          id: string
          revision: number
          timezone: string
          title: string
          track_id: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          completed_at?: string | null
          created_at?: string
          goal_date: string
          id?: string
          revision?: number
          timezone?: string
          title: string
          track_id?: string | null
          updated_at?: string
          user_id?: string
        }
        Update: {
          completed_at?: string | null
          created_at?: string
          goal_date?: string
          id?: string
          revision?: number
          timezone?: string
          title?: string
          track_id?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "daily_goals_track_id_fkey"
            columns: ["track_id"]
            isOneToOne: false
            referencedRelation: "tracks"
            referencedColumns: ["id"]
          },
        ]
      }
      daily_quest_progress: {
        Row: {
          local_date: string
          study_seconds: number
          user_id: string
        }
        Insert: {
          local_date: string
          study_seconds: number
          user_id: string
        }
        Update: {
          local_date?: string
          study_seconds?: number
          user_id?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          display_name: string
          display_name_changed_at: string | null
          id: string
          locale: string
          theme: string
          timezone: string
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          display_name?: string
          display_name_changed_at?: string | null
          id: string
          locale?: string
          theme?: string
          timezone?: string
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          display_name?: string
          display_name_changed_at?: string | null
          id?: string
          locale?: string
          theme?: string
          timezone?: string
          updated_at?: string
        }
        Relationships: []
      }
      session_day_allocations: {
        Row: {
          break_seconds: number
          local_date: string
          session_id: string
          study_seconds: number
          user_id: string
        }
        Insert: {
          break_seconds?: number
          local_date: string
          session_id: string
          study_seconds?: number
          user_id: string
        }
        Update: {
          break_seconds?: number
          local_date?: string
          session_id?: string
          study_seconds?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "session_day_allocations_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "study_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      study_sessions: {
        Row: {
          allocation_status: string
          duration_seconds: number
          ended_at: string
          id: string
          mode: string
          recap: string
          recorded_at: string
          run_id: string
          started_at: string
          timezone: string
          track_id: string | null
          user_id: string
        }
        Insert: {
          allocation_status?: string
          duration_seconds: number
          ended_at: string
          id?: string
          mode: string
          recap?: string
          recorded_at?: string
          run_id: string
          started_at: string
          timezone?: string
          track_id?: string | null
          user_id: string
        }
        Update: {
          allocation_status?: string
          duration_seconds?: number
          ended_at?: string
          id?: string
          mode?: string
          recap?: string
          recorded_at?: string
          run_id?: string
          started_at?: string
          timezone?: string
          track_id?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "study_sessions_run_id_fkey"
            columns: ["run_id"]
            isOneToOne: true
            referencedRelation: "timer_runs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "study_sessions_track_id_fkey"
            columns: ["track_id"]
            isOneToOne: false
            referencedRelation: "tracks"
            referencedColumns: ["id"]
          },
        ]
      }
      study_streak_days: {
        Row: {
          achieved_at: string
          id: string
          local_date: string
          new_streak: number
          notified_at: string | null
          previous_streak: number
          user_id: string
        }
        Insert: {
          achieved_at: string
          id?: string
          local_date: string
          new_streak: number
          notified_at?: string | null
          previous_streak: number
          user_id: string
        }
        Update: {
          achieved_at?: string
          id?: string
          local_date?: string
          new_streak?: number
          notified_at?: string | null
          previous_streak?: number
          user_id?: string
        }
        Relationships: []
      }
      timer_run_segments: {
        Row: {
          credited_ms: number | null
          ended_at: string | null
          id: string
          run_id: string
          started_at: string
          user_id: string
        }
        Insert: {
          credited_ms?: number | null
          ended_at?: string | null
          id?: string
          run_id: string
          started_at: string
          user_id: string
        }
        Update: {
          credited_ms?: number | null
          ended_at?: string | null
          id?: string
          run_id?: string
          started_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "timer_run_segments_run_id_fkey"
            columns: ["run_id"]
            isOneToOne: false
            referencedRelation: "timer_runs"
            referencedColumns: ["id"]
          },
        ]
      }
      timer_runs: {
        Row: {
          accumulated_ms: number
          client_id: string
          duration_seconds: number | null
          ended_at: string | null
          id: string
          mode: string
          resumed_at: string | null
          segments_complete: boolean
          started_at: string
          status: string
          timezone: string
          updated_at: string
          user_id: string
        }
        Insert: {
          accumulated_ms?: number
          client_id: string
          duration_seconds?: number | null
          ended_at?: string | null
          id?: string
          mode: string
          resumed_at?: string | null
          segments_complete?: boolean
          started_at?: string
          status?: string
          timezone?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          accumulated_ms?: number
          client_id?: string
          duration_seconds?: number | null
          ended_at?: string | null
          id?: string
          mode?: string
          resumed_at?: string | null
          segments_complete?: boolean
          started_at?: string
          status?: string
          timezone?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      track_reward_progress: {
        Row: {
          study_seconds: number
          track_id: string
          user_id: string
        }
        Insert: {
          study_seconds: number
          track_id: string
          user_id: string
        }
        Update: {
          study_seconds?: number
          track_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "track_reward_progress_track_id_fkey"
            columns: ["track_id"]
            isOneToOne: false
            referencedRelation: "tracks"
            referencedColumns: ["id"]
          },
        ]
      }
      tracks: {
        Row: {
          archived_at: string | null
          background: string
          color: string
          created_at: string
          description: string
          icon: string
          id: string
          name: string
          updated_at: string
          user_id: string
        }
        Insert: {
          archived_at?: string | null
          background?: string
          color?: string
          created_at?: string
          description?: string
          icon?: string
          id?: string
          name: string
          updated_at?: string
          user_id?: string
        }
        Update: {
          archived_at?: string | null
          background?: string
          color?: string
          created_at?: string
          description?: string
          icon?: string
          id?: string
          name?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string
          role: Database["public"]["Enums"]["app_role"]
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          role?: Database["public"]["Enums"]["app_role"]
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          role?: Database["public"]["Enums"]["app_role"]
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      cosmetics_command: {
        Args: { p_item_id: string; p_operation: string }
        Returns: Json
      }
      cosmetics_state: { Args: never; Returns: Json }
      goal_day_summary: { Args: { p_date?: string }; Returns: Json }
      study_rewards: { Args: { p_page?: number }; Returns: Json }
      study_statistics: {
        Args: { p_from?: string; p_to?: string; p_track_id?: string }
        Returns: Json
      }
      study_streak_status: { Args: { p_claim_notice?: boolean }; Returns: Json }
      timer_command: {
        Args: {
          p_client_id: string
          p_duration_seconds?: number
          p_mode?: string
          p_operation: string
          p_recap?: string
          p_track_id?: string
        }
        Returns: Json
      }
      track_detail_statistics: {
        Args: {
          p_all_history?: boolean
          p_from?: string
          p_page?: number
          p_to?: string
          p_track_id: string
        }
        Returns: Json
      }
      track_study_totals: {
        Args: { p_track_ids: string[] }
        Returns: {
          total_seconds: number
          track_id: string
        }[]
      }
    }
    Enums: {
      app_role: "user" | "admin"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      app_role: ["user", "admin"],
    },
  },
} as const

