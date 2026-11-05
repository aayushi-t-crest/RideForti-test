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
    PostgrestVersion: "14.17"
  }
  public: {
    Tables: {
      academy_attempt_answers: {
        Row: {
          answered_at: string
          attempt_id: string
          difficulty_served: string
          id: string
          is_correct: boolean
          question_id: string
          selected_index: number | null
        }
        Insert: {
          answered_at?: string
          attempt_id: string
          difficulty_served: string
          id?: string
          is_correct?: boolean
          question_id: string
          selected_index?: number | null
        }
        Update: {
          answered_at?: string
          attempt_id?: string
          difficulty_served?: string
          id?: string
          is_correct?: boolean
          question_id?: string
          selected_index?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "academy_attempt_answers_attempt_id_fkey"
            columns: ["attempt_id"]
            isOneToOne: false
            referencedRelation: "academy_quiz_attempts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "academy_attempt_answers_question_id_fkey"
            columns: ["question_id"]
            isOneToOne: false
            referencedRelation: "academy_questions"
            referencedColumns: ["id"]
          },
        ]
      }
      academy_certifications: {
        Row: {
          attempt_id: string | null
          driver_id: string
          expires_at: string
          id: string
          issued_at: string
          level_key: string
          revoked: boolean
          revoked_reason: string | null
        }
        Insert: {
          attempt_id?: string | null
          driver_id: string
          expires_at?: string
          id?: string
          issued_at?: string
          level_key: string
          revoked?: boolean
          revoked_reason?: string | null
        }
        Update: {
          attempt_id?: string | null
          driver_id?: string
          expires_at?: string
          id?: string
          issued_at?: string
          level_key?: string
          revoked?: boolean
          revoked_reason?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "academy_certifications_attempt_id_fkey"
            columns: ["attempt_id"]
            isOneToOne: false
            referencedRelation: "academy_quiz_attempts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "academy_certifications_driver_id_fkey"
            columns: ["driver_id"]
            isOneToOne: false
            referencedRelation: "academy_drivers"
            referencedColumns: ["id"]
          },
        ]
      }
      academy_drivers: {
        Row: {
          created_at: string
          current_level: string
          email: string
          first_name: string
          forti_score: number
          id: string
          invite_id: string | null
          last_login_at: string | null
          last_name: string
          password_hash: string
          phone: string
          status: string
          track: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          current_level?: string
          email: string
          first_name: string
          forti_score?: number
          id?: string
          invite_id?: string | null
          last_login_at?: string | null
          last_name: string
          password_hash: string
          phone: string
          status?: string
          track?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          current_level?: string
          email?: string
          first_name?: string
          forti_score?: number
          id?: string
          invite_id?: string | null
          last_login_at?: string | null
          last_name?: string
          password_hash?: string
          phone?: string
          status?: string
          track?: string
          updated_at?: string
        }
        Relationships: []
      }
      academy_firearm_compliance: {
        Row: {
          acknowledged_disclosure: boolean
          acknowledged_legal: boolean
          acknowledged_storage: boolean
          created_at: string
          driver_id: string
          external_cert_doc_url: string | null
          external_cert_provider: string | null
          id: string
          permit_doc_url: string | null
          permit_expires: string | null
          permit_number: string | null
          permit_state: string | null
          review_notes: string | null
          review_status: string
          reviewed_by: string | null
          updated_at: string
        }
        Insert: {
          acknowledged_disclosure?: boolean
          acknowledged_legal?: boolean
          acknowledged_storage?: boolean
          created_at?: string
          driver_id: string
          external_cert_doc_url?: string | null
          external_cert_provider?: string | null
          id?: string
          permit_doc_url?: string | null
          permit_expires?: string | null
          permit_number?: string | null
          permit_state?: string | null
          review_notes?: string | null
          review_status?: string
          reviewed_by?: string | null
          updated_at?: string
        }
        Update: {
          acknowledged_disclosure?: boolean
          acknowledged_legal?: boolean
          acknowledged_storage?: boolean
          created_at?: string
          driver_id?: string
          external_cert_doc_url?: string | null
          external_cert_provider?: string | null
          id?: string
          permit_doc_url?: string | null
          permit_expires?: string | null
          permit_number?: string | null
          permit_state?: string | null
          review_notes?: string | null
          review_status?: string
          reviewed_by?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "academy_firearm_compliance_driver_id_fkey"
            columns: ["driver_id"]
            isOneToOne: true
            referencedRelation: "academy_drivers"
            referencedColumns: ["id"]
          },
        ]
      }
      academy_forti_score_history: {
        Row: {
          created_at: string
          driver_id: string
          id: string
          performance_pct: number
          reason: string | null
          reliability_pct: number
          score: number
          tier_pct: number
          training_pct: number
        }
        Insert: {
          created_at?: string
          driver_id: string
          id?: string
          performance_pct?: number
          reason?: string | null
          reliability_pct?: number
          score: number
          tier_pct?: number
          training_pct?: number
        }
        Update: {
          created_at?: string
          driver_id?: string
          id?: string
          performance_pct?: number
          reason?: string | null
          reliability_pct?: number
          score?: number
          tier_pct?: number
          training_pct?: number
        }
        Relationships: [
          {
            foreignKeyName: "academy_forti_score_history_driver_id_fkey"
            columns: ["driver_id"]
            isOneToOne: false
            referencedRelation: "academy_drivers"
            referencedColumns: ["id"]
          },
        ]
      }
      academy_invites: {
        Row: {
          created_at: string
          created_by: string | null
          email: string
          expires_at: string
          first_name: string | null
          id: string
          last_name: string | null
          phone: string
          status: string
          token: string
          track: string
          used_at: string | null
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          email: string
          expires_at?: string
          first_name?: string | null
          id?: string
          last_name?: string | null
          phone: string
          status?: string
          token: string
          track?: string
          used_at?: string | null
        }
        Update: {
          created_at?: string
          created_by?: string | null
          email?: string
          expires_at?: string
          first_name?: string | null
          id?: string
          last_name?: string | null
          phone?: string
          status?: string
          token?: string
          track?: string
          used_at?: string | null
        }
        Relationships: []
      }
      academy_lesson_progress: {
        Row: {
          completed_at: string
          driver_id: string
          id: string
          lesson_id: string
        }
        Insert: {
          completed_at?: string
          driver_id: string
          id?: string
          lesson_id: string
        }
        Update: {
          completed_at?: string
          driver_id?: string
          id?: string
          lesson_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "academy_lesson_progress_driver_id_fkey"
            columns: ["driver_id"]
            isOneToOne: false
            referencedRelation: "academy_drivers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "academy_lesson_progress_lesson_id_fkey"
            columns: ["lesson_id"]
            isOneToOne: false
            referencedRelation: "academy_lessons"
            referencedColumns: ["id"]
          },
        ]
      }
      academy_lessons: {
        Row: {
          content: string
          created_at: string
          display_order: number
          id: string
          module_id: string
          scenario: string | null
          takeaways: Json
          title: string
        }
        Insert: {
          content: string
          created_at?: string
          display_order?: number
          id?: string
          module_id: string
          scenario?: string | null
          takeaways?: Json
          title: string
        }
        Update: {
          content?: string
          created_at?: string
          display_order?: number
          id?: string
          module_id?: string
          scenario?: string | null
          takeaways?: Json
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "academy_lessons_module_id_fkey"
            columns: ["module_id"]
            isOneToOne: false
            referencedRelation: "academy_modules"
            referencedColumns: ["id"]
          },
        ]
      }
      academy_levels: {
        Row: {
          created_at: string
          description: string | null
          id: string
          key: string
          name: string
          pass_threshold: number
          perks: Json
          rank: number
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          key: string
          name: string
          pass_threshold?: number
          perks?: Json
          rank: number
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          key?: string
          name?: string
          pass_threshold?: number
          perks?: Json
          rank?: number
        }
        Relationships: []
      }
      academy_modules: {
        Row: {
          created_at: string
          display_order: number
          id: string
          is_active: boolean
          is_firearm: boolean
          key: string
          level_key: string
          summary: string | null
          title: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          display_order?: number
          id?: string
          is_active?: boolean
          is_firearm?: boolean
          key: string
          level_key?: string
          summary?: string | null
          title: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          display_order?: number
          id?: string
          is_active?: boolean
          is_firearm?: boolean
          key?: string
          level_key?: string
          summary?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      academy_otp_codes: {
        Row: {
          code: string
          created_at: string
          driver_id: string
          expires_at: string
          id: string
          used: boolean
        }
        Insert: {
          code: string
          created_at?: string
          driver_id: string
          expires_at?: string
          id?: string
          used?: boolean
        }
        Update: {
          code?: string
          created_at?: string
          driver_id?: string
          expires_at?: string
          id?: string
          used?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "academy_otp_codes_driver_id_fkey"
            columns: ["driver_id"]
            isOneToOne: false
            referencedRelation: "academy_drivers"
            referencedColumns: ["id"]
          },
        ]
      }
      academy_questions: {
        Row: {
          correct_index: number
          created_at: string
          difficulty: string
          explanation: string | null
          id: string
          is_active: boolean
          is_scenario: boolean
          level_key: string
          module_key: string
          options: Json
          prompt: string
        }
        Insert: {
          correct_index: number
          created_at?: string
          difficulty: string
          explanation?: string | null
          id?: string
          is_active?: boolean
          is_scenario?: boolean
          level_key?: string
          module_key: string
          options: Json
          prompt: string
        }
        Update: {
          correct_index?: number
          created_at?: string
          difficulty?: string
          explanation?: string | null
          id?: string
          is_active?: boolean
          is_scenario?: boolean
          level_key?: string
          module_key?: string
          options?: Json
          prompt?: string
        }
        Relationships: []
      }
      academy_quiz_attempts: {
        Row: {
          completed_at: string | null
          correct_count: number
          current_difficulty: string
          driver_id: string
          id: string
          level_key: string
          passed: boolean | null
          questions_served: number
          score: number | null
          started_at: string
          status: string
        }
        Insert: {
          completed_at?: string | null
          correct_count?: number
          current_difficulty?: string
          driver_id: string
          id?: string
          level_key: string
          passed?: boolean | null
          questions_served?: number
          score?: number | null
          started_at?: string
          status?: string
        }
        Update: {
          completed_at?: string | null
          correct_count?: number
          current_difficulty?: string
          driver_id?: string
          id?: string
          level_key?: string
          passed?: boolean | null
          questions_served?: number
          score?: number | null
          started_at?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "academy_quiz_attempts_driver_id_fkey"
            columns: ["driver_id"]
            isOneToOne: false
            referencedRelation: "academy_drivers"
            referencedColumns: ["id"]
          },
        ]
      }
      academy_sessions: {
        Row: {
          created_at: string
          driver_id: string
          expires_at: string
          id: string
          ip: string | null
          session_token: string
          user_agent: string | null
        }
        Insert: {
          created_at?: string
          driver_id: string
          expires_at?: string
          id?: string
          ip?: string | null
          session_token: string
          user_agent?: string | null
        }
        Update: {
          created_at?: string
          driver_id?: string
          expires_at?: string
          id?: string
          ip?: string | null
          session_token?: string
          user_agent?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "academy_sessions_driver_id_fkey"
            columns: ["driver_id"]
            isOneToOne: false
            referencedRelation: "academy_drivers"
            referencedColumns: ["id"]
          },
        ]
      }
      academy_tracks: {
        Row: {
          created_at: string
          description: string | null
          display_order: number
          id: string
          key: string
          name: string
          required: boolean
        }
        Insert: {
          created_at?: string
          description?: string | null
          display_order?: number
          id?: string
          key: string
          name: string
          required?: boolean
        }
        Update: {
          created_at?: string
          description?: string | null
          display_order?: number
          id?: string
          key?: string
          name?: string
          required?: boolean
        }
        Relationships: []
      }
      admin_accounts: {
        Row: {
          cost_period: string
          created_at: string
          created_by: string | null
          due_date: string | null
          id: string
          monthly_cost_cents: number | null
          notes: string | null
          password: string | null
          platform: string | null
          updated_at: string
          url: string | null
          username: string | null
        }
        Insert: {
          cost_period?: string
          created_at?: string
          created_by?: string | null
          due_date?: string | null
          id?: string
          monthly_cost_cents?: number | null
          notes?: string | null
          password?: string | null
          platform?: string | null
          updated_at?: string
          url?: string | null
          username?: string | null
        }
        Update: {
          cost_period?: string
          created_at?: string
          created_by?: string | null
          due_date?: string | null
          id?: string
          monthly_cost_cents?: number | null
          notes?: string | null
          password?: string | null
          platform?: string | null
          updated_at?: string
          url?: string | null
          username?: string | null
        }
        Relationships: []
      }
      admin_users_directory: {
        Row: {
          active: boolean
          created_at: string
          email: string
          full_name: string | null
          id: string
          is_supervisor: boolean
          phone: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          active?: boolean
          created_at?: string
          email: string
          full_name?: string | null
          id?: string
          is_supervisor?: boolean
          phone?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          active?: boolean
          created_at?: string
          email?: string
          full_name?: string | null
          id?: string
          is_supervisor?: boolean
          phone?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      ambassador_attempt_answers: {
        Row: {
          answered_at: string
          attempt_id: string
          difficulty_served: string
          id: string
          is_correct: boolean
          question_id: string
          selected_index: number | null
        }
        Insert: {
          answered_at?: string
          attempt_id: string
          difficulty_served: string
          id?: string
          is_correct?: boolean
          question_id: string
          selected_index?: number | null
        }
        Update: {
          answered_at?: string
          attempt_id?: string
          difficulty_served?: string
          id?: string
          is_correct?: boolean
          question_id?: string
          selected_index?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "ambassador_attempt_answers_attempt_id_fkey"
            columns: ["attempt_id"]
            isOneToOne: false
            referencedRelation: "ambassador_quiz_attempts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ambassador_attempt_answers_question_id_fkey"
            columns: ["question_id"]
            isOneToOne: false
            referencedRelation: "ambassador_questions"
            referencedColumns: ["id"]
          },
        ]
      }
      ambassador_certifications: {
        Row: {
          ambassador_id: string
          attempt_id: string | null
          expires_at: string
          id: string
          issued_at: string
          level_key: string
          revoked: boolean
          revoked_reason: string | null
        }
        Insert: {
          ambassador_id: string
          attempt_id?: string | null
          expires_at?: string
          id?: string
          issued_at?: string
          level_key: string
          revoked?: boolean
          revoked_reason?: string | null
        }
        Update: {
          ambassador_id?: string
          attempt_id?: string | null
          expires_at?: string
          id?: string
          issued_at?: string
          level_key?: string
          revoked?: boolean
          revoked_reason?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ambassador_certifications_ambassador_id_fkey"
            columns: ["ambassador_id"]
            isOneToOne: false
            referencedRelation: "ambassador_drivers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ambassador_certifications_attempt_id_fkey"
            columns: ["attempt_id"]
            isOneToOne: false
            referencedRelation: "ambassador_quiz_attempts"
            referencedColumns: ["id"]
          },
        ]
      }
      ambassador_drivers: {
        Row: {
          city: string | null
          created_at: string
          current_level: string
          email: string
          first_name: string
          forti_score: number
          id: string
          instagram_handle: string | null
          invite_id: string | null
          last_login_at: string | null
          last_name: string
          password_hash: string
          phone: string
          qr_code: string
          referral_link: string | null
          status: string
          tiktok_handle: string | null
          track: string
          updated_at: string
        }
        Insert: {
          city?: string | null
          created_at?: string
          current_level?: string
          email: string
          first_name: string
          forti_score?: number
          id?: string
          instagram_handle?: string | null
          invite_id?: string | null
          last_login_at?: string | null
          last_name: string
          password_hash: string
          phone: string
          qr_code?: string
          referral_link?: string | null
          status?: string
          tiktok_handle?: string | null
          track?: string
          updated_at?: string
        }
        Update: {
          city?: string | null
          created_at?: string
          current_level?: string
          email?: string
          first_name?: string
          forti_score?: number
          id?: string
          instagram_handle?: string | null
          invite_id?: string | null
          last_login_at?: string | null
          last_name?: string
          password_hash?: string
          phone?: string
          qr_code?: string
          referral_link?: string | null
          status?: string
          tiktok_handle?: string | null
          track?: string
          updated_at?: string
        }
        Relationships: []
      }
      ambassador_invites: {
        Row: {
          created_at: string
          created_by: string | null
          email: string
          expires_at: string
          first_name: string | null
          id: string
          last_name: string | null
          phone: string
          status: string
          token: string
          track: string
          used_at: string | null
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          email: string
          expires_at?: string
          first_name?: string | null
          id?: string
          last_name?: string | null
          phone: string
          status?: string
          token: string
          track?: string
          used_at?: string | null
        }
        Update: {
          created_at?: string
          created_by?: string | null
          email?: string
          expires_at?: string
          first_name?: string | null
          id?: string
          last_name?: string | null
          phone?: string
          status?: string
          token?: string
          track?: string
          used_at?: string | null
        }
        Relationships: []
      }
      ambassador_lesson_progress: {
        Row: {
          ambassador_id: string
          completed_at: string
          id: string
          lesson_id: string
        }
        Insert: {
          ambassador_id: string
          completed_at?: string
          id?: string
          lesson_id: string
        }
        Update: {
          ambassador_id?: string
          completed_at?: string
          id?: string
          lesson_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ambassador_lesson_progress_ambassador_id_fkey"
            columns: ["ambassador_id"]
            isOneToOne: false
            referencedRelation: "ambassador_drivers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ambassador_lesson_progress_lesson_id_fkey"
            columns: ["lesson_id"]
            isOneToOne: false
            referencedRelation: "ambassador_lessons"
            referencedColumns: ["id"]
          },
        ]
      }
      ambassador_lessons: {
        Row: {
          content: string
          created_at: string
          display_order: number
          id: string
          module_id: string
          scenario: string | null
          takeaways: Json
          title: string
        }
        Insert: {
          content: string
          created_at?: string
          display_order?: number
          id?: string
          module_id: string
          scenario?: string | null
          takeaways?: Json
          title: string
        }
        Update: {
          content?: string
          created_at?: string
          display_order?: number
          id?: string
          module_id?: string
          scenario?: string | null
          takeaways?: Json
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "ambassador_lessons_module_id_fkey"
            columns: ["module_id"]
            isOneToOne: false
            referencedRelation: "ambassador_modules"
            referencedColumns: ["id"]
          },
        ]
      }
      ambassador_levels: {
        Row: {
          created_at: string
          description: string | null
          id: string
          key: string
          name: string
          pass_threshold: number
          perks: Json
          rank: number
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          key: string
          name: string
          pass_threshold?: number
          perks?: Json
          rank: number
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          key?: string
          name?: string
          pass_threshold?: number
          perks?: Json
          rank?: number
        }
        Relationships: []
      }
      ambassador_modules: {
        Row: {
          created_at: string
          display_order: number
          group_key: string
          id: string
          is_active: boolean
          key: string
          level_key: string
          summary: string | null
          title: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          display_order?: number
          group_key?: string
          id?: string
          is_active?: boolean
          key: string
          level_key?: string
          summary?: string | null
          title: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          display_order?: number
          group_key?: string
          id?: string
          is_active?: boolean
          key?: string
          level_key?: string
          summary?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      ambassador_otp_codes: {
        Row: {
          ambassador_id: string
          code: string
          created_at: string
          expires_at: string
          id: string
          used: boolean
        }
        Insert: {
          ambassador_id: string
          code: string
          created_at?: string
          expires_at?: string
          id?: string
          used?: boolean
        }
        Update: {
          ambassador_id?: string
          code?: string
          created_at?: string
          expires_at?: string
          id?: string
          used?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "ambassador_otp_codes_ambassador_id_fkey"
            columns: ["ambassador_id"]
            isOneToOne: false
            referencedRelation: "ambassador_drivers"
            referencedColumns: ["id"]
          },
        ]
      }
      ambassador_questions: {
        Row: {
          correct_index: number
          created_at: string
          difficulty: string
          explanation: string | null
          id: string
          is_active: boolean
          is_scenario: boolean
          level_key: string
          module_key: string
          options: Json
          prompt: string
        }
        Insert: {
          correct_index: number
          created_at?: string
          difficulty: string
          explanation?: string | null
          id?: string
          is_active?: boolean
          is_scenario?: boolean
          level_key?: string
          module_key: string
          options: Json
          prompt: string
        }
        Update: {
          correct_index?: number
          created_at?: string
          difficulty?: string
          explanation?: string | null
          id?: string
          is_active?: boolean
          is_scenario?: boolean
          level_key?: string
          module_key?: string
          options?: Json
          prompt?: string
        }
        Relationships: []
      }
      ambassador_quiz_attempts: {
        Row: {
          ambassador_id: string
          completed_at: string | null
          correct_count: number
          current_difficulty: string
          id: string
          level_key: string
          passed: boolean | null
          questions_served: number
          score: number | null
          started_at: string
          status: string
        }
        Insert: {
          ambassador_id: string
          completed_at?: string | null
          correct_count?: number
          current_difficulty?: string
          id?: string
          level_key: string
          passed?: boolean | null
          questions_served?: number
          score?: number | null
          started_at?: string
          status?: string
        }
        Update: {
          ambassador_id?: string
          completed_at?: string | null
          correct_count?: number
          current_difficulty?: string
          id?: string
          level_key?: string
          passed?: boolean | null
          questions_served?: number
          score?: number | null
          started_at?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "ambassador_quiz_attempts_ambassador_id_fkey"
            columns: ["ambassador_id"]
            isOneToOne: false
            referencedRelation: "ambassador_drivers"
            referencedColumns: ["id"]
          },
        ]
      }
      ambassador_score_history: {
        Row: {
          ambassador_id: string
          conduct_pct: number
          created_at: string
          downloads_pct: number
          id: string
          performance_pct: number
          reason: string | null
          score: number
          training_pct: number
        }
        Insert: {
          ambassador_id: string
          conduct_pct?: number
          created_at?: string
          downloads_pct?: number
          id?: string
          performance_pct?: number
          reason?: string | null
          score: number
          training_pct?: number
        }
        Update: {
          ambassador_id?: string
          conduct_pct?: number
          created_at?: string
          downloads_pct?: number
          id?: string
          performance_pct?: number
          reason?: string | null
          score?: number
          training_pct?: number
        }
        Relationships: [
          {
            foreignKeyName: "ambassador_score_history_ambassador_id_fkey"
            columns: ["ambassador_id"]
            isOneToOne: false
            referencedRelation: "ambassador_drivers"
            referencedColumns: ["id"]
          },
        ]
      }
      ambassador_sessions: {
        Row: {
          ambassador_id: string
          created_at: string
          expires_at: string
          id: string
          ip: string | null
          session_token: string
          user_agent: string | null
        }
        Insert: {
          ambassador_id: string
          created_at?: string
          expires_at?: string
          id?: string
          ip?: string | null
          session_token: string
          user_agent?: string | null
        }
        Update: {
          ambassador_id?: string
          created_at?: string
          expires_at?: string
          id?: string
          ip?: string | null
          session_token?: string
          user_agent?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ambassador_sessions_ambassador_id_fkey"
            columns: ["ambassador_id"]
            isOneToOne: false
            referencedRelation: "ambassador_drivers"
            referencedColumns: ["id"]
          },
        ]
      }
      ambassador_tracks: {
        Row: {
          created_at: string
          description: string | null
          display_order: number
          id: string
          key: string
          name: string
          required: boolean
        }
        Insert: {
          created_at?: string
          description?: string | null
          display_order?: number
          id?: string
          key: string
          name: string
          required?: boolean
        }
        Update: {
          created_at?: string
          description?: string | null
          display_order?: number
          id?: string
          key?: string
          name?: string
          required?: boolean
        }
        Relationships: []
      }
      archived_users: {
        Row: {
          archived_at: string
          archived_by: string | null
          created_at: string | null
          email: string
          expires_at: string
          id: string
          module_permissions: Json | null
          original_user_id: string
          roles: string[] | null
        }
        Insert: {
          archived_at?: string
          archived_by?: string | null
          created_at?: string | null
          email: string
          expires_at?: string
          id?: string
          module_permissions?: Json | null
          original_user_id: string
          roles?: string[] | null
        }
        Update: {
          archived_at?: string
          archived_by?: string | null
          created_at?: string | null
          email?: string
          expires_at?: string
          id?: string
          module_permissions?: Json | null
          original_user_id?: string
          roles?: string[] | null
        }
        Relationships: []
      }
      calendar_notifications: {
        Row: {
          assignment_id: string | null
          body: string | null
          created_at: string
          event_id: string | null
          id: string
          read: boolean
          recipient_id: string
          title: string
          type: string
        }
        Insert: {
          assignment_id?: string | null
          body?: string | null
          created_at?: string
          event_id?: string | null
          id?: string
          read?: boolean
          recipient_id: string
          title: string
          type: string
        }
        Update: {
          assignment_id?: string | null
          body?: string | null
          created_at?: string
          event_id?: string | null
          id?: string
          read?: boolean
          recipient_id?: string
          title?: string
          type?: string
        }
        Relationships: [
          {
            foreignKeyName: "calendar_notifications_assignment_id_fkey"
            columns: ["assignment_id"]
            isOneToOne: false
            referencedRelation: "event_staff_assignments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "calendar_notifications_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "department_events"
            referencedColumns: ["id"]
          },
        ]
      }
      calendar_share_links: {
        Row: {
          created_at: string
          created_by: string | null
          department: string
          enabled: boolean
          id: string
          last_accessed_at: string | null
          permission: string
          recipient_name: string
          recipient_phone: string
          token: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          department?: string
          enabled?: boolean
          id?: string
          last_accessed_at?: string | null
          permission?: string
          recipient_name: string
          recipient_phone: string
          token: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          department?: string
          enabled?: boolean
          id?: string
          last_accessed_at?: string | null
          permission?: string
          recipient_name?: string
          recipient_phone?: string
          token?: string
          updated_at?: string
        }
        Relationships: []
      }
      contract_custom_fields: {
        Row: {
          contract_id: string
          created_at: string
          field_type: string
          id: string
          label: string
          position: number
          required: boolean
          value: string | null
        }
        Insert: {
          contract_id: string
          created_at?: string
          field_type?: string
          id?: string
          label: string
          position?: number
          required?: boolean
          value?: string | null
        }
        Update: {
          contract_id?: string
          created_at?: string
          field_type?: string
          id?: string
          label?: string
          position?: number
          required?: boolean
          value?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "contract_custom_fields_contract_id_fkey"
            columns: ["contract_id"]
            isOneToOne: false
            referencedRelation: "contracts"
            referencedColumns: ["id"]
          },
        ]
      }
      contract_events: {
        Row: {
          contract_id: string
          created_at: string
          event_type: string
          id: string
          ip_address: string | null
          metadata: Json | null
          user_agent: string | null
        }
        Insert: {
          contract_id: string
          created_at?: string
          event_type: string
          id?: string
          ip_address?: string | null
          metadata?: Json | null
          user_agent?: string | null
        }
        Update: {
          contract_id?: string
          created_at?: string
          event_type?: string
          id?: string
          ip_address?: string | null
          metadata?: Json | null
          user_agent?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "contract_events_contract_id_fkey"
            columns: ["contract_id"]
            isOneToOne: false
            referencedRelation: "contracts"
            referencedColumns: ["id"]
          },
        ]
      }
      contracts: {
        Row: {
          amount_cents: number | null
          created_at: string
          created_by: string | null
          description: string | null
          document_mime: string | null
          document_name: string
          document_path: string
          expires_at: string | null
          id: string
          payment_terms: string | null
          recipient_email: string
          recipient_name: string
          recipient_phone: string
          sent_at: string | null
          sent_via_email: boolean
          sent_via_sms: boolean
          sign_token: string
          signature_data_url: string | null
          signed_at: string | null
          signed_document_path: string | null
          signed_ip: string | null
          signed_user_agent: string | null
          signer_typed_name: string | null
          status: string
          title: string
          updated_at: string
        }
        Insert: {
          amount_cents?: number | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          document_mime?: string | null
          document_name: string
          document_path: string
          expires_at?: string | null
          id?: string
          payment_terms?: string | null
          recipient_email: string
          recipient_name: string
          recipient_phone: string
          sent_at?: string | null
          sent_via_email?: boolean
          sent_via_sms?: boolean
          sign_token: string
          signature_data_url?: string | null
          signed_at?: string | null
          signed_document_path?: string | null
          signed_ip?: string | null
          signed_user_agent?: string | null
          signer_typed_name?: string | null
          status?: string
          title: string
          updated_at?: string
        }
        Update: {
          amount_cents?: number | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          document_mime?: string | null
          document_name?: string
          document_path?: string
          expires_at?: string | null
          id?: string
          payment_terms?: string | null
          recipient_email?: string
          recipient_name?: string
          recipient_phone?: string
          sent_at?: string | null
          sent_via_email?: boolean
          sent_via_sms?: boolean
          sign_token?: string
          signature_data_url?: string | null
          signed_at?: string | null
          signed_document_path?: string | null
          signed_ip?: string | null
          signed_user_agent?: string | null
          signer_typed_name?: string | null
          status?: string
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      department_events: {
        Row: {
          color: string | null
          created_at: string
          department: string
          description: string | null
          docs: string[] | null
          end_date: string | null
          end_time: string | null
          event_date: string
          event_time: string | null
          id: string
          is_recurring_child: boolean
          links: string[] | null
          location: string | null
          notes: string | null
          recurrence: Json | null
          series_id: string | null
          tags: Json
          title: string
          updated_at: string
        }
        Insert: {
          color?: string | null
          created_at?: string
          department?: string
          description?: string | null
          docs?: string[] | null
          end_date?: string | null
          end_time?: string | null
          event_date: string
          event_time?: string | null
          id?: string
          is_recurring_child?: boolean
          links?: string[] | null
          location?: string | null
          notes?: string | null
          recurrence?: Json | null
          series_id?: string | null
          tags?: Json
          title: string
          updated_at?: string
        }
        Update: {
          color?: string | null
          created_at?: string
          department?: string
          description?: string | null
          docs?: string[] | null
          end_date?: string | null
          end_time?: string | null
          event_date?: string
          event_time?: string | null
          id?: string
          is_recurring_child?: boolean
          links?: string[] | null
          location?: string | null
          notes?: string | null
          recurrence?: Json | null
          series_id?: string | null
          tags?: Json
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      discovered_events: {
        Row: {
          ai_search_query: string | null
          approved_by: string | null
          contact_email: string | null
          contact_phone: string | null
          contact_website: string | null
          created_at: string
          decline_reason: string | null
          department: string | null
          description: string | null
          event_date: string
          event_name: string
          event_time: string | null
          event_type: string
          expected_attendance: string | null
          id: string
          location: string | null
          organizer_name: string | null
          reviewed_at: string | null
          source_info: string | null
          source_url: string | null
          status: string
          updated_at: string
          venue: string | null
        }
        Insert: {
          ai_search_query?: string | null
          approved_by?: string | null
          contact_email?: string | null
          contact_phone?: string | null
          contact_website?: string | null
          created_at?: string
          decline_reason?: string | null
          department?: string | null
          description?: string | null
          event_date: string
          event_name: string
          event_time?: string | null
          event_type?: string
          expected_attendance?: string | null
          id?: string
          location?: string | null
          organizer_name?: string | null
          reviewed_at?: string | null
          source_info?: string | null
          source_url?: string | null
          status?: string
          updated_at?: string
          venue?: string | null
        }
        Update: {
          ai_search_query?: string | null
          approved_by?: string | null
          contact_email?: string | null
          contact_phone?: string | null
          contact_website?: string | null
          created_at?: string
          decline_reason?: string | null
          department?: string | null
          description?: string | null
          event_date?: string
          event_name?: string
          event_time?: string | null
          event_type?: string
          expected_attendance?: string | null
          id?: string
          location?: string | null
          organizer_name?: string | null
          reviewed_at?: string | null
          source_info?: string | null
          source_url?: string | null
          status?: string
          updated_at?: string
          venue?: string | null
        }
        Relationships: []
      }
      doc_reminders: {
        Row: {
          assignees: string[]
          cadence: string
          created_at: string
          created_by: string | null
          id: string
          last_sent_at: string | null
          module_id: string
          module_label: string
          next_due_at: string
          note: string | null
          notify_email: boolean
          notify_sms: boolean
          updated_at: string
        }
        Insert: {
          assignees?: string[]
          cadence: string
          created_at?: string
          created_by?: string | null
          id?: string
          last_sent_at?: string | null
          module_id: string
          module_label: string
          next_due_at?: string
          note?: string | null
          notify_email?: boolean
          notify_sms?: boolean
          updated_at?: string
        }
        Update: {
          assignees?: string[]
          cadence?: string
          created_at?: string
          created_by?: string | null
          id?: string
          last_sent_at?: string | null
          module_id?: string
          module_label?: string
          next_due_at?: string
          note?: string | null
          notify_email?: boolean
          notify_sms?: boolean
          updated_at?: string
        }
        Relationships: []
      }
      driver_benefit_images: {
        Row: {
          benefit_key: string
          created_at: string
          id: string
          image_url: string | null
          updated_at: string
          zoom_level: number
        }
        Insert: {
          benefit_key: string
          created_at?: string
          id?: string
          image_url?: string | null
          updated_at?: string
          zoom_level?: number
        }
        Update: {
          benefit_key?: string
          created_at?: string
          id?: string
          image_url?: string | null
          updated_at?: string
          zoom_level?: number
        }
        Relationships: []
      }
      driver_requirement_images: {
        Row: {
          created_at: string
          id: string
          image_url: string | null
          requirement_key: string
          updated_at: string
          zoom_level: number
        }
        Insert: {
          created_at?: string
          id?: string
          image_url?: string | null
          requirement_key: string
          updated_at?: string
          zoom_level?: number
        }
        Update: {
          created_at?: string
          id?: string
          image_url?: string | null
          requirement_key?: string
          updated_at?: string
          zoom_level?: number
        }
        Relationships: []
      }
      email_templates: {
        Row: {
          created_at: string
          id: string
          name: string
          template_data: Json
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          name?: string
          template_data?: Json
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          template_data?: Json
          updated_at?: string
        }
        Relationships: []
      }
      event_note_attachments: {
        Row: {
          created_at: string
          file_name: string
          file_size: number | null
          file_type: string | null
          file_url: string
          id: string
          note_id: string
        }
        Insert: {
          created_at?: string
          file_name: string
          file_size?: number | null
          file_type?: string | null
          file_url: string
          id?: string
          note_id: string
        }
        Update: {
          created_at?: string
          file_name?: string
          file_size?: number | null
          file_type?: string | null
          file_url?: string
          id?: string
          note_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "event_note_attachments_note_id_fkey"
            columns: ["note_id"]
            isOneToOne: false
            referencedRelation: "event_notes"
            referencedColumns: ["id"]
          },
        ]
      }
      event_note_mentions: {
        Row: {
          created_at: string
          id: string
          mentioned_user_email: string
          mentioned_user_id: string
          mentioned_user_name: string | null
          note_id: string
          read: boolean
        }
        Insert: {
          created_at?: string
          id?: string
          mentioned_user_email: string
          mentioned_user_id: string
          mentioned_user_name?: string | null
          note_id: string
          read?: boolean
        }
        Update: {
          created_at?: string
          id?: string
          mentioned_user_email?: string
          mentioned_user_id?: string
          mentioned_user_name?: string | null
          note_id?: string
          read?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "event_note_mentions_note_id_fkey"
            columns: ["note_id"]
            isOneToOne: false
            referencedRelation: "event_notes"
            referencedColumns: ["id"]
          },
        ]
      }
      event_notes: {
        Row: {
          author_email: string | null
          author_id: string
          author_name: string | null
          content: string
          created_at: string
          event_id: string
          id: string
          updated_at: string
        }
        Insert: {
          author_email?: string | null
          author_id: string
          author_name?: string | null
          content: string
          created_at?: string
          event_id: string
          id?: string
          updated_at?: string
        }
        Update: {
          author_email?: string | null
          author_id?: string
          author_name?: string | null
          content?: string
          created_at?: string
          event_id?: string
          id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "event_notes_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "department_events"
            referencedColumns: ["id"]
          },
        ]
      }
      event_staff_assignments: {
        Row: {
          assigned_by: string | null
          created_at: string
          event_id: string
          id: string
          notify_email: boolean
          notify_sms: boolean
          reminders_sent: Json
          responded_at: string | null
          response_reason: string | null
          role_tag: string
          status: string
          updated_at: string
          user_email: string
          user_id: string
          user_name: string | null
          user_phone: string | null
        }
        Insert: {
          assigned_by?: string | null
          created_at?: string
          event_id: string
          id?: string
          notify_email?: boolean
          notify_sms?: boolean
          reminders_sent?: Json
          responded_at?: string | null
          response_reason?: string | null
          role_tag: string
          status?: string
          updated_at?: string
          user_email: string
          user_id: string
          user_name?: string | null
          user_phone?: string | null
        }
        Update: {
          assigned_by?: string | null
          created_at?: string
          event_id?: string
          id?: string
          notify_email?: boolean
          notify_sms?: boolean
          reminders_sent?: Json
          responded_at?: string | null
          response_reason?: string | null
          role_tag?: string
          status?: string
          updated_at?: string
          user_email?: string
          user_id?: string
          user_name?: string | null
          user_phone?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "event_staff_assignments_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "department_events"
            referencedColumns: ["id"]
          },
        ]
      }
      faq_patterns: {
        Row: {
          answer: string
          answer_source: string
          approved: boolean
          approved_at: string | null
          approved_by: string | null
          category: string | null
          created_at: string
          display_order: number | null
          frequency: number
          id: string
          keywords: string[] | null
          last_asked_at: string
          published: boolean
          question: string
          sample_ticket_ids: string[] | null
          source_question_ids: string[] | null
          updated_at: string
        }
        Insert: {
          answer: string
          answer_source?: string
          approved?: boolean
          approved_at?: string | null
          approved_by?: string | null
          category?: string | null
          created_at?: string
          display_order?: number | null
          frequency?: number
          id?: string
          keywords?: string[] | null
          last_asked_at?: string
          published?: boolean
          question: string
          sample_ticket_ids?: string[] | null
          source_question_ids?: string[] | null
          updated_at?: string
        }
        Update: {
          answer?: string
          answer_source?: string
          approved?: boolean
          approved_at?: string | null
          approved_by?: string | null
          category?: string | null
          created_at?: string
          display_order?: number | null
          frequency?: number
          id?: string
          keywords?: string[] | null
          last_asked_at?: string
          published?: boolean
          question?: string
          sample_ticket_ids?: string[] | null
          source_question_ids?: string[] | null
          updated_at?: string
        }
        Relationships: []
      }
      gallery_carousel_images: {
        Row: {
          created_at: string
          display_order: number
          id: string
          image_url: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          display_order?: number
          id?: string
          image_url: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          display_order?: number
          id?: string
          image_url?: string
          updated_at?: string
        }
        Relationships: []
      }
      guard_benefit_images: {
        Row: {
          benefit_key: string
          created_at: string
          id: string
          image_url: string | null
          updated_at: string
          zoom_level: number
        }
        Insert: {
          benefit_key: string
          created_at?: string
          id?: string
          image_url?: string | null
          updated_at?: string
          zoom_level?: number
        }
        Update: {
          benefit_key?: string
          created_at?: string
          id?: string
          image_url?: string | null
          updated_at?: string
          zoom_level?: number
        }
        Relationships: []
      }
      guard_requirement_images: {
        Row: {
          created_at: string
          id: string
          image_url: string | null
          requirement_key: string
          updated_at: string
          zoom_level: number
        }
        Insert: {
          created_at?: string
          id?: string
          image_url?: string | null
          requirement_key: string
          updated_at?: string
          zoom_level?: number
        }
        Update: {
          created_at?: string
          id?: string
          image_url?: string | null
          requirement_key?: string
          updated_at?: string
          zoom_level?: number
        }
        Relationships: []
      }
      how_it_works_images: {
        Row: {
          created_at: string
          id: string
          image_url: string | null
          step_number: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          image_url?: string | null
          step_number: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          image_url?: string | null
          step_number?: string
          updated_at?: string
        }
        Relationships: []
      }
      knowledge_articles: {
        Row: {
          attachments: Json
          category: string
          content: string
          created_at: string
          id: string
          is_active: boolean
          links: Json
          title: string
          updated_at: string
        }
        Insert: {
          attachments?: Json
          category?: string
          content: string
          created_at?: string
          id?: string
          is_active?: boolean
          links?: Json
          title: string
          updated_at?: string
        }
        Update: {
          attachments?: Json
          category?: string
          content?: string
          created_at?: string
          id?: string
          is_active?: boolean
          links?: Json
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      ledger_settings: {
        Row: {
          id: string
          singleton: boolean
          tagged_user_ids: string[]
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          id?: string
          singleton?: boolean
          tagged_user_ids?: string[]
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          id?: string
          singleton?: boolean
          tagged_user_ids?: string[]
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: []
      }
      login_2fa_codes: {
        Row: {
          code: string
          created_at: string
          expires_at: string
          id: string
          used: boolean
          user_id: string
        }
        Insert: {
          code: string
          created_at?: string
          expires_at: string
          id?: string
          used?: boolean
          user_id: string
        }
        Update: {
          code?: string
          created_at?: string
          expires_at?: string
          id?: string
          used?: boolean
          user_id?: string
        }
        Relationships: []
      }
      nova_chats: {
        Row: {
          created_at: string
          id: string
          last_message_at: string
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          last_message_at?: string
          title?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          last_message_at?: string
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      nova_messages: {
        Row: {
          attachments: Json
          chat_id: string
          content: string
          created_at: string
          id: string
          role: string
        }
        Insert: {
          attachments?: Json
          chat_id: string
          content?: string
          created_at?: string
          id?: string
          role: string
        }
        Update: {
          attachments?: Json
          chat_id?: string
          content?: string
          created_at?: string
          id?: string
          role?: string
        }
        Relationships: [
          {
            foreignKeyName: "nova_messages_chat_id_fkey"
            columns: ["chat_id"]
            isOneToOne: false
            referencedRelation: "nova_chats"
            referencedColumns: ["id"]
          },
        ]
      }
      okr_key_results: {
        Row: {
          assigned_to: string | null
          assignees: string[]
          created_at: string
          current_value: number | null
          description: string | null
          id: string
          legacy_board_id: string | null
          objective_id: string
          status: string
          target_value: number | null
          title: string
          unit: string | null
          updated_at: string
        }
        Insert: {
          assigned_to?: string | null
          assignees?: string[]
          created_at?: string
          current_value?: number | null
          description?: string | null
          id?: string
          legacy_board_id?: string | null
          objective_id: string
          status?: string
          target_value?: number | null
          title: string
          unit?: string | null
          updated_at?: string
        }
        Update: {
          assigned_to?: string | null
          assignees?: string[]
          created_at?: string
          current_value?: number | null
          description?: string | null
          id?: string
          legacy_board_id?: string | null
          objective_id?: string
          status?: string
          target_value?: number | null
          title?: string
          unit?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "okr_key_results_objective_id_fkey"
            columns: ["objective_id"]
            isOneToOne: false
            referencedRelation: "okr_objectives"
            referencedColumns: ["id"]
          },
        ]
      }
      okr_objectives: {
        Row: {
          created_at: string
          created_by: string | null
          department: string
          description: string | null
          id: string
          progress: number
          status: string
          time_period: string
          title: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          department?: string
          description?: string | null
          id?: string
          progress?: number
          status?: string
          time_period?: string
          title: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          department?: string
          description?: string | null
          id?: string
          progress?: number
          status?: string
          time_period?: string
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      okr_tasks: {
        Row: {
          assigned_to: string | null
          assigned_to_user_id: string | null
          assignees: string[]
          attachments: Json
          created_at: string
          department: string | null
          description: string | null
          due_date: string | null
          id: string
          key_result_id: string
          links: Json
          notes: string | null
          notify_email: boolean
          notify_sms: boolean
          priority: string
          reminder_at: string | null
          reminder_frequency: string | null
          reminder_last_sent_at: string | null
          reminder_sent: boolean
          status: string
          title: string
          updated_at: string
        }
        Insert: {
          assigned_to?: string | null
          assigned_to_user_id?: string | null
          assignees?: string[]
          attachments?: Json
          created_at?: string
          department?: string | null
          description?: string | null
          due_date?: string | null
          id?: string
          key_result_id: string
          links?: Json
          notes?: string | null
          notify_email?: boolean
          notify_sms?: boolean
          priority?: string
          reminder_at?: string | null
          reminder_frequency?: string | null
          reminder_last_sent_at?: string | null
          reminder_sent?: boolean
          status?: string
          title: string
          updated_at?: string
        }
        Update: {
          assigned_to?: string | null
          assigned_to_user_id?: string | null
          assignees?: string[]
          attachments?: Json
          created_at?: string
          department?: string | null
          description?: string | null
          due_date?: string | null
          id?: string
          key_result_id?: string
          links?: Json
          notes?: string | null
          notify_email?: boolean
          notify_sms?: boolean
          priority?: string
          reminder_at?: string | null
          reminder_frequency?: string | null
          reminder_last_sent_at?: string | null
          reminder_sent?: boolean
          status?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "okr_tasks_key_result_id_fkey"
            columns: ["key_result_id"]
            isOneToOne: false
            referencedRelation: "okr_key_results"
            referencedColumns: ["id"]
          },
        ]
      }
      outbound_call_contact_notes: {
        Row: {
          author_id: string | null
          body: string
          contact_id: string
          created_at: string
          id: string
        }
        Insert: {
          author_id?: string | null
          body: string
          contact_id: string
          created_at?: string
          id?: string
        }
        Update: {
          author_id?: string | null
          body?: string
          contact_id?: string
          created_at?: string
          id?: string
        }
        Relationships: [
          {
            foreignKeyName: "outbound_call_contact_notes_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "outbound_call_contacts"
            referencedColumns: ["id"]
          },
        ]
      }
      outbound_call_contact_rides: {
        Row: {
          booked: boolean
          contact_id: string
          created_at: string
          id: string
          incentive_amount: number
          incentive_note: string | null
          incentive_reviewed_at: string | null
          incentive_reviewed_by: string | null
          incentive_status: string
          list_id: string
          submitted_at: string
          submitted_by: string | null
          updated_at: string
        }
        Insert: {
          booked: boolean
          contact_id: string
          created_at?: string
          id?: string
          incentive_amount?: number
          incentive_note?: string | null
          incentive_reviewed_at?: string | null
          incentive_reviewed_by?: string | null
          incentive_status?: string
          list_id: string
          submitted_at?: string
          submitted_by?: string | null
          updated_at?: string
        }
        Update: {
          booked?: boolean
          contact_id?: string
          created_at?: string
          id?: string
          incentive_amount?: number
          incentive_note?: string | null
          incentive_reviewed_at?: string | null
          incentive_reviewed_by?: string | null
          incentive_status?: string
          list_id?: string
          submitted_at?: string
          submitted_by?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "outbound_call_contact_rides_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "outbound_call_contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "outbound_call_contact_rides_list_id_fkey"
            columns: ["list_id"]
            isOneToOne: false
            referencedRelation: "outbound_call_lists"
            referencedColumns: ["id"]
          },
        ]
      }
      outbound_call_contacts: {
        Row: {
          company: string | null
          created_at: string
          email: string | null
          extra_data: Json
          first_name: string | null
          id: string
          incentive_amount: number
          incentive_note: string | null
          incentive_reviewed_at: string | null
          incentive_reviewed_by: string | null
          incentive_status: string
          last_name: string | null
          list_id: string
          name: string | null
          notes: string | null
          phone: string | null
          ride_booked: boolean | null
          submitted_at: string | null
          submitted_by: string | null
          updated_at: string
        }
        Insert: {
          company?: string | null
          created_at?: string
          email?: string | null
          extra_data?: Json
          first_name?: string | null
          id?: string
          incentive_amount?: number
          incentive_note?: string | null
          incentive_reviewed_at?: string | null
          incentive_reviewed_by?: string | null
          incentive_status?: string
          last_name?: string | null
          list_id: string
          name?: string | null
          notes?: string | null
          phone?: string | null
          ride_booked?: boolean | null
          submitted_at?: string | null
          submitted_by?: string | null
          updated_at?: string
        }
        Update: {
          company?: string | null
          created_at?: string
          email?: string | null
          extra_data?: Json
          first_name?: string | null
          id?: string
          incentive_amount?: number
          incentive_note?: string | null
          incentive_reviewed_at?: string | null
          incentive_reviewed_by?: string | null
          incentive_status?: string
          last_name?: string | null
          list_id?: string
          name?: string | null
          notes?: string | null
          phone?: string | null
          ride_booked?: boolean | null
          submitted_at?: string | null
          submitted_by?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "outbound_call_contacts_list_id_fkey"
            columns: ["list_id"]
            isOneToOne: false
            referencedRelation: "outbound_call_lists"
            referencedColumns: ["id"]
          },
        ]
      }
      outbound_call_lists: {
        Row: {
          contact_count: number
          created_at: string
          created_by: string | null
          id: string
          name: string
          updated_at: string
        }
        Insert: {
          contact_count?: number
          created_at?: string
          created_by?: string | null
          id?: string
          name: string
          updated_at?: string
        }
        Update: {
          contact_count?: number
          created_at?: string
          created_by?: string | null
          id?: string
          name?: string
          updated_at?: string
        }
        Relationships: []
      }
      qr_page_visits: {
        Row: {
          ambassador_id: string | null
          attribution_source: string | null
          created_at: string
          device_type: string
          event_type: string
          id: string
          ip_hash: string | null
          platform: string | null
          referrer: string | null
          screen_height: number | null
          screen_width: number | null
          source_page: string | null
          store: string | null
          user_agent: string | null
        }
        Insert: {
          ambassador_id?: string | null
          attribution_source?: string | null
          created_at?: string
          device_type?: string
          event_type?: string
          id?: string
          ip_hash?: string | null
          platform?: string | null
          referrer?: string | null
          screen_height?: number | null
          screen_width?: number | null
          source_page?: string | null
          store?: string | null
          user_agent?: string | null
        }
        Update: {
          ambassador_id?: string | null
          attribution_source?: string | null
          created_at?: string
          device_type?: string
          event_type?: string
          id?: string
          ip_hash?: string | null
          platform?: string | null
          referrer?: string | null
          screen_height?: number | null
          screen_width?: number | null
          source_page?: string | null
          store?: string | null
          user_agent?: string | null
        }
        Relationships: []
      }
      security_feature_images: {
        Row: {
          created_at: string
          feature_key: string
          id: string
          image_url: string | null
          updated_at: string
          zoom_level: number
        }
        Insert: {
          created_at?: string
          feature_key: string
          id?: string
          image_url?: string | null
          updated_at?: string
          zoom_level?: number
        }
        Update: {
          created_at?: string
          feature_key?: string
          id?: string
          image_url?: string | null
          updated_at?: string
          zoom_level?: number
        }
        Relationships: []
      }
      support_ai_insights: {
        Row: {
          churn_risk: number | null
          generated_at: string
          id: string
          lead_score: number | null
          message_count_at_generation: number
          next_actions: Json
          recommended_tasks: Json
          sentiment_score: number | null
          summary: string | null
          ticket_id: string
          tips: Json
        }
        Insert: {
          churn_risk?: number | null
          generated_at?: string
          id?: string
          lead_score?: number | null
          message_count_at_generation?: number
          next_actions?: Json
          recommended_tasks?: Json
          sentiment_score?: number | null
          summary?: string | null
          ticket_id: string
          tips?: Json
        }
        Update: {
          churn_risk?: number | null
          generated_at?: string
          id?: string
          lead_score?: number | null
          message_count_at_generation?: number
          next_actions?: Json
          recommended_tasks?: Json
          sentiment_score?: number | null
          summary?: string | null
          ticket_id?: string
          tips?: Json
        }
        Relationships: []
      }
      support_chat_messages: {
        Row: {
          attachments: Json
          contact_id: string | null
          content: string
          created_at: string
          id: string
          role: string
          session_id: string
          staff_name: string | null
          staff_user_id: string | null
        }
        Insert: {
          attachments?: Json
          contact_id?: string | null
          content: string
          created_at?: string
          id?: string
          role: string
          session_id: string
          staff_name?: string | null
          staff_user_id?: string | null
        }
        Update: {
          attachments?: Json
          contact_id?: string | null
          content?: string
          created_at?: string
          id?: string
          role?: string
          session_id?: string
          staff_name?: string | null
          staff_user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "support_chat_messages_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "support_contacts"
            referencedColumns: ["id"]
          },
        ]
      }
      support_chat_sessions: {
        Row: {
          ai_enabled: boolean
          assigned_staff_id: string | null
          assigned_staff_name: string | null
          closed_at: string | null
          closed_reason: string | null
          contact_id: string
          created_at: string
          first_staff_response_at: string | null
          human_requested: boolean
          human_requested_at: string | null
          id: string
          status: string
          updated_at: string
        }
        Insert: {
          ai_enabled?: boolean
          assigned_staff_id?: string | null
          assigned_staff_name?: string | null
          closed_at?: string | null
          closed_reason?: string | null
          contact_id: string
          created_at?: string
          first_staff_response_at?: string | null
          human_requested?: boolean
          human_requested_at?: string | null
          id?: string
          status?: string
          updated_at?: string
        }
        Update: {
          ai_enabled?: boolean
          assigned_staff_id?: string | null
          assigned_staff_name?: string | null
          closed_at?: string | null
          closed_reason?: string | null
          contact_id?: string
          created_at?: string
          first_staff_response_at?: string | null
          human_requested?: boolean
          human_requested_at?: string | null
          id?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "support_chat_sessions_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "support_contacts"
            referencedColumns: ["id"]
          },
        ]
      }
      support_contacts: {
        Row: {
          created_at: string
          email: string
          first_name: string
          id: string
          last_name: string
          phone: string
        }
        Insert: {
          created_at?: string
          email: string
          first_name: string
          id?: string
          last_name: string
          phone: string
        }
        Update: {
          created_at?: string
          email?: string
          first_name?: string
          id?: string
          last_name?: string
          phone?: string
        }
        Relationships: []
      }
      support_digest_log: {
        Row: {
          created_at: string
          digest_kind: string
          faq_count: number
          id: string
          recipient_user_id: string
          sent_for_date: string
          ticket_count: number
        }
        Insert: {
          created_at?: string
          digest_kind: string
          faq_count?: number
          id?: string
          recipient_user_id: string
          sent_for_date: string
          ticket_count?: number
        }
        Update: {
          created_at?: string
          digest_kind?: string
          faq_count?: number
          id?: string
          recipient_user_id?: string
          sent_for_date?: string
          ticket_count?: number
        }
        Relationships: []
      }
      support_escalation_contacts: {
        Row: {
          created_at: string
          email: string
          full_name: string | null
          id: string
          min_tier: string
          notify_email: boolean
          notify_slack: boolean
          notify_sms: boolean
          phone: string | null
          slack_user_id: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          email: string
          full_name?: string | null
          id?: string
          min_tier?: string
          notify_email?: boolean
          notify_slack?: boolean
          notify_sms?: boolean
          phone?: string | null
          slack_user_id?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          email?: string
          full_name?: string | null
          id?: string
          min_tier?: string
          notify_email?: boolean
          notify_slack?: boolean
          notify_sms?: boolean
          phone?: string | null
          slack_user_id?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      support_escalation_log: {
        Row: {
          channels: string[]
          contact_id: string
          id: string
          kind: string
          sent_at: string
          ticket_id: string
          tier: string
        }
        Insert: {
          channels?: string[]
          contact_id: string
          id?: string
          kind: string
          sent_at?: string
          ticket_id: string
          tier: string
        }
        Update: {
          channels?: string[]
          contact_id?: string
          id?: string
          kind?: string
          sent_at?: string
          ticket_id?: string
          tier?: string
        }
        Relationships: []
      }
      support_escalation_settings: {
        Row: {
          age_catastrophic_min: number
          age_critical_min: number
          age_imminent_min: number
          age_urgent_min: number
          created_at: string
          id: string
          response_catastrophic_min: number
          response_critical_min: number
          response_imminent_min: number
          response_urgent_min: number
          updated_at: string
        }
        Insert: {
          age_catastrophic_min?: number
          age_critical_min?: number
          age_imminent_min?: number
          age_urgent_min?: number
          created_at?: string
          id?: string
          response_catastrophic_min?: number
          response_critical_min?: number
          response_imminent_min?: number
          response_urgent_min?: number
          updated_at?: string
        }
        Update: {
          age_catastrophic_min?: number
          age_critical_min?: number
          age_imminent_min?: number
          age_urgent_min?: number
          created_at?: string
          id?: string
          response_catastrophic_min?: number
          response_critical_min?: number
          response_imminent_min?: number
          response_urgent_min?: number
          updated_at?: string
        }
        Relationships: []
      }
      support_faq_questions: {
        Row: {
          answer: string | null
          answered_at: string | null
          answered_by: string | null
          answered_by_name: string | null
          assigned_to: string
          assigned_to_email: string | null
          assigned_to_name: string | null
          created_at: string
          escalation_level: string
          id: string
          notification_recipients: Json
          question: string
          read_at: string | null
          reassigned_from: string | null
          status: string
          submitted_by: string
          submitted_by_email: string | null
          submitted_by_name: string | null
          synced_to_faq: boolean
          ticket_id: string | null
          ticket_number: string | null
          updated_at: string
        }
        Insert: {
          answer?: string | null
          answered_at?: string | null
          answered_by?: string | null
          answered_by_name?: string | null
          assigned_to: string
          assigned_to_email?: string | null
          assigned_to_name?: string | null
          created_at?: string
          escalation_level?: string
          id?: string
          notification_recipients?: Json
          question: string
          read_at?: string | null
          reassigned_from?: string | null
          status?: string
          submitted_by: string
          submitted_by_email?: string | null
          submitted_by_name?: string | null
          synced_to_faq?: boolean
          ticket_id?: string | null
          ticket_number?: string | null
          updated_at?: string
        }
        Update: {
          answer?: string | null
          answered_at?: string | null
          answered_by?: string | null
          answered_by_name?: string | null
          assigned_to?: string
          assigned_to_email?: string | null
          assigned_to_name?: string | null
          created_at?: string
          escalation_level?: string
          id?: string
          notification_recipients?: Json
          question?: string
          read_at?: string | null
          reassigned_from?: string | null
          status?: string
          submitted_by?: string
          submitted_by_email?: string | null
          submitted_by_name?: string | null
          synced_to_faq?: boolean
          ticket_id?: string | null
          ticket_number?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "support_faq_questions_ticket_id_fkey"
            columns: ["ticket_id"]
            isOneToOne: false
            referencedRelation: "support_tickets"
            referencedColumns: ["id"]
          },
        ]
      }
      support_internal_note_attachments: {
        Row: {
          created_at: string
          file_name: string
          file_size: number | null
          file_type: string | null
          file_url: string
          id: string
          note_id: string
        }
        Insert: {
          created_at?: string
          file_name: string
          file_size?: number | null
          file_type?: string | null
          file_url: string
          id?: string
          note_id: string
        }
        Update: {
          created_at?: string
          file_name?: string
          file_size?: number | null
          file_type?: string | null
          file_url?: string
          id?: string
          note_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "support_internal_note_attachments_note_id_fkey"
            columns: ["note_id"]
            isOneToOne: false
            referencedRelation: "support_internal_notes"
            referencedColumns: ["id"]
          },
        ]
      }
      support_internal_notes: {
        Row: {
          author_email: string | null
          author_id: string | null
          author_name: string | null
          content: string
          created_at: string
          id: string
          is_ai: boolean
          mentions: Json
          ticket_id: string
          updated_at: string
        }
        Insert: {
          author_email?: string | null
          author_id?: string | null
          author_name?: string | null
          content: string
          created_at?: string
          id?: string
          is_ai?: boolean
          mentions?: Json
          ticket_id: string
          updated_at?: string
        }
        Update: {
          author_email?: string | null
          author_id?: string | null
          author_name?: string | null
          content?: string
          created_at?: string
          id?: string
          is_ai?: boolean
          mentions?: Json
          ticket_id?: string
          updated_at?: string
        }
        Relationships: []
      }
      support_kb_corrections: {
        Row: {
          applies_globally: boolean
          created_at: string
          created_by: string | null
          created_by_name: string | null
          entry_id: string | null
          id: string
          reason: string | null
          rule: string
        }
        Insert: {
          applies_globally?: boolean
          created_at?: string
          created_by?: string | null
          created_by_name?: string | null
          entry_id?: string | null
          id?: string
          reason?: string | null
          rule: string
        }
        Update: {
          applies_globally?: boolean
          created_at?: string
          created_by?: string | null
          created_by_name?: string | null
          entry_id?: string | null
          id?: string
          reason?: string | null
          rule?: string
        }
        Relationships: [
          {
            foreignKeyName: "support_kb_corrections_entry_id_fkey"
            columns: ["entry_id"]
            isOneToOne: false
            referencedRelation: "support_kb_entries"
            referencedColumns: ["id"]
          },
        ]
      }
      support_kb_entries: {
        Row: {
          category: string | null
          content: string
          created_at: string
          created_by: string | null
          created_by_name: string | null
          denied_reason: string | null
          downvotes: number
          embedding: string | null
          id: string
          is_active: boolean
          reinforcement_score: number
          review_status: string
          reviewed_at: string | null
          reviewed_by: string | null
          reviewed_by_name: string | null
          source_ref: string | null
          source_type: string
          source_url: string | null
          summary: string | null
          tags: string[] | null
          title: string
          updated_at: string
          upvotes: number
        }
        Insert: {
          category?: string | null
          content: string
          created_at?: string
          created_by?: string | null
          created_by_name?: string | null
          denied_reason?: string | null
          downvotes?: number
          embedding?: string | null
          id?: string
          is_active?: boolean
          reinforcement_score?: number
          review_status?: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          reviewed_by_name?: string | null
          source_ref?: string | null
          source_type?: string
          source_url?: string | null
          summary?: string | null
          tags?: string[] | null
          title: string
          updated_at?: string
          upvotes?: number
        }
        Update: {
          category?: string | null
          content?: string
          created_at?: string
          created_by?: string | null
          created_by_name?: string | null
          denied_reason?: string | null
          downvotes?: number
          embedding?: string | null
          id?: string
          is_active?: boolean
          reinforcement_score?: number
          review_status?: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          reviewed_by_name?: string | null
          source_ref?: string | null
          source_type?: string
          source_url?: string | null
          summary?: string | null
          tags?: string[] | null
          title?: string
          updated_at?: string
          upvotes?: number
        }
        Relationships: []
      }
      support_kb_feedback: {
        Row: {
          context: string | null
          created_at: string
          entry_id: string
          id: string
          rated_by: string | null
          rated_by_name: string | null
          rating: number
          ticket_id: string | null
        }
        Insert: {
          context?: string | null
          created_at?: string
          entry_id: string
          id?: string
          rated_by?: string | null
          rated_by_name?: string | null
          rating: number
          ticket_id?: string | null
        }
        Update: {
          context?: string | null
          created_at?: string
          entry_id?: string
          id?: string
          rated_by?: string | null
          rated_by_name?: string | null
          rating?: number
          ticket_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "support_kb_feedback_entry_id_fkey"
            columns: ["entry_id"]
            isOneToOne: false
            referencedRelation: "support_kb_entries"
            referencedColumns: ["id"]
          },
        ]
      }
      support_kb_files: {
        Row: {
          created_at: string
          entry_ids: string[] | null
          error_message: string | null
          file_name: string
          file_path: string
          file_size: number | null
          id: string
          ingest_status: string
          mime_type: string | null
          uploaded_by: string | null
          uploaded_by_name: string | null
        }
        Insert: {
          created_at?: string
          entry_ids?: string[] | null
          error_message?: string | null
          file_name: string
          file_path: string
          file_size?: number | null
          id?: string
          ingest_status?: string
          mime_type?: string | null
          uploaded_by?: string | null
          uploaded_by_name?: string | null
        }
        Update: {
          created_at?: string
          entry_ids?: string[] | null
          error_message?: string | null
          file_name?: string
          file_path?: string
          file_size?: number | null
          id?: string
          ingest_status?: string
          mime_type?: string | null
          uploaded_by?: string | null
          uploaded_by_name?: string | null
        }
        Relationships: []
      }
      support_tickets: {
        Row: {
          assigned_at: string | null
          assigned_by: string | null
          assigned_to_email: string | null
          assigned_to_name: string | null
          assigned_to_user_id: string | null
          assignment_level: string
          created_at: string
          description: string
          email: string
          first_name: string
          human_requested: boolean
          id: string
          last_name: string
          last_user_message_at: string | null
          needs_staff_attention: boolean
          phone: string
          source: string
          status: string
          subject: string
          updated_at: string
        }
        Insert: {
          assigned_at?: string | null
          assigned_by?: string | null
          assigned_to_email?: string | null
          assigned_to_name?: string | null
          assigned_to_user_id?: string | null
          assignment_level?: string
          created_at?: string
          description: string
          email: string
          first_name: string
          human_requested?: boolean
          id?: string
          last_name: string
          last_user_message_at?: string | null
          needs_staff_attention?: boolean
          phone: string
          source?: string
          status?: string
          subject: string
          updated_at?: string
        }
        Update: {
          assigned_at?: string | null
          assigned_by?: string | null
          assigned_to_email?: string | null
          assigned_to_name?: string | null
          assigned_to_user_id?: string | null
          assignment_level?: string
          created_at?: string
          description?: string
          email?: string
          first_name?: string
          human_requested?: boolean
          id?: string
          last_name?: string
          last_user_message_at?: string | null
          needs_staff_attention?: boolean
          phone?: string
          source?: string
          status?: string
          subject?: string
          updated_at?: string
        }
        Relationships: []
      }
      task_attachments: {
        Row: {
          created_at: string
          id: string
          name: string
          task_id: string
          type: string
          url: string
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          task_id: string
          type?: string
          url: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          task_id?: string
          type?: string
          url?: string
        }
        Relationships: [
          {
            foreignKeyName: "task_attachments_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "tasks"
            referencedColumns: ["id"]
          },
        ]
      }
      task_boards: {
        Row: {
          created_at: string
          created_by: string | null
          department: string | null
          description: string | null
          id: string
          name: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          department?: string | null
          description?: string | null
          id?: string
          name: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          department?: string | null
          description?: string | null
          id?: string
          name?: string
          updated_at?: string
        }
        Relationships: []
      }
      tasks: {
        Row: {
          assigned_to: string | null
          assigned_to_user_id: string | null
          board_id: string
          created_at: string
          created_by: string | null
          department: string | null
          description: string | null
          due_date: string | null
          id: string
          position: number
          priority: string
          status: string
          title: string
          updated_at: string
        }
        Insert: {
          assigned_to?: string | null
          assigned_to_user_id?: string | null
          board_id: string
          created_at?: string
          created_by?: string | null
          department?: string | null
          description?: string | null
          due_date?: string | null
          id?: string
          position?: number
          priority?: string
          status?: string
          title: string
          updated_at?: string
        }
        Update: {
          assigned_to?: string | null
          assigned_to_user_id?: string | null
          board_id?: string
          created_at?: string
          created_by?: string | null
          department?: string | null
          description?: string | null
          due_date?: string | null
          id?: string
          position?: number
          priority?: string
          status?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "tasks_board_id_fkey"
            columns: ["board_id"]
            isOneToOne: false
            referencedRelation: "task_boards"
            referencedColumns: ["id"]
          },
        ]
      }
      team_ideas: {
        Row: {
          category: string | null
          created_at: string
          decision_reason: string | null
          description: string
          id: string
          reviewed_at: string | null
          reviewed_by_name: string | null
          reviewed_by_user_id: string | null
          status: string
          submitter_email: string
          submitter_name: string | null
          submitter_phone: string | null
          submitter_user_id: string
          title: string
          updated_at: string
        }
        Insert: {
          category?: string | null
          created_at?: string
          decision_reason?: string | null
          description: string
          id?: string
          reviewed_at?: string | null
          reviewed_by_name?: string | null
          reviewed_by_user_id?: string | null
          status?: string
          submitter_email: string
          submitter_name?: string | null
          submitter_phone?: string | null
          submitter_user_id: string
          title: string
          updated_at?: string
        }
        Update: {
          category?: string | null
          created_at?: string
          decision_reason?: string | null
          description?: string
          id?: string
          reviewed_at?: string | null
          reviewed_by_name?: string | null
          reviewed_by_user_id?: string | null
          status?: string
          submitter_email?: string
          submitter_name?: string | null
          submitter_phone?: string | null
          submitter_user_id?: string
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      trust_badges: {
        Row: {
          created_at: string
          display_order: number
          id: string
          image_url: string | null
          name: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          display_order?: number
          id?: string
          image_url?: string | null
          name?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          display_order?: number
          id?: string
          image_url?: string | null
          name?: string
          updated_at?: string
        }
        Relationships: []
      }
      trusted_devices: {
        Row: {
          created_at: string
          device_token: string
          expires_at: string
          id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          device_token: string
          expires_at: string
          id?: string
          user_id: string
        }
        Update: {
          created_at?: string
          device_token?: string
          expires_at?: string
          id?: string
          user_id?: string
        }
        Relationships: []
      }
      use_case_images: {
        Row: {
          created_at: string
          id: string
          image_url: string | null
          updated_at: string
          use_case_key: string
        }
        Insert: {
          created_at?: string
          id?: string
          image_url?: string | null
          updated_at?: string
          use_case_key: string
        }
        Update: {
          created_at?: string
          id?: string
          image_url?: string | null
          updated_at?: string
          use_case_key?: string
        }
        Relationships: []
      }
      user_inbox_seen: {
        Row: {
          last_seen_at: string
          read_keys: string[]
          updated_at: string
          user_id: string
        }
        Insert: {
          last_seen_at?: string
          read_keys?: string[]
          updated_at?: string
          user_id: string
        }
        Update: {
          last_seen_at?: string
          read_keys?: string[]
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      user_module_permissions: {
        Row: {
          access_level: string
          created_at: string
          id: string
          module_name: string
          user_id: string
        }
        Insert: {
          access_level?: string
          created_at?: string
          id?: string
          module_name: string
          user_id: string
        }
        Update: {
          access_level?: string
          created_at?: string
          id?: string
          module_name?: string
          user_id?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      vehicle_images: {
        Row: {
          created_at: string
          experience_level: string
          id: string
          image_url: string
          updated_at: string
          vehicle_type: string
        }
        Insert: {
          created_at?: string
          experience_level: string
          id?: string
          image_url: string
          updated_at?: string
          vehicle_type: string
        }
        Update: {
          created_at?: string
          experience_level?: string
          id?: string
          image_url?: string
          updated_at?: string
          vehicle_type?: string
        }
        Relationships: []
      }
      waitlist: {
        Row: {
          agreed_to_marketing: boolean
          agreed_to_sms: boolean
          agreed_to_terms: boolean
          created_at: string
          email: string
          id: string
          name: string
          phone: string | null
        }
        Insert: {
          agreed_to_marketing?: boolean
          agreed_to_sms?: boolean
          agreed_to_terms?: boolean
          created_at?: string
          email: string
          id?: string
          name: string
          phone?: string | null
        }
        Update: {
          agreed_to_marketing?: boolean
          agreed_to_sms?: boolean
          agreed_to_terms?: boolean
          created_at?: string
          email?: string
          id?: string
          name?: string
          phone?: string | null
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      get_portal_ambassadors: {
        Args: never
        Returns: {
          city: string
          id: string
          name: string
        }[]
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      match_support_kb: {
        Args: {
          match_count?: number
          min_score?: number
          query_embedding: string
        }
        Returns: {
          category: string
          content: string
          id: string
          reinforcement_score: number
          similarity: number
          source_ref: string
          source_type: string
          summary: string
          title: string
        }[]
      }
    }
    Enums: {
      app_role: "admin" | "user" | "supervisor" | "ambassador"
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
      app_role: ["admin", "user", "supervisor", "ambassador"],
    },
  },
} as const
