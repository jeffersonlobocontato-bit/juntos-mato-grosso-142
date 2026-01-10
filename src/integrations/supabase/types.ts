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
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      admin_messages: {
        Row: {
          channel: string
          content: string
          created_at: string
          id: string
          message_type: string
          metadata: Json | null
          recipient_ids: string[]
          sender_id: string
          sent_at: string | null
          status: string
          subject: string
        }
        Insert: {
          channel: string
          content: string
          created_at?: string
          id?: string
          message_type: string
          metadata?: Json | null
          recipient_ids: string[]
          sender_id: string
          sent_at?: string | null
          status?: string
          subject: string
        }
        Update: {
          channel?: string
          content?: string
          created_at?: string
          id?: string
          message_type?: string
          metadata?: Json | null
          recipient_ids?: string[]
          sender_id?: string
          sent_at?: string | null
          status?: string
          subject?: string
        }
        Relationships: []
      }
      ai_agent_config: {
        Row: {
          agent_type: string
          avatar_url: string | null
          config: Json | null
          conversation_starters: Json | null
          created_at: string
          description: string | null
          id: string
          is_active: boolean | null
          name: string
          system_prompt: string
          target_audience: string | null
          updated_at: string
        }
        Insert: {
          agent_type?: string
          avatar_url?: string | null
          config?: Json | null
          conversation_starters?: Json | null
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          system_prompt: string
          target_audience?: string | null
          updated_at?: string
        }
        Update: {
          agent_type?: string
          avatar_url?: string | null
          config?: Json | null
          conversation_starters?: Json | null
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          system_prompt?: string
          target_audience?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      ai_agent_documents: {
        Row: {
          agent_id: string
          created_at: string | null
          document_id: string
          id: string
        }
        Insert: {
          agent_id: string
          created_at?: string | null
          document_id: string
          id?: string
        }
        Update: {
          agent_id?: string
          created_at?: string | null
          document_id?: string
          id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ai_agent_documents_agent_id_fkey"
            columns: ["agent_id"]
            isOneToOne: false
            referencedRelation: "ai_agent_config"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ai_agent_documents_document_id_fkey"
            columns: ["document_id"]
            isOneToOne: false
            referencedRelation: "ai_documents"
            referencedColumns: ["id"]
          },
        ]
      }
      ai_documents: {
        Row: {
          content: string
          created_at: string | null
          description: string | null
          doc_category: string
          eixo_id: string | null
          file_name: string | null
          file_type: string | null
          file_url: string | null
          id: string
          is_active: boolean | null
          municipio_id: string | null
          priority: number | null
          published_at: string | null
          regiao: string | null
          source_url: string | null
          temporal_status: string | null
          title: string
          updated_at: string | null
          uploaded_by: string | null
        }
        Insert: {
          content: string
          created_at?: string | null
          description?: string | null
          doc_category: string
          eixo_id?: string | null
          file_name?: string | null
          file_type?: string | null
          file_url?: string | null
          id?: string
          is_active?: boolean | null
          municipio_id?: string | null
          priority?: number | null
          published_at?: string | null
          regiao?: string | null
          source_url?: string | null
          temporal_status?: string | null
          title: string
          updated_at?: string | null
          uploaded_by?: string | null
        }
        Update: {
          content?: string
          created_at?: string | null
          description?: string | null
          doc_category?: string
          eixo_id?: string | null
          file_name?: string | null
          file_type?: string | null
          file_url?: string | null
          id?: string
          is_active?: boolean | null
          municipio_id?: string | null
          priority?: number | null
          published_at?: string | null
          regiao?: string | null
          source_url?: string | null
          temporal_status?: string | null
          title?: string
          updated_at?: string | null
          uploaded_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ai_documents_eixo_id_fkey"
            columns: ["eixo_id"]
            isOneToOne: false
            referencedRelation: "eixos_tematicos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ai_documents_municipio_id_fkey"
            columns: ["municipio_id"]
            isOneToOne: false
            referencedRelation: "municipios"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ai_documents_uploaded_by_fkey"
            columns: ["uploaded_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      ai_knowledge_base: {
        Row: {
          content: string
          created_at: string
          doc_type: string
          id: string
          is_active: boolean | null
          priority: number | null
          title: string
          updated_at: string
        }
        Insert: {
          content: string
          created_at?: string
          doc_type?: string
          id?: string
          is_active?: boolean | null
          priority?: number | null
          title: string
          updated_at?: string
        }
        Update: {
          content?: string
          created_at?: string
          doc_type?: string
          id?: string
          is_active?: boolean | null
          priority?: number | null
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      eixos_tematicos: {
        Row: {
          created_at: string
          descricao: string | null
          id: string
          lider_id: string | null
          nome: string
        }
        Insert: {
          created_at?: string
          descricao?: string | null
          id?: string
          lider_id?: string | null
          nome: string
        }
        Update: {
          created_at?: string
          descricao?: string | null
          id?: string
          lider_id?: string | null
          nome?: string
        }
        Relationships: []
      }
      inactivity_alerts: {
        Row: {
          alert_sent_at: string
          channel: string
          created_at: string
          hours_inactive: number
          id: string
          message_id: string | null
          user_id: string
        }
        Insert: {
          alert_sent_at?: string
          channel: string
          created_at?: string
          hours_inactive: number
          id?: string
          message_id?: string | null
          user_id: string
        }
        Update: {
          alert_sent_at?: string
          channel?: string
          created_at?: string
          hours_inactive?: number
          id?: string
          message_id?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "inactivity_alerts_message_id_fkey"
            columns: ["message_id"]
            isOneToOne: false
            referencedRelation: "admin_messages"
            referencedColumns: ["id"]
          },
        ]
      }
      leads: {
        Row: {
          created_at: string
          email: string | null
          id: string
          metadata: Json | null
          municipio: string | null
          nome: string | null
          origem: Database["public"]["Enums"]["lead_origem"]
          proposta_id: string | null
          sugestao_id: string | null
          whatsapp: string | null
        }
        Insert: {
          created_at?: string
          email?: string | null
          id?: string
          metadata?: Json | null
          municipio?: string | null
          nome?: string | null
          origem: Database["public"]["Enums"]["lead_origem"]
          proposta_id?: string | null
          sugestao_id?: string | null
          whatsapp?: string | null
        }
        Update: {
          created_at?: string
          email?: string | null
          id?: string
          metadata?: Json | null
          municipio?: string | null
          nome?: string | null
          origem?: Database["public"]["Enums"]["lead_origem"]
          proposta_id?: string | null
          sugestao_id?: string | null
          whatsapp?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "leads_proposta_id_fkey"
            columns: ["proposta_id"]
            isOneToOne: false
            referencedRelation: "propostas_tecnicas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "leads_sugestao_id_fkey"
            columns: ["sugestao_id"]
            isOneToOne: false
            referencedRelation: "sugestoes_populares"
            referencedColumns: ["id"]
          },
        ]
      }
      municipios: {
        Row: {
          codigo_ibge: string | null
          created_at: string
          id: string
          latitude: number | null
          longitude: number | null
          nome: string
          regiao: string | null
        }
        Insert: {
          codigo_ibge?: string | null
          created_at?: string
          id?: string
          latitude?: number | null
          longitude?: number | null
          nome: string
          regiao?: string | null
        }
        Update: {
          codigo_ibge?: string | null
          created_at?: string
          id?: string
          latitude?: number | null
          longitude?: number | null
          nome?: string
          regiao?: string | null
        }
        Relationships: []
      }
      page_analytics_events: {
        Row: {
          browser: string | null
          city: string | null
          component_action: string | null
          component_name: string | null
          country: string | null
          created_at: string
          device_type: string | null
          event_type: string
          id: string
          metadata: Json | null
          os: string | null
          page_path: string
          referrer: string | null
          region: string | null
          screen_height: number | null
          screen_width: number | null
          scroll_depth: number | null
          session_id: string
          time_on_page: number | null
          utm_campaign: string | null
          utm_content: string | null
          utm_medium: string | null
          utm_source: string | null
          visitor_id: string | null
        }
        Insert: {
          browser?: string | null
          city?: string | null
          component_action?: string | null
          component_name?: string | null
          country?: string | null
          created_at?: string
          device_type?: string | null
          event_type: string
          id?: string
          metadata?: Json | null
          os?: string | null
          page_path?: string
          referrer?: string | null
          region?: string | null
          screen_height?: number | null
          screen_width?: number | null
          scroll_depth?: number | null
          session_id: string
          time_on_page?: number | null
          utm_campaign?: string | null
          utm_content?: string | null
          utm_medium?: string | null
          utm_source?: string | null
          visitor_id?: string | null
        }
        Update: {
          browser?: string | null
          city?: string | null
          component_action?: string | null
          component_name?: string | null
          country?: string | null
          created_at?: string
          device_type?: string | null
          event_type?: string
          id?: string
          metadata?: Json | null
          os?: string | null
          page_path?: string
          referrer?: string | null
          region?: string | null
          screen_height?: number | null
          screen_width?: number | null
          scroll_depth?: number | null
          session_id?: string
          time_on_page?: number | null
          utm_campaign?: string | null
          utm_content?: string | null
          utm_medium?: string | null
          utm_source?: string | null
          visitor_id?: string | null
        }
        Relationships: []
      }
      profiles: {
        Row: {
          cargo: string | null
          celular: string | null
          created_at: string
          email: string | null
          full_name: string | null
          id: string
          updated_at: string
        }
        Insert: {
          cargo?: string | null
          celular?: string | null
          created_at?: string
          email?: string | null
          full_name?: string | null
          id: string
          updated_at?: string
        }
        Update: {
          cargo?: string | null
          celular?: string | null
          created_at?: string
          email?: string | null
          full_name?: string | null
          id?: string
          updated_at?: string
        }
        Relationships: []
      }
      proposal_alerts: {
        Row: {
          acknowledged_at: string | null
          alert_type: string
          created_at: string
          hours_stale: number
          id: string
          metadata: Json | null
          proposta_id: string
          responsavel_id: string
          sent_at: string
        }
        Insert: {
          acknowledged_at?: string | null
          alert_type?: string
          created_at?: string
          hours_stale: number
          id?: string
          metadata?: Json | null
          proposta_id: string
          responsavel_id: string
          sent_at?: string
        }
        Update: {
          acknowledged_at?: string | null
          alert_type?: string
          created_at?: string
          hours_stale?: number
          id?: string
          metadata?: Json | null
          proposta_id?: string
          responsavel_id?: string
          sent_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "proposal_alerts_proposta_id_fkey"
            columns: ["proposta_id"]
            isOneToOne: false
            referencedRelation: "propostas_tecnicas"
            referencedColumns: ["id"]
          },
        ]
      }
      propostas_tecnicas: {
        Row: {
          anexos: string[] | null
          autor_id: string
          created_at: string
          descricao: string
          eixo_id: string
          entrevistado: string | null
          etapa: number
          id: string
          indicadores: string | null
          lider_responsavel_id: string | null
          metas: string | null
          municipio_id: string | null
          questionario: Json | null
          status: Database["public"]["Enums"]["proposal_status"]
          titulo: string
          updated_at: string
        }
        Insert: {
          anexos?: string[] | null
          autor_id: string
          created_at?: string
          descricao: string
          eixo_id: string
          entrevistado?: string | null
          etapa?: number
          id?: string
          indicadores?: string | null
          lider_responsavel_id?: string | null
          metas?: string | null
          municipio_id?: string | null
          questionario?: Json | null
          status?: Database["public"]["Enums"]["proposal_status"]
          titulo: string
          updated_at?: string
        }
        Update: {
          anexos?: string[] | null
          autor_id?: string
          created_at?: string
          descricao?: string
          eixo_id?: string
          entrevistado?: string | null
          etapa?: number
          id?: string
          indicadores?: string | null
          lider_responsavel_id?: string | null
          metas?: string | null
          municipio_id?: string | null
          questionario?: Json | null
          status?: Database["public"]["Enums"]["proposal_status"]
          titulo?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "propostas_tecnicas_eixo_id_fkey"
            columns: ["eixo_id"]
            isOneToOne: false
            referencedRelation: "eixos_tematicos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "propostas_tecnicas_lider_responsavel_id_fkey"
            columns: ["lider_responsavel_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "propostas_tecnicas_municipio_id_fkey"
            columns: ["municipio_id"]
            isOneToOne: false
            referencedRelation: "municipios"
            referencedColumns: ["id"]
          },
        ]
      }
      sugestoes_populares: {
        Row: {
          created_at: string
          descricao: string
          eixo: string
          email: string | null
          id: string
          municipio: string
          nome: string | null
          publico: boolean | null
          whatsapp: string | null
        }
        Insert: {
          created_at?: string
          descricao: string
          eixo: string
          email?: string | null
          id?: string
          municipio: string
          nome?: string | null
          publico?: boolean | null
          whatsapp?: string | null
        }
        Update: {
          created_at?: string
          descricao?: string
          eixo?: string
          email?: string | null
          id?: string
          municipio?: string
          nome?: string | null
          publico?: boolean | null
          whatsapp?: string | null
        }
        Relationships: []
      }
      user_activity: {
        Row: {
          activity_type: string
          created_at: string
          id: string
          last_activity_at: string
          metadata: Json | null
          user_id: string
        }
        Insert: {
          activity_type: string
          created_at?: string
          id?: string
          last_activity_at?: string
          metadata?: Json | null
          user_id: string
        }
        Update: {
          activity_type?: string
          created_at?: string
          id?: string
          last_activity_at?: string
          metadata?: Json | null
          user_id?: string
        }
        Relationships: []
      }
      user_eixos: {
        Row: {
          created_at: string
          eixo_id: string
          id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          eixo_id: string
          id?: string
          user_id: string
        }
        Update: {
          created_at?: string
          eixo_id?: string
          id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_eixos_eixo_id_fkey"
            columns: ["eixo_id"]
            isOneToOne: false
            referencedRelation: "eixos_tematicos"
            referencedColumns: ["id"]
          },
        ]
      }
      user_municipios: {
        Row: {
          created_at: string
          id: string
          municipio_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          municipio_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          municipio_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_municipios_municipio_id_fkey"
            columns: ["municipio_id"]
            isOneToOne: false
            referencedRelation: "municipios"
            referencedColumns: ["id"]
          },
        ]
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
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      get_inactive_users: {
        Args: { hours_threshold?: number }
        Returns: {
          email: string
          full_name: string
          hours_inactive: number
          last_activity_at: string
          roles: string[]
          user_id: string
        }[]
      }
      get_stale_proposals: {
        Args: { hours_threshold?: number }
        Returns: {
          created_at: string
          eixo_id: string
          eixo_nome: string
          etapa: number
          hours_stale: number
          municipio_id: string
          municipio_nome: string
          proposta_id: string
          responsavel_email: string
          responsavel_id: string
          responsavel_nome: string
          status: string
          titulo: string
          updated_at: string
        }[]
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_admin: { Args: { _user_id: string }; Returns: boolean }
    }
    Enums: {
      app_role:
        | "admin"
        | "lider_tematico"
        | "curador_municipal"
        | "especialista"
        | "admin_master"
      lead_origem: "formulario" | "chatbot" | "proposta"
      proposal_status: "rascunho" | "validada" | "consolidada" | "aprovada"
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
      app_role: [
        "admin",
        "lider_tematico",
        "curador_municipal",
        "especialista",
        "admin_master",
      ],
      lead_origem: ["formulario", "chatbot", "proposta"],
      proposal_status: ["rascunho", "validada", "consolidada", "aprovada"],
    },
  },
} as const
