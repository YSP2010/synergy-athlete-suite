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
      activities: {
        Row: {
          aerobic_te: number | null
          anaerobic_te: number | null
          avg_cadence: number | null
          avg_ground_contact_ms: number | null
          avg_hr: number | null
          avg_power_w: number | null
          avg_speed_mps: number | null
          avg_stride_length_m: number | null
          avg_temperature_c: number | null
          avg_vertical_oscillation_cm: number | null
          avg_vertical_ratio: number | null
          calories: number | null
          created_at: string
          device_activity_key: string | null
          device_manufacturer: string | null
          device_name: string | null
          distance_m: number | null
          duration_s: number | null
          elevation_gain_m: number | null
          elevation_loss_m: number | null
          equipment_id: string | null
          gct_balance_pct: number | null
          id: string
          import_file_id: string | null
          max_cadence: number | null
          max_hr: number | null
          max_power_w: number | null
          max_speed_mps: number | null
          moving_duration_s: number | null
          name: string | null
          normalized_power_w: number | null
          route_only: boolean
          sport: string
          started_at: string | null
          timezone_offset_min: number | null
          training_load: number | null
          updated_at: string
          user_id: string
          verified: boolean
        }
        Insert: {
          aerobic_te?: number | null
          anaerobic_te?: number | null
          avg_cadence?: number | null
          avg_ground_contact_ms?: number | null
          avg_hr?: number | null
          avg_power_w?: number | null
          avg_speed_mps?: number | null
          avg_stride_length_m?: number | null
          avg_temperature_c?: number | null
          avg_vertical_oscillation_cm?: number | null
          avg_vertical_ratio?: number | null
          calories?: number | null
          created_at?: string
          device_activity_key?: string | null
          device_manufacturer?: string | null
          device_name?: string | null
          distance_m?: number | null
          duration_s?: number | null
          elevation_gain_m?: number | null
          elevation_loss_m?: number | null
          equipment_id?: string | null
          gct_balance_pct?: number | null
          id?: string
          import_file_id?: string | null
          max_cadence?: number | null
          max_hr?: number | null
          max_power_w?: number | null
          max_speed_mps?: number | null
          moving_duration_s?: number | null
          name?: string | null
          normalized_power_w?: number | null
          route_only?: boolean
          sport?: string
          started_at?: string | null
          timezone_offset_min?: number | null
          training_load?: number | null
          updated_at?: string
          user_id: string
          verified?: boolean
        }
        Update: {
          aerobic_te?: number | null
          anaerobic_te?: number | null
          avg_cadence?: number | null
          avg_ground_contact_ms?: number | null
          avg_hr?: number | null
          avg_power_w?: number | null
          avg_speed_mps?: number | null
          avg_stride_length_m?: number | null
          avg_temperature_c?: number | null
          avg_vertical_oscillation_cm?: number | null
          avg_vertical_ratio?: number | null
          calories?: number | null
          created_at?: string
          device_activity_key?: string | null
          device_manufacturer?: string | null
          device_name?: string | null
          distance_m?: number | null
          duration_s?: number | null
          elevation_gain_m?: number | null
          elevation_loss_m?: number | null
          equipment_id?: string | null
          gct_balance_pct?: number | null
          id?: string
          import_file_id?: string | null
          max_cadence?: number | null
          max_hr?: number | null
          max_power_w?: number | null
          max_speed_mps?: number | null
          moving_duration_s?: number | null
          name?: string | null
          normalized_power_w?: number | null
          route_only?: boolean
          sport?: string
          started_at?: string | null
          timezone_offset_min?: number | null
          training_load?: number | null
          updated_at?: string
          user_id?: string
          verified?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "activities_equipment_id_fkey"
            columns: ["equipment_id"]
            isOneToOne: false
            referencedRelation: "equipment"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "activities_import_file_id_fkey"
            columns: ["import_file_id"]
            isOneToOne: false
            referencedRelation: "import_files"
            referencedColumns: ["id"]
          },
        ]
      }
      activity_laps: {
        Row: {
          activity_id: string
          avg_cadence: number | null
          avg_hr: number | null
          avg_power_w: number | null
          avg_speed_mps: number | null
          created_at: string
          distance_m: number | null
          duration_s: number | null
          elevation_gain_m: number | null
          id: string
          lap_index: number
          sport: string | null
          user_id: string
        }
        Insert: {
          activity_id: string
          avg_cadence?: number | null
          avg_hr?: number | null
          avg_power_w?: number | null
          avg_speed_mps?: number | null
          created_at?: string
          distance_m?: number | null
          duration_s?: number | null
          elevation_gain_m?: number | null
          id?: string
          lap_index: number
          sport?: string | null
          user_id: string
        }
        Update: {
          activity_id?: string
          avg_cadence?: number | null
          avg_hr?: number | null
          avg_power_w?: number | null
          avg_speed_mps?: number | null
          created_at?: string
          distance_m?: number | null
          duration_s?: number | null
          elevation_gain_m?: number | null
          id?: string
          lap_index?: number
          sport?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "activity_laps_activity_id_fkey"
            columns: ["activity_id"]
            isOneToOne: false
            referencedRelation: "activities"
            referencedColumns: ["id"]
          },
        ]
      }
      activity_tracks: {
        Row: {
          activity_id: string
          bounds: Json | null
          created_at: string
          point_count: number
          points: Json
          user_id: string
        }
        Insert: {
          activity_id: string
          bounds?: Json | null
          created_at?: string
          point_count?: number
          points?: Json
          user_id: string
        }
        Update: {
          activity_id?: string
          bounds?: Json | null
          created_at?: string
          point_count?: number
          points?: Json
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "activity_tracks_activity_id_fkey"
            columns: ["activity_id"]
            isOneToOne: true
            referencedRelation: "activities"
            referencedColumns: ["id"]
          },
        ]
      }
      chat_messages: {
        Row: {
          chat_id: string
          created_at: string
          id: string
          message: string
          sender_id: string
        }
        Insert: {
          chat_id: string
          created_at?: string
          id?: string
          message: string
          sender_id: string
        }
        Update: {
          chat_id?: string
          created_at?: string
          id?: string
          message?: string
          sender_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "chat_messages_chat_id_fkey"
            columns: ["chat_id"]
            isOneToOne: false
            referencedRelation: "chats"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "chat_messages_sender_id_profiles_fkey"
            columns: ["sender_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      chat_participants: {
        Row: {
          chat_id: string
          id: string
          joined_at: string
          user_id: string
        }
        Insert: {
          chat_id: string
          id?: string
          joined_at?: string
          user_id: string
        }
        Update: {
          chat_id?: string
          id?: string
          joined_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "chat_participants_chat_id_fkey"
            columns: ["chat_id"]
            isOneToOne: false
            referencedRelation: "chats"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "chat_participants_user_id_profiles_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      chats: {
        Row: {
          created_at: string
          created_by: string
          id: string
          team_id: string | null
          type: Database["public"]["Enums"]["chat_type"]
        }
        Insert: {
          created_at?: string
          created_by: string
          id?: string
          team_id?: string | null
          type: Database["public"]["Enums"]["chat_type"]
        }
        Update: {
          created_at?: string
          created_by?: string
          id?: string
          team_id?: string | null
          type?: Database["public"]["Enums"]["chat_type"]
        }
        Relationships: [
          {
            foreignKeyName: "chats_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      consents: {
        Row: {
          changed_at: string
          granted: boolean
          id: string
          kind: string
          user_id: string
          version: string
        }
        Insert: {
          changed_at?: string
          granted: boolean
          id?: string
          kind: string
          user_id: string
          version?: string
        }
        Update: {
          changed_at?: string
          granted?: boolean
          id?: string
          kind?: string
          user_id?: string
          version?: string
        }
        Relationships: []
      }
      course_efforts: {
        Row: {
          activity_id: string
          avg_hr: number | null
          avg_speed_mps: number | null
          course_id: string
          created_at: string
          distance_m: number | null
          duration_s: number
          id: string
          match_score: number
          started_at: string | null
          user_id: string
          verified: boolean
        }
        Insert: {
          activity_id: string
          avg_hr?: number | null
          avg_speed_mps?: number | null
          course_id: string
          created_at?: string
          distance_m?: number | null
          duration_s: number
          id?: string
          match_score?: number
          started_at?: string | null
          user_id: string
          verified?: boolean
        }
        Update: {
          activity_id?: string
          avg_hr?: number | null
          avg_speed_mps?: number | null
          course_id?: string
          created_at?: string
          distance_m?: number | null
          duration_s?: number
          id?: string
          match_score?: number
          started_at?: string | null
          user_id?: string
          verified?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "course_efforts_activity_id_fkey"
            columns: ["activity_id"]
            isOneToOne: false
            referencedRelation: "activities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "course_efforts_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
        ]
      }
      courses: {
        Row: {
          created_at: string
          description: string | null
          distance_m: number
          elevation_gain_m: number | null
          end_lat: number | null
          end_lng: number | null
          geometry: Json
          id: string
          is_public: boolean
          name: string
          source_activity_id: string | null
          sport: string
          start_lat: number | null
          start_lng: number | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          distance_m?: number
          elevation_gain_m?: number | null
          end_lat?: number | null
          end_lng?: number | null
          geometry?: Json
          id?: string
          is_public?: boolean
          name: string
          source_activity_id?: string | null
          sport?: string
          start_lat?: number | null
          start_lng?: number | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          description?: string | null
          distance_m?: number
          elevation_gain_m?: number | null
          end_lat?: number | null
          end_lng?: number | null
          geometry?: Json
          id?: string
          is_public?: boolean
          name?: string
          source_activity_id?: string | null
          sport?: string
          start_lat?: number | null
          start_lng?: number | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "courses_source_activity_id_fkey"
            columns: ["source_activity_id"]
            isOneToOne: false
            referencedRelation: "activities"
            referencedColumns: ["id"]
          },
        ]
      }
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
      equipment: {
        Row: {
          brand: string | null
          created_at: string
          id: string
          model: string | null
          name: string
          purchased_on: string | null
          retire_at_distance_m: number | null
          retired: boolean
          total_distance_m: number
          type: string
          updated_at: string
          user_id: string
        }
        Insert: {
          brand?: string | null
          created_at?: string
          id?: string
          model?: string | null
          name: string
          purchased_on?: string | null
          retire_at_distance_m?: number | null
          retired?: boolean
          total_distance_m?: number
          type: string
          updated_at?: string
          user_id: string
        }
        Update: {
          brand?: string | null
          created_at?: string
          id?: string
          model?: string | null
          name?: string
          purchased_on?: string | null
          retire_at_distance_m?: number | null
          retired?: boolean
          total_distance_m?: number
          type?: string
          updated_at?: string
          user_id?: string
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
      hrv_logs: {
        Row: {
          baseline_high_ms: number | null
          baseline_low_ms: number | null
          created_at: string
          date: string
          id: string
          last_night_5min_high_ms: number | null
          last_night_avg_ms: number | null
          source: Database["public"]["Enums"]["activity_source"]
          status: string | null
          updated_at: string
          user_id: string
          weekly_avg_ms: number | null
        }
        Insert: {
          baseline_high_ms?: number | null
          baseline_low_ms?: number | null
          created_at?: string
          date: string
          id?: string
          last_night_5min_high_ms?: number | null
          last_night_avg_ms?: number | null
          source?: Database["public"]["Enums"]["activity_source"]
          status?: string | null
          updated_at?: string
          user_id: string
          weekly_avg_ms?: number | null
        }
        Update: {
          baseline_high_ms?: number | null
          baseline_low_ms?: number | null
          created_at?: string
          date?: string
          id?: string
          last_night_5min_high_ms?: number | null
          last_night_avg_ms?: number | null
          source?: Database["public"]["Enums"]["activity_source"]
          status?: string | null
          updated_at?: string
          user_id?: string
          weekly_avg_ms?: number | null
        }
        Relationships: []
      }
      import_files: {
        Row: {
          content_hash: string
          created_at: string
          error: string | null
          file_type: string
          id: string
          job_id: string
          processed_at: string | null
          relative_path: string
          skip_reason: string | null
          status: Database["public"]["Enums"]["import_status"]
          storage_path: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          content_hash: string
          created_at?: string
          error?: string | null
          file_type?: string
          id?: string
          job_id: string
          processed_at?: string | null
          relative_path: string
          skip_reason?: string | null
          status?: Database["public"]["Enums"]["import_status"]
          storage_path?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          content_hash?: string
          created_at?: string
          error?: string | null
          file_type?: string
          id?: string
          job_id?: string
          processed_at?: string | null
          relative_path?: string
          skip_reason?: string | null
          status?: Database["public"]["Enums"]["import_status"]
          storage_path?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "import_files_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "import_jobs"
            referencedColumns: ["id"]
          },
        ]
      }
      import_jobs: {
        Row: {
          created_at: string
          duplicate_files: number
          error: string | null
          failed_files: number
          finished_at: string | null
          id: string
          imported_activities: number
          kind: string
          original_filename: string | null
          processed_files: number
          started_at: string | null
          status: Database["public"]["Enums"]["import_status"]
          total_files: number
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          duplicate_files?: number
          error?: string | null
          failed_files?: number
          finished_at?: string | null
          id?: string
          imported_activities?: number
          kind?: string
          original_filename?: string | null
          processed_files?: number
          started_at?: string | null
          status?: Database["public"]["Enums"]["import_status"]
          total_files?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          duplicate_files?: number
          error?: string | null
          failed_files?: number
          finished_at?: string | null
          id?: string
          imported_activities?: number
          kind?: string
          original_filename?: string | null
          processed_files?: number
          started_at?: string | null
          status?: Database["public"]["Enums"]["import_status"]
          total_files?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: []
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
      leaderboard_categories: {
        Row: {
          active: boolean
          created_at: string
          description_de: string
          direction: string
          key: string
          label_de: string
          min_sample_size: number
          requires_health_consent: boolean
          sort_order: number
          sport: string | null
          unit: string
          updated_at: string
        }
        Insert: {
          active?: boolean
          created_at?: string
          description_de: string
          direction: string
          key: string
          label_de: string
          min_sample_size?: number
          requires_health_consent?: boolean
          sort_order?: number
          sport?: string | null
          unit: string
          updated_at?: string
        }
        Update: {
          active?: boolean
          created_at?: string
          description_de?: string
          direction?: string
          key?: string
          label_de?: string
          min_sample_size?: number
          requires_health_consent?: boolean
          sort_order?: number
          sport?: string | null
          unit?: string
          updated_at?: string
        }
        Relationships: []
      }
      leaderboard_entries: {
        Row: {
          category_key: string
          computed_at: string
          created_at: string
          flagged: boolean
          id: string
          period: Database["public"]["Enums"]["leaderboard_period"]
          period_start: string
          sample_count: number
          supporting_activity_id: string | null
          updated_at: string
          user_id: string
          value: number
          verified: boolean
        }
        Insert: {
          category_key: string
          computed_at?: string
          created_at?: string
          flagged?: boolean
          id?: string
          period: Database["public"]["Enums"]["leaderboard_period"]
          period_start: string
          sample_count?: number
          supporting_activity_id?: string | null
          updated_at?: string
          user_id: string
          value: number
          verified?: boolean
        }
        Update: {
          category_key?: string
          computed_at?: string
          created_at?: string
          flagged?: boolean
          id?: string
          period?: Database["public"]["Enums"]["leaderboard_period"]
          period_start?: string
          sample_count?: number
          supporting_activity_id?: string | null
          updated_at?: string
          user_id?: string
          value?: number
          verified?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "leaderboard_entries_category_key_fkey"
            columns: ["category_key"]
            isOneToOne: false
            referencedRelation: "leaderboard_categories"
            referencedColumns: ["key"]
          },
          {
            foreignKeyName: "leaderboard_entries_supporting_activity_id_fkey"
            columns: ["supporting_activity_id"]
            isOneToOne: false
            referencedRelation: "activities"
            referencedColumns: ["id"]
          },
        ]
      }
      multisport_segments: {
        Row: {
          activity_id: string
          avg_cadence: number | null
          avg_hr: number | null
          avg_power_w: number | null
          avg_speed_mps: number | null
          created_at: string
          distance_m: number | null
          duration_s: number
          id: string
          segment_index: number
          segment_type: string
          sport: string | null
          started_at: string | null
          user_id: string
        }
        Insert: {
          activity_id: string
          avg_cadence?: number | null
          avg_hr?: number | null
          avg_power_w?: number | null
          avg_speed_mps?: number | null
          created_at?: string
          distance_m?: number | null
          duration_s: number
          id?: string
          segment_index: number
          segment_type: string
          sport?: string | null
          started_at?: string | null
          user_id: string
        }
        Update: {
          activity_id?: string
          avg_cadence?: number | null
          avg_hr?: number | null
          avg_power_w?: number | null
          avg_speed_mps?: number | null
          created_at?: string
          distance_m?: number | null
          duration_s?: number
          id?: string
          segment_index?: number
          segment_type?: string
          sport?: string | null
          started_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "multisport_segments_activity_id_fkey"
            columns: ["activity_id"]
            isOneToOne: false
            referencedRelation: "activities"
            referencedColumns: ["id"]
          },
        ]
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
      personal_records: {
        Row: {
          achieved_at: string | null
          activity_id: string | null
          created_at: string
          id: string
          metric: string
          sport: string
          unit: string
          updated_at: string
          user_id: string
          value: number
        }
        Insert: {
          achieved_at?: string | null
          activity_id?: string | null
          created_at?: string
          id?: string
          metric: string
          sport: string
          unit: string
          updated_at?: string
          user_id: string
          value: number
        }
        Update: {
          achieved_at?: string | null
          activity_id?: string | null
          created_at?: string
          id?: string
          metric?: string
          sport?: string
          unit?: string
          updated_at?: string
          user_id?: string
          value?: number
        }
        Relationships: [
          {
            foreignKeyName: "personal_records_activity_id_fkey"
            columns: ["activity_id"]
            isOneToOne: false
            referencedRelation: "activities"
            referencedColumns: ["id"]
          },
        ]
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
          leaderboard_display_name: string | null
          leaderboard_opt_in: boolean
          leaderboard_share_health: boolean
          match_days: number[] | null
          name: string | null
          onboarded: boolean
          position: string | null
          role: Database["public"]["Enums"]["user_role"]
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
          leaderboard_display_name?: string | null
          leaderboard_opt_in?: boolean
          leaderboard_share_health?: boolean
          match_days?: number[] | null
          name?: string | null
          onboarded?: boolean
          position?: string | null
          role?: Database["public"]["Enums"]["user_role"]
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
          leaderboard_display_name?: string | null
          leaderboard_opt_in?: boolean
          leaderboard_share_health?: boolean
          match_days?: number[] | null
          name?: string | null
          onboarded?: boolean
          position?: string | null
          role?: Database["public"]["Enums"]["user_role"]
          sex?: Database["public"]["Enums"]["sex_type"] | null
          sport?: string | null
          sport_days?: number[] | null
          updated_at?: string
          weight_kg?: number | null
        }
        Relationships: []
      }
      progress_insights: {
        Row: {
          content: string
          created_at: string
          id: string
          metrics: Json | null
          period_end: string
          period_start: string
          updated_at: string
          user_id: string
        }
        Insert: {
          content: string
          created_at?: string
          id?: string
          metrics?: Json | null
          period_end: string
          period_start: string
          updated_at?: string
          user_id: string
        }
        Update: {
          content?: string
          created_at?: string
          id?: string
          metrics?: Json | null
          period_end?: string
          period_start?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      push_subscriptions: {
        Row: {
          auth: string
          created_at: string
          endpoint: string
          id: string
          p256dh: string
          topic_checkin: boolean
          topic_matchday: boolean
          topic_plan: boolean
          updated_at: string
          user_agent: string | null
          user_id: string
        }
        Insert: {
          auth: string
          created_at?: string
          endpoint: string
          id?: string
          p256dh: string
          topic_checkin?: boolean
          topic_matchday?: boolean
          topic_plan?: boolean
          updated_at?: string
          user_agent?: string | null
          user_id: string
        }
        Update: {
          auth?: string
          created_at?: string
          endpoint?: string
          id?: string
          p256dh?: string
          topic_checkin?: boolean
          topic_matchday?: boolean
          topic_plan?: boolean
          updated_at?: string
          user_agent?: string | null
          user_id?: string
        }
        Relationships: []
      }
      races: {
        Row: {
          bike_distance_m: number | null
          created_at: string
          goal_bike_s: number | null
          goal_run_s: number | null
          goal_swim_s: number | null
          goal_t1_s: number | null
          goal_t2_s: number | null
          goal_time_s: number | null
          id: string
          location: string | null
          name: string
          notes: string | null
          priority: string
          race_date: string
          race_type: string
          result_activity_id: string | null
          run_distance_m: number | null
          status: string
          swim_distance_m: number | null
          updated_at: string
          user_id: string
        }
        Insert: {
          bike_distance_m?: number | null
          created_at?: string
          goal_bike_s?: number | null
          goal_run_s?: number | null
          goal_swim_s?: number | null
          goal_t1_s?: number | null
          goal_t2_s?: number | null
          goal_time_s?: number | null
          id?: string
          location?: string | null
          name: string
          notes?: string | null
          priority?: string
          race_date: string
          race_type: string
          result_activity_id?: string | null
          run_distance_m?: number | null
          status?: string
          swim_distance_m?: number | null
          updated_at?: string
          user_id: string
        }
        Update: {
          bike_distance_m?: number | null
          created_at?: string
          goal_bike_s?: number | null
          goal_run_s?: number | null
          goal_swim_s?: number | null
          goal_t1_s?: number | null
          goal_t2_s?: number | null
          goal_time_s?: number | null
          id?: string
          location?: string | null
          name?: string
          notes?: string | null
          priority?: string
          race_date?: string
          race_type?: string
          result_activity_id?: string | null
          run_distance_m?: number | null
          status?: string
          swim_distance_m?: number | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "races_result_activity_id_fkey"
            columns: ["result_activity_id"]
            isOneToOne: false
            referencedRelation: "activities"
            referencedColumns: ["id"]
          },
        ]
      }
      sleep_logs: {
        Row: {
          avg_respiration: number | null
          avg_sleep_hr: number | null
          avg_sleep_hrv_ms: number | null
          avg_spo2: number | null
          awake_s: number | null
          created_at: string
          date: string
          deep_s: number | null
          duration_s: number | null
          id: string
          light_s: number | null
          nap: boolean
          rem_s: number | null
          restlessness: number | null
          sleep_end: string | null
          sleep_score: number | null
          sleep_start: string | null
          source: Database["public"]["Enums"]["activity_source"]
          updated_at: string
          user_id: string
        }
        Insert: {
          avg_respiration?: number | null
          avg_sleep_hr?: number | null
          avg_sleep_hrv_ms?: number | null
          avg_spo2?: number | null
          awake_s?: number | null
          created_at?: string
          date: string
          deep_s?: number | null
          duration_s?: number | null
          id?: string
          light_s?: number | null
          nap?: boolean
          rem_s?: number | null
          restlessness?: number | null
          sleep_end?: string | null
          sleep_score?: number | null
          sleep_start?: string | null
          source?: Database["public"]["Enums"]["activity_source"]
          updated_at?: string
          user_id: string
        }
        Update: {
          avg_respiration?: number | null
          avg_sleep_hr?: number | null
          avg_sleep_hrv_ms?: number | null
          avg_spo2?: number | null
          awake_s?: number | null
          created_at?: string
          date?: string
          deep_s?: number | null
          duration_s?: number | null
          id?: string
          light_s?: number | null
          nap?: boolean
          rem_s?: number | null
          restlessness?: number | null
          sleep_end?: string | null
          sleep_score?: number | null
          sleep_start?: string | null
          source?: Database["public"]["Enums"]["activity_source"]
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      swim_metrics: {
        Row: {
          activity_id: string
          avg_pace_s_per_100m: number | null
          avg_strokes_per_length: number | null
          avg_swolf: number | null
          best_swolf: number | null
          created_at: string
          css_pace_s_per_100m: number | null
          id: string
          open_water: boolean
          pool_length_m: number | null
          segment_id: string | null
          stroke_type: string | null
          total_strokes: number | null
          user_id: string
        }
        Insert: {
          activity_id: string
          avg_pace_s_per_100m?: number | null
          avg_strokes_per_length?: number | null
          avg_swolf?: number | null
          best_swolf?: number | null
          created_at?: string
          css_pace_s_per_100m?: number | null
          id?: string
          open_water?: boolean
          pool_length_m?: number | null
          segment_id?: string | null
          stroke_type?: string | null
          total_strokes?: number | null
          user_id: string
        }
        Update: {
          activity_id?: string
          avg_pace_s_per_100m?: number | null
          avg_strokes_per_length?: number | null
          avg_swolf?: number | null
          best_swolf?: number | null
          created_at?: string
          css_pace_s_per_100m?: number | null
          id?: string
          open_water?: boolean
          pool_length_m?: number | null
          segment_id?: string | null
          stroke_type?: string | null
          total_strokes?: number | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "swim_metrics_activity_id_fkey"
            columns: ["activity_id"]
            isOneToOne: false
            referencedRelation: "activities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "swim_metrics_segment_id_fkey"
            columns: ["segment_id"]
            isOneToOne: false
            referencedRelation: "multisport_segments"
            referencedColumns: ["id"]
          },
        ]
      }
      team_invites: {
        Row: {
          created_at: string
          created_by: string
          expires_at: string | null
          id: string
          label: string | null
          max_uses: number | null
          revoked: boolean
          team_id: string
          token_hash: string
          updated_at: string
          uses: number
        }
        Insert: {
          created_at?: string
          created_by: string
          expires_at?: string | null
          id?: string
          label?: string | null
          max_uses?: number | null
          revoked?: boolean
          team_id: string
          token_hash: string
          updated_at?: string
          uses?: number
        }
        Update: {
          created_at?: string
          created_by?: string
          expires_at?: string | null
          id?: string
          label?: string | null
          max_uses?: number | null
          revoked?: boolean
          team_id?: string
          token_hash?: string
          updated_at?: string
          uses?: number
        }
        Relationships: [
          {
            foreignKeyName: "team_invites_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      team_members: {
        Row: {
          id: string
          invited_at: string
          responded_at: string | null
          status: Database["public"]["Enums"]["team_member_status"]
          team_id: string
          user_id: string
        }
        Insert: {
          id?: string
          invited_at?: string
          responded_at?: string | null
          status?: Database["public"]["Enums"]["team_member_status"]
          team_id: string
          user_id: string
        }
        Update: {
          id?: string
          invited_at?: string
          responded_at?: string | null
          status?: Database["public"]["Enums"]["team_member_status"]
          team_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "team_members_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "team_members_user_id_profiles_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      teams: {
        Row: {
          coach_id: string
          coach_only_chat: boolean
          created_at: string
          id: string
          name: string
          team_chat_id: string | null
          updated_at: string
        }
        Insert: {
          coach_id: string
          coach_only_chat?: boolean
          created_at?: string
          id?: string
          name: string
          team_chat_id?: string | null
          updated_at?: string
        }
        Update: {
          coach_id?: string
          coach_only_chat?: boolean
          created_at?: string
          id?: string
          name?: string
          team_chat_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "teams_coach_id_profiles_fkey"
            columns: ["coach_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      user_metrics: {
        Row: {
          acute_load: number | null
          chronic_load: number | null
          created_at: string
          date: string
          fitness_age: number | null
          ftp_w: number | null
          id: string
          lactate_threshold_hr: number | null
          lactate_threshold_speed_mps: number | null
          load_ratio: number | null
          source: Database["public"]["Enums"]["activity_source"]
          training_readiness: number | null
          training_status: string | null
          updated_at: string
          user_id: string
          vo2max_cycling: number | null
          vo2max_running: number | null
        }
        Insert: {
          acute_load?: number | null
          chronic_load?: number | null
          created_at?: string
          date: string
          fitness_age?: number | null
          ftp_w?: number | null
          id?: string
          lactate_threshold_hr?: number | null
          lactate_threshold_speed_mps?: number | null
          load_ratio?: number | null
          source?: Database["public"]["Enums"]["activity_source"]
          training_readiness?: number | null
          training_status?: string | null
          updated_at?: string
          user_id: string
          vo2max_cycling?: number | null
          vo2max_running?: number | null
        }
        Update: {
          acute_load?: number | null
          chronic_load?: number | null
          created_at?: string
          date?: string
          fitness_age?: number | null
          ftp_w?: number | null
          id?: string
          lactate_threshold_hr?: number | null
          lactate_threshold_speed_mps?: number | null
          load_ratio?: number | null
          source?: Database["public"]["Enums"]["activity_source"]
          training_readiness?: number | null
          training_status?: string | null
          updated_at?: string
          user_id?: string
          vo2max_cycling?: number | null
          vo2max_running?: number | null
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
      wellness_daily: {
        Row: {
          active_kcal: number | null
          avg_respiration: number | null
          avg_spo2: number | null
          avg_stress: number | null
          bmr_kcal: number | null
          body_battery_end: number | null
          body_battery_max: number | null
          body_battery_min: number | null
          body_battery_start: number | null
          created_at: string
          date: string
          distance_m: number | null
          floors_climbed: number | null
          id: string
          intensity_minutes_moderate: number | null
          intensity_minutes_vigorous: number | null
          max_hr: number | null
          max_stress: number | null
          min_hr: number | null
          resting_hr: number | null
          skin_temp_deviation_c: number | null
          source: Database["public"]["Enums"]["activity_source"]
          steps: number | null
          updated_at: string
          user_id: string
        }
        Insert: {
          active_kcal?: number | null
          avg_respiration?: number | null
          avg_spo2?: number | null
          avg_stress?: number | null
          bmr_kcal?: number | null
          body_battery_end?: number | null
          body_battery_max?: number | null
          body_battery_min?: number | null
          body_battery_start?: number | null
          created_at?: string
          date: string
          distance_m?: number | null
          floors_climbed?: number | null
          id?: string
          intensity_minutes_moderate?: number | null
          intensity_minutes_vigorous?: number | null
          max_hr?: number | null
          max_stress?: number | null
          min_hr?: number | null
          resting_hr?: number | null
          skin_temp_deviation_c?: number | null
          source?: Database["public"]["Enums"]["activity_source"]
          steps?: number | null
          updated_at?: string
          user_id: string
        }
        Update: {
          active_kcal?: number | null
          avg_respiration?: number | null
          avg_spo2?: number | null
          avg_stress?: number | null
          bmr_kcal?: number | null
          body_battery_end?: number | null
          body_battery_max?: number | null
          body_battery_min?: number | null
          body_battery_start?: number | null
          created_at?: string
          date?: string
          distance_m?: number | null
          floors_climbed?: number | null
          id?: string
          intensity_minutes_moderate?: number | null
          intensity_minutes_vigorous?: number | null
          max_hr?: number | null
          max_stress?: number | null
          min_hr?: number | null
          resting_hr?: number | null
          skin_temp_deviation_c?: number | null
          source?: Database["public"]["Enums"]["activity_source"]
          steps?: number | null
          updated_at?: string
          user_id?: string
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
          kickoff_at: string | null
          kind: Database["public"]["Enums"]["sport_kind"]
          location: string | null
          match_hardness: Database["public"]["Enums"]["match_hardness"] | null
          notes: string | null
          opponent: string | null
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
          kickoff_at?: string | null
          kind?: Database["public"]["Enums"]["sport_kind"]
          location?: string | null
          match_hardness?: Database["public"]["Enums"]["match_hardness"] | null
          notes?: string | null
          opponent?: string | null
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
          kickoff_at?: string | null
          kind?: Database["public"]["Enums"]["sport_kind"]
          location?: string | null
          match_hardness?: Database["public"]["Enums"]["match_hardness"] | null
          notes?: string | null
          opponent?: string | null
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
      coach_can_view_athlete: { Args: { _user_id: string }; Returns: boolean }
      course_leaderboard: {
        Args: { _course_id: string }
        Returns: {
          athlete_name: string
          avg_hr: number
          avg_speed_mps: number
          distance_m: number
          duration_s: number
          effort_id: string
          is_me: boolean
          started_at: string
          user_id: string
          verified: boolean
        }[]
      }
      create_team_with_chat: { Args: { _name: string }; Returns: string }
      find_profile_by_email: {
        Args: { _email: string }
        Returns: {
          id: string
          name: string
          role: Database["public"]["Enums"]["user_role"]
        }[]
      }
      get_leaderboard: {
        Args: {
          _category_key: string
          _limit?: number
          _period: Database["public"]["Enums"]["leaderboard_period"]
          _period_start: string
          _scope?: Database["public"]["Enums"]["leaderboard_scope"]
          _team_id?: string
        }
        Returns: {
          activity_id: string
          display_name: string
          is_me: boolean
          rank: number
          sample_count: number
          user_id: string
          value: number
          verified: boolean
        }[]
      }
      get_or_create_direct_chat: {
        Args: { _other_user_id: string }
        Returns: string
      }
      get_team_readiness: {
        Args: { _team_id: string }
        Returns: {
          acute_load: number
          chronic_load: number
          history_days: number
          last_checkin: string
          measured: boolean
          mood: number
          name: string
          sleep_hours: number
          sleep_quality: number
          soreness: number
          stress: number
          user_id: string
        }[]
      }
      is_chat_participant: { Args: { _chat_id: string }; Returns: boolean }
      is_coach_of_team: { Args: { _team_id: string }; Returns: boolean }
      is_team_member: {
        Args: { _team_id: string; _user_id: string }
        Returns: boolean
      }
      peek_team_invite: {
        Args: { _token_hash: string }
        Returns: {
          coach_name: string
          member_count: number
          reason: string
          team_id: string
          team_name: string
          valid: boolean
        }[]
      }
      redeem_team_invite: {
        Args: { _token_hash: string }
        Returns: {
          ok: boolean
          reason: string
          team_id: string
          team_name: string
        }[]
      }
    }
    Enums: {
      activity_source: "file" | "garmin" | "manual"
      chat_type: "direct" | "team"
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
      import_status: "queued" | "processing" | "done" | "failed" | "skipped"
      intensity_level: "low" | "mid" | "high"
      leaderboard_period: "week" | "month" | "year" | "all_time"
      leaderboard_scope: "global" | "team" | "friends"
      match_hardness: "easy" | "normal" | "hard"
      meal_type: "breakfast" | "lunch" | "dinner" | "snack"
      nutrition_source: "manual" | "scan"
      session_status: "planned" | "done" | "skipped"
      sex_type: "male" | "female" | "other"
      sport_kind: "training" | "match"
      team_member_status: "pending" | "active" | "declined"
      user_role: "athlete" | "coach"
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
      activity_source: ["file", "garmin", "manual"],
      chat_type: ["direct", "team"],
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
      import_status: ["queued", "processing", "done", "failed", "skipped"],
      intensity_level: ["low", "mid", "high"],
      leaderboard_period: ["week", "month", "year", "all_time"],
      leaderboard_scope: ["global", "team", "friends"],
      match_hardness: ["easy", "normal", "hard"],
      meal_type: ["breakfast", "lunch", "dinner", "snack"],
      nutrition_source: ["manual", "scan"],
      session_status: ["planned", "done", "skipped"],
      sex_type: ["male", "female", "other"],
      sport_kind: ["training", "match"],
      team_member_status: ["pending", "active", "declined"],
      user_role: ["athlete", "coach"],
    },
  },
} as const
