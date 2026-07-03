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
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      daily_stats: {
        Row: {
          created_at: string
          date: string
          id: string
          mood: number | null
          notes: string | null
          sleep_hours: number | null
          sleep_quality: number | null
          soreness: number | null
          stress: number | null
          updated_at: string
          user_id: string
          weight_kg: number | null
        }
        Insert: {
          created_at?: string
          date: string
          id?: string
          mood?: number | null
          notes?: string | null
          sleep_hours?: number | null
          sleep_quality?: number | null
          soreness?: number | null
          stress?: number | null
          updated_at?: string
          user_id: string
          weight_kg?: number | null
        }
        Update: {
          created_at?: string
          date?: string
          id?: string
          mood?: number | null
          notes?: string | null
          sleep_hours?: number | null
          sleep_quality?: number | null
          soreness?: number | null
          stress?: number | null
          updated_at?: string
          user_id?: string
          weight_kg?: number | null
        }
        Relationships: []
      }
      food_scans: {
        Row: {
          created_at: string
          extracted: Json | null
          health_score: number | null
          id: string
          image_path: string | null
          plan_fit_score: number | null
          product_name: string | null
          reasoning: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          extracted?: Json | null
          health_score?: number | null
          id?: string
          image_path?: string | null
          plan_fit_score?: number | null
          product_name?: string | null
          reasoning?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          extracted?: Json | null
          health_score?: number | null
          id?: string
          image_path?: string | null
          plan_fit_score?: number | null
          product_name?: string | null
          reasoning?: string | null
          user_id?: string
        }
        Relationships: []
      }
      gym_exercises: {
        Row: {
          created_at: string
          id: string
          name: string
          order_idx: number
          reps: number
          rpe: number | null
          sets: number
          user_id: string
          weight_kg: number | null
          workout_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          order_idx?: number
          reps?: number
          rpe?: number | null
          sets?: number
          user_id: string
          weight_kg?: number | null
          workout_id: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          order_idx?: number
          reps?: number
          rpe?: number | null
          sets?: number
          user_id?: string
          weight_kg?: number | null
          workout_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "gym_exercises_workout_id_fkey"
            columns: ["workout_id"]
            isOneToOne: false
            referencedRelation: "workouts_gym"
            referencedColumns: ["id"]
          },
        ]
      }
      journal_entries: {
        Row: {
          content: string
          created_at: string
          date: string
          id: string
          mood: number | null
          tags: string[] | null
          title: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          content?: string
          created_at?: string
          date?: string
          id?: string
          mood?: number | null
          tags?: string[] | null
          title?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          content?: string
          created_at?: string
          date?: string
          id?: string
          mood?: number | null
          tags?: string[] | null
          title?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      nutrition_logs: {
        Row: {
          carbs_g: number
          created_at: string
          date: string
          fat_g: number
          id: string
          kcal: number
          meal: Database["public"]["Enums"]["meal_type"]
          name: string
          protein_g: number
          scan_id: string | null
          source: Database["public"]["Enums"]["nutrition_source"]
          user_id: string
        }
        Insert: {
          carbs_g?: number
          created_at?: string
          date: string
          fat_g?: number
          id?: string
          kcal?: number
          meal?: Database["public"]["Enums"]["meal_type"]
          name: string
          protein_g?: number
          scan_id?: string | null
          source?: Database["public"]["Enums"]["nutrition_source"]
          user_id: string
        }
        Update: {
          carbs_g?: number
          created_at?: string
          date?: string
          fat_g?: number
          id?: string
          kcal?: number
          meal?: Database["public"]["Enums"]["meal_type"]
          name?: string
          protein_g?: number
          scan_id?: string | null
          source?: Database["public"]["Enums"]["nutrition_source"]
          user_id?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          allergies: string[] | null
          birth_date: string | null
          created_at: string
          diet_style: string | null
          goal: Database["public"]["Enums"]["goal_type"] | null
          gym_days: number[] | null
          height_cm: number | null
          id: string
          match_days: number[] | null
          name: string | null
          onboarded: boolean
          position: string | null
          sex: Database["public"]["Enums"]["sex_type"] | null
          sport: string | null
          sport_days: number[] | null
          updated_at: string
          weight_kg: number | null
        }
        Insert: {
          allergies?: string[] | null
          birth_date?: string | null
          created_at?: string
          diet_style?: string | null
          goal?: Database["public"]["Enums"]["goal_type"] | null
          gym_days?: number[] | null
          height_cm?: number | null
          id: string
          match_days?: number[] | null
          name?: string | null
          onboarded?: boolean
          position?: string | null
          sex?: Database["public"]["Enums"]["sex_type"] | null
          sport?: string | null
          sport_days?: number[] | null
          updated_at?: string
          weight_kg?: number | null
        }
        Update: {
          allergies?: string[] | null
          birth_date?: string | null
          created_at?: string
          diet_style?: string | null
          goal?: Database["public"]["Enums"]["goal_type"] | null
          gym_days?: number[] | null
          height_cm?: number | null
          id?: string
          match_days?: number[] | null
          name?: string | null
          onboarded?: boolean
          position?: string | null
          sex?: Database["public"]["Enums"]["sex_type"] | null
          sport?: string | null
          sport_days?: number[] | null
          updated_at?: string
          weight_kg?: number | null
        }
        Relationships: []
      }
      weekly_planner: {
        Row: {
          created_at: string
          id: string
          locked: boolean
          plan: Json
          updated_at: string
          user_id: string
          week_start: string
        }
        Insert: {
          created_at?: string
          id?: string
          locked?: boolean
          plan?: Json
          updated_at?: string
          user_id: string
          week_start: string
        }
        Update: {
          created_at?: string
          id?: string
          locked?: boolean
          plan?: Json
          updated_at?: string
          user_id?: string
          week_start?: string
        }
        Relationships: []
      }
      workouts_gym: {
        Row: {
          created_at: string
          date: string
          duration_min: number | null
          id: string
          notes: string | null
          session_type: Database["public"]["Enums"]["gym_session_type"]
          status: Database["public"]["Enums"]["session_status"]
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          date: string
          duration_min?: number | null
          id?: string
          notes?: string | null
          session_type?: Database["public"]["Enums"]["gym_session_type"]
          status?: Database["public"]["Enums"]["session_status"]
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          date?: string
          duration_min?: number | null
          id?: string
          notes?: string | null
          session_type?: Database["public"]["Enums"]["gym_session_type"]
          status?: Database["public"]["Enums"]["session_status"]
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      workouts_sport: {
        Row: {
          created_at: string
          date: string
          duration_min: number | null
          id: string
          intensity: Database["public"]["Enums"]["intensity_level"]
          kind: Database["public"]["Enums"]["sport_kind"]
          match_hardness: Database["public"]["Enums"]["match_hardness"] | null
          notes: string | null
          status: Database["public"]["Enums"]["session_status"]
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          date: string
          duration_min?: number | null
          id?: string
          intensity?: Database["public"]["Enums"]["intensity_level"]
          kind?: Database["public"]["Enums"]["sport_kind"]
          match_hardness?: Database["public"]["Enums"]["match_hardness"] | null
          notes?: string | null
          status?: Database["public"]["Enums"]["session_status"]
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          date?: string
          duration_min?: number | null
          id?: string
          intensity?: Database["public"]["Enums"]["intensity_level"]
          kind?: Database["public"]["Enums"]["sport_kind"]
          match_hardness?: Database["public"]["Enums"]["match_hardness"] | null
          notes?: string | null
          status?: Database["public"]["Enums"]["session_status"]
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
      [_ in never]: never
    }
    Enums: {
      goal_type: "muscle_gain" | "maintain" | "recomp" | "performance"
      gym_session_type:
        | "push"
        | "pull"
        | "legs"
        | "upper"
        | "lower"
        | "full"
        | "light"
        | "mobility"
      intensity_level: "low" | "mid" | "high"
      match_hardness: "easy" | "normal" | "hard"
      meal_type: "breakfast" | "lunch" | "dinner" | "snack"
      nutrition_source: "manual" | "scan"
      session_status: "planned" | "done" | "skipped"
      sex_type: "male" | "female" | "other"
      sport_kind: "training" | "match"
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
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
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
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
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
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
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
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
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
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
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
      goal_type: ["muscle_gain", "maintain", "recomp", "performance"],
      gym_session_type: [
        "push",
        "pull",
        "legs",
        "upper",
        "lower",
        "full",
        "light",
        "mobility",
      ],
      intensity_level: ["low", "mid", "high"],
      match_hardness: ["easy", "normal", "hard"],
      meal_type: ["breakfast", "lunch", "dinner", "snack"],
      nutrition_source: ["manual", "scan"],
      session_status: ["planned", "done", "skipped"],
      sex_type: ["male", "female", "other"],
      sport_kind: ["training", "match"],
    },
  },
} as const
