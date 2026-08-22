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
    PostgrestVersion: "14.15"
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
      ai_agent_allowed_functions: {
        Row: {
          agent_id: string
          created_at: string | null
          function_id: string
          id: string
        }
        Insert: {
          agent_id: string
          created_at?: string | null
          function_id: string
          id?: string
        }
        Update: {
          agent_id?: string
          created_at?: string | null
          function_id?: string
          id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ai_agent_allowed_functions_agent_id_fkey"
            columns: ["agent_id"]
            isOneToOne: false
            referencedRelation: "ai_agent_config"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ai_agent_allowed_functions_function_id_fkey"
            columns: ["function_id"]
            isOneToOne: false
            referencedRelation: "ai_hub_functions"
            referencedColumns: ["id"]
          },
        ]
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
      ai_agent_pesquisas: {
        Row: {
          agent_id: string
          created_at: string | null
          id: string
          pesquisa_id: string
        }
        Insert: {
          agent_id: string
          created_at?: string | null
          id?: string
          pesquisa_id: string
        }
        Update: {
          agent_id?: string
          created_at?: string | null
          id?: string
          pesquisa_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ai_agent_pesquisas_agent_id_fkey"
            columns: ["agent_id"]
            isOneToOne: false
            referencedRelation: "ai_agent_config"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ai_agent_pesquisas_pesquisa_id_fkey"
            columns: ["pesquisa_id"]
            isOneToOne: false
            referencedRelation: "pesquisas_eleitorais"
            referencedColumns: ["id"]
          },
        ]
      }
      ai_chat_conversations: {
        Row: {
          agent_id: string
          created_at: string
          id: string
          messages: Json
          presentation: Json | null
          selected_pesquisa_ids: Json | null
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          agent_id: string
          created_at?: string
          id?: string
          messages?: Json
          presentation?: Json | null
          selected_pesquisa_ids?: Json | null
          title?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          agent_id?: string
          created_at?: string
          id?: string
          messages?: Json
          presentation?: Json | null
          selected_pesquisa_ids?: Json | null
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ai_chat_conversations_agent_id_fkey"
            columns: ["agent_id"]
            isOneToOne: false
            referencedRelation: "ai_agent_config"
            referencedColumns: ["id"]
          },
        ]
      }
      ai_document_chunks: {
        Row: {
          chunk_index: number
          content: string
          created_at: string
          document_id: string
          embedding: string | null
          id: string
          metadata: Json | null
        }
        Insert: {
          chunk_index?: number
          content: string
          created_at?: string
          document_id: string
          embedding?: string | null
          id?: string
          metadata?: Json | null
        }
        Update: {
          chunk_index?: number
          content?: string
          created_at?: string
          document_id?: string
          embedding?: string | null
          id?: string
          metadata?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "ai_document_chunks_document_id_fkey"
            columns: ["document_id"]
            isOneToOne: false
            referencedRelation: "ai_documents"
            referencedColumns: ["id"]
          },
        ]
      }
      ai_document_temas: {
        Row: {
          created_at: string
          document_id: string
          id: string
          tema_id: string
        }
        Insert: {
          created_at?: string
          document_id: string
          id?: string
          tema_id: string
        }
        Update: {
          created_at?: string
          document_id?: string
          id?: string
          tema_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ai_document_temas_document_id_fkey"
            columns: ["document_id"]
            isOneToOne: false
            referencedRelation: "ai_documents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ai_document_temas_tema_id_fkey"
            columns: ["tema_id"]
            isOneToOne: false
            referencedRelation: "temas"
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
          metadata: Json | null
          municipio_id: string | null
          priority: number | null
          published_at: string | null
          regiao: string | null
          scope: string
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
          metadata?: Json | null
          municipio_id?: string | null
          priority?: number | null
          published_at?: string | null
          regiao?: string | null
          scope?: string
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
          metadata?: Json | null
          municipio_id?: string | null
          priority?: number | null
          published_at?: string | null
          regiao?: string | null
          scope?: string
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
      ai_hub_functions: {
        Row: {
          created_at: string | null
          description: string | null
          display_name: string
          id: string
          is_system: boolean | null
          name: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          display_name: string
          id?: string
          is_system?: boolean | null
          name: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          description?: string | null
          display_name?: string
          id?: string
          is_system?: boolean | null
          name?: string
          updated_at?: string | null
        }
        Relationships: []
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
      association_members: {
        Row: {
          association_id: string
          created_at: string
          id: string
          municipality_name: string
        }
        Insert: {
          association_id: string
          created_at?: string
          id?: string
          municipality_name: string
        }
        Update: {
          association_id?: string
          created_at?: string
          id?: string
          municipality_name?: string
        }
        Relationships: [
          {
            foreignKeyName: "association_members_association_id_fkey"
            columns: ["association_id"]
            isOneToOne: false
            referencedRelation: "municipality_associations"
            referencedColumns: ["id"]
          },
        ]
      }
      audit_logs: {
        Row: {
          action: string
          created_at: string
          id: string
          ip_address: string | null
          new_data: Json | null
          old_data: Json | null
          record_id: string | null
          table_name: string
          user_agent: string | null
          user_id: string | null
        }
        Insert: {
          action: string
          created_at?: string
          id?: string
          ip_address?: string | null
          new_data?: Json | null
          old_data?: Json | null
          record_id?: string | null
          table_name: string
          user_agent?: string | null
          user_id?: string | null
        }
        Update: {
          action?: string
          created_at?: string
          id?: string
          ip_address?: string | null
          new_data?: Json | null
          old_data?: Json | null
          record_id?: string | null
          table_name?: string
          user_agent?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      comms_content_generations: {
        Row: {
          conteudos: Json
          contexto: string
          created_at: string | null
          fontes_utilizadas: Json | null
          formatos_gerados: string[]
          generated_by: string | null
          id: string
          temas_mapeados: Json
          updated_at: string | null
        }
        Insert: {
          conteudos?: Json
          contexto: string
          created_at?: string | null
          fontes_utilizadas?: Json | null
          formatos_gerados?: string[]
          generated_by?: string | null
          id?: string
          temas_mapeados?: Json
          updated_at?: string | null
        }
        Update: {
          conteudos?: Json
          contexto?: string
          created_at?: string | null
          fontes_utilizadas?: Json | null
          formatos_gerados?: string[]
          generated_by?: string | null
          id?: string
          temas_mapeados?: Json
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "comms_content_generations_generated_by_fkey"
            columns: ["generated_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      cruzamento_wellington_access: {
        Row: {
          created_at: string
          email: string
          granted_by: string | null
          id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          email: string
          granted_by?: string | null
          id?: string
          user_id: string
        }
        Update: {
          created_at?: string
          email?: string
          granted_by?: string | null
          id?: string
          user_id?: string
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
          ordem: number | null
          subtitulo: string | null
        }
        Insert: {
          created_at?: string
          descricao?: string | null
          id?: string
          lider_id?: string | null
          nome: string
          ordem?: number | null
          subtitulo?: string | null
        }
        Update: {
          created_at?: string
          descricao?: string | null
          id?: string
          lider_id?: string | null
          nome?: string
          ordem?: number | null
          subtitulo?: string | null
        }
        Relationships: []
      }
      electoral_surveys: {
        Row: {
          cargos: string[]
          collection_end: string | null
          collection_start: string | null
          created_at: string
          created_by: string | null
          deleted_at: string | null
          file_name: string | null
          id: string
          institute: string
          margin_of_error: number
          methodology: string | null
          release_date: string
          sample_size: number
          territory: string
          tse_registration: string | null
          updated_at: string
        }
        Insert: {
          cargos?: string[]
          collection_end?: string | null
          collection_start?: string | null
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          file_name?: string | null
          id?: string
          institute: string
          margin_of_error: number
          methodology?: string | null
          release_date: string
          sample_size: number
          territory: string
          tse_registration?: string | null
          updated_at?: string
        }
        Update: {
          cargos?: string[]
          collection_end?: string | null
          collection_start?: string | null
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          file_name?: string | null
          id?: string
          institute?: string
          margin_of_error?: number
          methodology?: string | null
          release_date?: string
          sample_size?: number
          territory?: string
          tse_registration?: string | null
          updated_at?: string
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
          {
            foreignKeyName: "leads_sugestao_id_fkey"
            columns: ["sugestao_id"]
            isOneToOne: false
            referencedRelation: "sugestoes_publicas"
            referencedColumns: ["id"]
          },
        ]
      }
      login_attempts: {
        Row: {
          created_at: string
          id: string
          ip_hash: string
        }
        Insert: {
          created_at?: string
          id?: string
          ip_hash: string
        }
        Update: {
          created_at?: string
          id?: string
          ip_hash?: string
        }
        Relationships: []
      }
      metodologia_galeria: {
        Row: {
          ativo: boolean
          created_at: string
          created_by: string | null
          id: string
          image_path: string
          legenda: string | null
          ordem: number
        }
        Insert: {
          ativo?: boolean
          created_at?: string
          created_by?: string | null
          id?: string
          image_path: string
          legenda?: string | null
          ordem?: number
        }
        Update: {
          ativo?: boolean
          created_at?: string
          created_by?: string | null
          id?: string
          image_path?: string
          legenda?: string | null
          ordem?: number
        }
        Relationships: []
      }
      midia_clipping: {
        Row: {
          ativo: boolean
          created_at: string
          created_by: string | null
          data_publicacao: string | null
          id: string
          image_path: string
          ordem: number
          titulo: string | null
          url_materia: string | null
          veiculo: string
        }
        Insert: {
          ativo?: boolean
          created_at?: string
          created_by?: string | null
          data_publicacao?: string | null
          id?: string
          image_path: string
          ordem?: number
          titulo?: string | null
          url_materia?: string | null
          veiculo: string
        }
        Update: {
          ativo?: boolean
          created_at?: string
          created_by?: string | null
          data_publicacao?: string | null
          id?: string
          image_path?: string
          ordem?: number
          titulo?: string | null
          url_materia?: string | null
          veiculo?: string
        }
        Relationships: []
      }
      moldura_config: {
        Row: {
          feed_x: number
          feed_y: number
          feed_zoom: number
          id: string
          story_x: number
          story_y: number
          story_zoom: number
          updated_at: string
        }
        Insert: {
          feed_x?: number
          feed_y?: number
          feed_zoom?: number
          id?: string
          story_x?: number
          story_y?: number
          story_zoom?: number
          updated_at?: string
        }
        Update: {
          feed_x?: number
          feed_y?: number
          feed_zoom?: number
          id?: string
          story_x?: number
          story_y?: number
          story_zoom?: number
          updated_at?: string
        }
        Relationships: []
      }
      municipality_associations: {
        Row: {
          acronym: string
          created_at: string
          created_by: string | null
          id: string
          name: string
        }
        Insert: {
          acronym: string
          created_at?: string
          created_by?: string | null
          id?: string
          name: string
        }
        Update: {
          acronym?: string
          created_at?: string
          created_by?: string | null
          id?: string
          name?: string
        }
        Relationships: []
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
      nomes_genero: {
        Row: {
          created_at: string
          genero: string
          id: string
          nome: string
          peso: number
        }
        Insert: {
          created_at?: string
          genero: string
          id?: string
          nome: string
          peso?: number
        }
        Update: {
          created_at?: string
          genero?: string
          id?: string
          nome?: string
          peso?: number
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
      pesquisa_cruzamentos: {
        Row: {
          id: string
          opcao: string
          percentual: number | null
          resultado_id: string
          segmento_tipo: string
          segmento_valor: string
        }
        Insert: {
          id?: string
          opcao: string
          percentual?: number | null
          resultado_id: string
          segmento_tipo: string
          segmento_valor: string
        }
        Update: {
          id?: string
          opcao?: string
          percentual?: number | null
          resultado_id?: string
          segmento_tipo?: string
          segmento_valor?: string
        }
        Relationships: [
          {
            foreignKeyName: "pesquisa_cruzamentos_resultado_id_fkey"
            columns: ["resultado_id"]
            isOneToOne: false
            referencedRelation: "pesquisa_resultados"
            referencedColumns: ["id"]
          },
        ]
      }
      pesquisa_qualitativa: {
        Row: {
          created_at: string
          id: string
          insight: string | null
          pesquisa_id: string
          relevancia: number | null
          sentimento: string | null
          tema: string
          verbatim: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          insight?: string | null
          pesquisa_id: string
          relevancia?: number | null
          sentimento?: string | null
          tema: string
          verbatim?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          insight?: string | null
          pesquisa_id?: string
          relevancia?: number | null
          sentimento?: string | null
          tema?: string
          verbatim?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "pesquisa_qualitativa_pesquisa_id_fkey"
            columns: ["pesquisa_id"]
            isOneToOne: false
            referencedRelation: "pesquisas_eleitorais"
            referencedColumns: ["id"]
          },
        ]
      }
      pesquisa_respostas: {
        Row: {
          id: string
          opcao: string
          ordem: number | null
          percentual: number | null
          resultado_id: string
          votos_absolutos: number | null
        }
        Insert: {
          id?: string
          opcao: string
          ordem?: number | null
          percentual?: number | null
          resultado_id: string
          votos_absolutos?: number | null
        }
        Update: {
          id?: string
          opcao?: string
          ordem?: number | null
          percentual?: number | null
          resultado_id?: string
          votos_absolutos?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "pesquisa_respostas_resultado_id_fkey"
            columns: ["resultado_id"]
            isOneToOne: false
            referencedRelation: "pesquisa_resultados"
            referencedColumns: ["id"]
          },
        ]
      }
      pesquisa_resultados: {
        Row: {
          cenario_descricao: string | null
          created_at: string
          id: string
          ordem: number | null
          pergunta: string
          pesquisa_id: string
          tipo_pergunta: Database["public"]["Enums"]["pergunta_tipo"]
        }
        Insert: {
          cenario_descricao?: string | null
          created_at?: string
          id?: string
          ordem?: number | null
          pergunta: string
          pesquisa_id: string
          tipo_pergunta?: Database["public"]["Enums"]["pergunta_tipo"]
        }
        Update: {
          cenario_descricao?: string | null
          created_at?: string
          id?: string
          ordem?: number | null
          pergunta?: string
          pesquisa_id?: string
          tipo_pergunta?: Database["public"]["Enums"]["pergunta_tipo"]
        }
        Relationships: [
          {
            foreignKeyName: "pesquisa_resultados_pesquisa_id_fkey"
            columns: ["pesquisa_id"]
            isOneToOne: false
            referencedRelation: "pesquisas_eleitorais"
            referencedColumns: ["id"]
          },
        ]
      }
      pesquisas_eleitorais: {
        Row: {
          abrangencia: string | null
          ai_processing_state: Json | null
          amostra_total: number | null
          content: string | null
          created_at: string
          data_campo_fim: string | null
          data_campo_inicio: string | null
          data_publicacao: string | null
          file_name: string | null
          file_type: string | null
          file_url: string | null
          id: string
          instituto: string
          is_active: boolean | null
          margem_erro: number | null
          metodologia: Json | null
          municipio_id: string | null
          nivel_confianca: number | null
          regiao: string | null
          registro_tse: string | null
          status: Database["public"]["Enums"]["pesquisa_status"]
          tipo_pesquisa: Database["public"]["Enums"]["pesquisa_tipo"]
          titulo: string
          universo: string | null
          updated_at: string
          uploaded_by: string | null
        }
        Insert: {
          abrangencia?: string | null
          ai_processing_state?: Json | null
          amostra_total?: number | null
          content?: string | null
          created_at?: string
          data_campo_fim?: string | null
          data_campo_inicio?: string | null
          data_publicacao?: string | null
          file_name?: string | null
          file_type?: string | null
          file_url?: string | null
          id?: string
          instituto: string
          is_active?: boolean | null
          margem_erro?: number | null
          metodologia?: Json | null
          municipio_id?: string | null
          nivel_confianca?: number | null
          regiao?: string | null
          registro_tse?: string | null
          status?: Database["public"]["Enums"]["pesquisa_status"]
          tipo_pesquisa?: Database["public"]["Enums"]["pesquisa_tipo"]
          titulo: string
          universo?: string | null
          updated_at?: string
          uploaded_by?: string | null
        }
        Update: {
          abrangencia?: string | null
          ai_processing_state?: Json | null
          amostra_total?: number | null
          content?: string | null
          created_at?: string
          data_campo_fim?: string | null
          data_campo_inicio?: string | null
          data_publicacao?: string | null
          file_name?: string | null
          file_type?: string | null
          file_url?: string | null
          id?: string
          instituto?: string
          is_active?: boolean | null
          margem_erro?: number | null
          metodologia?: Json | null
          municipio_id?: string | null
          nivel_confianca?: number | null
          regiao?: string | null
          registro_tse?: string | null
          status?: Database["public"]["Enums"]["pesquisa_status"]
          tipo_pesquisa?: Database["public"]["Enums"]["pesquisa_tipo"]
          titulo?: string
          universo?: string | null
          updated_at?: string
          uploaded_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "pesquisas_eleitorais_municipio_id_fkey"
            columns: ["municipio_id"]
            isOneToOne: false
            referencedRelation: "municipios"
            referencedColumns: ["id"]
          },
        ]
      }
      plano_governo_conversations: {
        Row: {
          created_at: string
          filters: Json
          id: string
          messages: Json
          mode: string
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          filters?: Json
          id?: string
          messages?: Json
          mode?: string
          title?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          filters?: Json
          id?: string
          messages?: Json
          mode?: string
          title?: string
          updated_at?: string
          user_id?: string
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
      proposal_evaluations: {
        Row: {
          created_at: string | null
          evaluated_at: string | null
          evaluated_by: string | null
          fontes_cruzadas: Json | null
          id: string
          is_stale: boolean | null
          justificativa: string | null
          pontos_atencao: string[] | null
          pontos_fortes: string[] | null
          proposta_id: string
          score_total: number
          scores: Json
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          evaluated_at?: string | null
          evaluated_by?: string | null
          fontes_cruzadas?: Json | null
          id?: string
          is_stale?: boolean | null
          justificativa?: string | null
          pontos_atencao?: string[] | null
          pontos_fortes?: string[] | null
          proposta_id: string
          score_total: number
          scores?: Json
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          evaluated_at?: string | null
          evaluated_by?: string | null
          fontes_cruzadas?: Json | null
          id?: string
          is_stale?: boolean | null
          justificativa?: string | null
          pontos_atencao?: string[] | null
          pontos_fortes?: string[] | null
          proposta_id?: string
          score_total?: number
          scores?: Json
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "proposal_evaluations_evaluated_by_fkey"
            columns: ["evaluated_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "proposal_evaluations_proposta_id_fkey"
            columns: ["proposta_id"]
            isOneToOne: false
            referencedRelation: "propostas_tecnicas"
            referencedColumns: ["id"]
          },
        ]
      }
      propostas_politicas: {
        Row: {
          autor_id: string
          conteudo_completo: string
          created_at: string
          eixo_id: string | null
          id: string
          impacto_esperado: string | null
          ordem_exibicao: number
          publico_alvo: string | null
          resumo: string | null
          status: Database["public"]["Enums"]["proposal_politica_status"]
          tema_id: string | null
          titulo: string
          updated_at: string
          visivel_publico: boolean
        }
        Insert: {
          autor_id: string
          conteudo_completo: string
          created_at?: string
          eixo_id?: string | null
          id?: string
          impacto_esperado?: string | null
          ordem_exibicao?: number
          publico_alvo?: string | null
          resumo?: string | null
          status?: Database["public"]["Enums"]["proposal_politica_status"]
          tema_id?: string | null
          titulo: string
          updated_at?: string
          visivel_publico?: boolean
        }
        Update: {
          autor_id?: string
          conteudo_completo?: string
          created_at?: string
          eixo_id?: string | null
          id?: string
          impacto_esperado?: string | null
          ordem_exibicao?: number
          publico_alvo?: string | null
          resumo?: string | null
          status?: Database["public"]["Enums"]["proposal_politica_status"]
          tema_id?: string | null
          titulo?: string
          updated_at?: string
          visivel_publico?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "propostas_politicas_eixo_id_fkey"
            columns: ["eixo_id"]
            isOneToOne: false
            referencedRelation: "eixos_tematicos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "propostas_politicas_tema_id_fkey"
            columns: ["tema_id"]
            isOneToOne: false
            referencedRelation: "temas"
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
          eixo_id: string | null
          entrevistado: string | null
          etapa: number
          id: string
          indicadores: string | null
          instituicao_cnpj: string | null
          instituicao_nome: string | null
          instituicao_segmento: string | null
          lider_responsavel_id: string | null
          metas: string | null
          municipio_id: string | null
          questionario: Json | null
          representante_cargo: string | null
          representante_email: string | null
          representante_nome: string | null
          representante_telefone: string | null
          status: Database["public"]["Enums"]["proposal_status"]
          subtema_id: string | null
          tema_id: string | null
          tipo_proposta: string
          titulo: string
          updated_at: string
        }
        Insert: {
          anexos?: string[] | null
          autor_id: string
          created_at?: string
          descricao: string
          eixo_id?: string | null
          entrevistado?: string | null
          etapa?: number
          id?: string
          indicadores?: string | null
          instituicao_cnpj?: string | null
          instituicao_nome?: string | null
          instituicao_segmento?: string | null
          lider_responsavel_id?: string | null
          metas?: string | null
          municipio_id?: string | null
          questionario?: Json | null
          representante_cargo?: string | null
          representante_email?: string | null
          representante_nome?: string | null
          representante_telefone?: string | null
          status?: Database["public"]["Enums"]["proposal_status"]
          subtema_id?: string | null
          tema_id?: string | null
          tipo_proposta?: string
          titulo: string
          updated_at?: string
        }
        Update: {
          anexos?: string[] | null
          autor_id?: string
          created_at?: string
          descricao?: string
          eixo_id?: string | null
          entrevistado?: string | null
          etapa?: number
          id?: string
          indicadores?: string | null
          instituicao_cnpj?: string | null
          instituicao_nome?: string | null
          instituicao_segmento?: string | null
          lider_responsavel_id?: string | null
          metas?: string | null
          municipio_id?: string | null
          questionario?: Json | null
          representante_cargo?: string | null
          representante_email?: string | null
          representante_nome?: string | null
          representante_telefone?: string | null
          status?: Database["public"]["Enums"]["proposal_status"]
          subtema_id?: string | null
          tema_id?: string | null
          tipo_proposta?: string
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
          {
            foreignKeyName: "propostas_tecnicas_subtema_id_fkey"
            columns: ["subtema_id"]
            isOneToOne: false
            referencedRelation: "subtemas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "propostas_tecnicas_tema_id_fkey"
            columns: ["tema_id"]
            isOneToOne: false
            referencedRelation: "temas"
            referencedColumns: ["id"]
          },
        ]
      }
      resultados_eleicoes_historicos: {
        Row: {
          ano_eleicao: number
          cd_cargo: number
          created_at: string
          ds_cargo: string
          id: string
          nm_candidato: string
          nm_municipio: string
          nm_municipio_normalizado: string | null
          nm_municipio_tse: string
          nr_candidato: string
          num_turno: number
          qt_votos: number
          sg_partido: string
        }
        Insert: {
          ano_eleicao: number
          cd_cargo: number
          created_at?: string
          ds_cargo: string
          id?: string
          nm_candidato: string
          nm_municipio: string
          nm_municipio_normalizado?: string | null
          nm_municipio_tse: string
          nr_candidato: string
          num_turno: number
          qt_votos: number
          sg_partido: string
        }
        Update: {
          ano_eleicao?: number
          cd_cargo?: number
          created_at?: string
          ds_cargo?: string
          id?: string
          nm_candidato?: string
          nm_municipio?: string
          nm_municipio_normalizado?: string | null
          nm_municipio_tse?: string
          nr_candidato?: string
          num_turno?: number
          qt_votos?: number
          sg_partido?: string
        }
        Relationships: []
      }
      shared_presentations: {
        Row: {
          conversation_id: string | null
          created_at: string
          created_by: string | null
          id: string
          presentation_data: Json
          public_id: string
          title: string
          view_count: number | null
        }
        Insert: {
          conversation_id?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          presentation_data: Json
          public_id: string
          title: string
          view_count?: number | null
        }
        Update: {
          conversation_id?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          presentation_data?: Json
          public_id?: string
          title?: string
          view_count?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "shared_presentations_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "ai_chat_conversations"
            referencedColumns: ["id"]
          },
        ]
      }
      site_video_config: {
        Row: {
          chave: string
          poster_path: string | null
          updated_at: string
          updated_by: string | null
          video_url: string | null
        }
        Insert: {
          chave: string
          poster_path?: string | null
          updated_at?: string
          updated_by?: string | null
          video_url?: string | null
        }
        Update: {
          chave?: string
          poster_path?: string | null
          updated_at?: string
          updated_by?: string | null
          video_url?: string | null
        }
        Relationships: []
      }
      subtemas: {
        Row: {
          created_at: string | null
          id: string
          nome: string
          ordem: number | null
          tema_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          nome: string
          ordem?: number | null
          tema_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          nome?: string
          ordem?: number | null
          tema_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "subtemas_tema_id_fkey"
            columns: ["tema_id"]
            isOneToOne: false
            referencedRelation: "temas"
            referencedColumns: ["id"]
          },
        ]
      }
      sugestao_classificacao_semantica: {
        Row: {
          created_at: string
          eixo_detectado: string
          origem: string
          subeixo_detectado: string
          sugestao_id: string
        }
        Insert: {
          created_at?: string
          eixo_detectado: string
          origem?: string
          subeixo_detectado?: string
          sugestao_id: string
        }
        Update: {
          created_at?: string
          eixo_detectado?: string
          origem?: string
          subeixo_detectado?: string
          sugestao_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "sugestao_classificacao_semantica_sugestao_id_fkey"
            columns: ["sugestao_id"]
            isOneToOne: false
            referencedRelation: "sugestoes_populares"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sugestao_classificacao_semantica_sugestao_id_fkey"
            columns: ["sugestao_id"]
            isOneToOne: false
            referencedRelation: "sugestoes_publicas"
            referencedColumns: ["id"]
          },
        ]
      }
      sugestao_genero: {
        Row: {
          confianca: number
          created_at: string
          genero: string
          id: string
          origem: string
          primeiro_nome: string | null
          sugestao_id: string
          updated_at: string
        }
        Insert: {
          confianca?: number
          created_at?: string
          genero?: string
          id?: string
          origem?: string
          primeiro_nome?: string | null
          sugestao_id: string
          updated_at?: string
        }
        Update: {
          confianca?: number
          created_at?: string
          genero?: string
          id?: string
          origem?: string
          primeiro_nome?: string | null
          sugestao_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "sugestao_genero_sugestao_id_fkey"
            columns: ["sugestao_id"]
            isOneToOne: true
            referencedRelation: "sugestoes_populares"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sugestao_genero_sugestao_id_fkey"
            columns: ["sugestao_id"]
            isOneToOne: true
            referencedRelation: "sugestoes_publicas"
            referencedColumns: ["id"]
          },
        ]
      }
      sugestao_taxonomia: {
        Row: {
          created_at: string
          eixo_id: string
          id: string
          origem: string
          score: number
          subtema_id: string | null
          sugestao_id: string
          tema_id: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          eixo_id: string
          id?: string
          origem?: string
          score?: number
          subtema_id?: string | null
          sugestao_id: string
          tema_id?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          eixo_id?: string
          id?: string
          origem?: string
          score?: number
          subtema_id?: string | null
          sugestao_id?: string
          tema_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "sugestao_taxonomia_eixo_id_fkey"
            columns: ["eixo_id"]
            isOneToOne: false
            referencedRelation: "eixos_tematicos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sugestao_taxonomia_subtema_id_fkey"
            columns: ["subtema_id"]
            isOneToOne: false
            referencedRelation: "subtemas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sugestao_taxonomia_sugestao_id_fkey"
            columns: ["sugestao_id"]
            isOneToOne: false
            referencedRelation: "sugestoes_populares"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sugestao_taxonomia_sugestao_id_fkey"
            columns: ["sugestao_id"]
            isOneToOne: false
            referencedRelation: "sugestoes_publicas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sugestao_taxonomia_tema_id_fkey"
            columns: ["tema_id"]
            isOneToOne: false
            referencedRelation: "temas"
            referencedColumns: ["id"]
          },
        ]
      }
      sugestoes_populares: {
        Row: {
          analise_semantica: Json | null
          created_at: string
          descricao: string
          eixo: string
          email: string | null
          id: string
          municipio: string
          nome: string | null
          publico: boolean | null
          tema_id: string | null
          tema_ids: Json | null
          whatsapp: string | null
        }
        Insert: {
          analise_semantica?: Json | null
          created_at?: string
          descricao: string
          eixo: string
          email?: string | null
          id?: string
          municipio: string
          nome?: string | null
          publico?: boolean | null
          tema_id?: string | null
          tema_ids?: Json | null
          whatsapp?: string | null
        }
        Update: {
          analise_semantica?: Json | null
          created_at?: string
          descricao?: string
          eixo?: string
          email?: string | null
          id?: string
          municipio?: string
          nome?: string | null
          publico?: boolean | null
          tema_id?: string | null
          tema_ids?: Json | null
          whatsapp?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "sugestoes_populares_tema_id_fkey"
            columns: ["tema_id"]
            isOneToOne: false
            referencedRelation: "temas"
            referencedColumns: ["id"]
          },
        ]
      }
      survey_crosstabs: {
        Row: {
          basis: string
          candidate_name: string
          created_at: string
          filter_label: string
          filter_type: string
          id: string
          percentage: number
          question_id: string
          segment_label: string
          segment_order: number
        }
        Insert: {
          basis?: string
          candidate_name: string
          created_at?: string
          filter_label: string
          filter_type: string
          id?: string
          percentage: number
          question_id: string
          segment_label: string
          segment_order?: number
        }
        Update: {
          basis?: string
          candidate_name?: string
          created_at?: string
          filter_label?: string
          filter_type?: string
          id?: string
          percentage?: number
          question_id?: string
          segment_label?: string
          segment_order?: number
        }
        Relationships: [
          {
            foreignKeyName: "survey_crosstabs_question_id_fkey"
            columns: ["question_id"]
            isOneToOne: false
            referencedRelation: "survey_questions"
            referencedColumns: ["id"]
          },
        ]
      }
      survey_questions: {
        Row: {
          cargo: string
          created_at: string
          id: string
          is_main_scenario: boolean
          is_multiple_choice: boolean
          note: string | null
          question_type: string
          scenario_label: string
          sort_order: number
          survey_id: string
        }
        Insert: {
          cargo: string
          created_at?: string
          id?: string
          is_main_scenario?: boolean
          is_multiple_choice?: boolean
          note?: string | null
          question_type: string
          scenario_label: string
          sort_order?: number
          survey_id: string
        }
        Update: {
          cargo?: string
          created_at?: string
          id?: string
          is_main_scenario?: boolean
          is_multiple_choice?: boolean
          note?: string | null
          question_type?: string
          scenario_label?: string
          sort_order?: number
          survey_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "survey_questions_survey_id_fkey"
            columns: ["survey_id"]
            isOneToOne: false
            referencedRelation: "electoral_surveys"
            referencedColumns: ["id"]
          },
        ]
      }
      survey_results: {
        Row: {
          candidate_name: string
          created_at: string
          id: string
          is_excluded: boolean
          percentage: number
          question_id: string
        }
        Insert: {
          candidate_name: string
          created_at?: string
          id?: string
          is_excluded?: boolean
          percentage: number
          question_id: string
        }
        Update: {
          candidate_name?: string
          created_at?: string
          id?: string
          is_excluded?: boolean
          percentage?: number
          question_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "survey_results_question_id_fkey"
            columns: ["question_id"]
            isOneToOne: false
            referencedRelation: "survey_questions"
            referencedColumns: ["id"]
          },
        ]
      }
      taxonomia_keywords: {
        Row: {
          ativo: boolean
          created_at: string
          eixo_id: string
          id: string
          padrao: string
          peso: number
          subtema_id: string | null
          tema_id: string | null
          updated_at: string
        }
        Insert: {
          ativo?: boolean
          created_at?: string
          eixo_id: string
          id?: string
          padrao: string
          peso?: number
          subtema_id?: string | null
          tema_id?: string | null
          updated_at?: string
        }
        Update: {
          ativo?: boolean
          created_at?: string
          eixo_id?: string
          id?: string
          padrao?: string
          peso?: number
          subtema_id?: string | null
          tema_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "taxonomia_keywords_eixo_id_fkey"
            columns: ["eixo_id"]
            isOneToOne: false
            referencedRelation: "eixos_tematicos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "taxonomia_keywords_subtema_id_fkey"
            columns: ["subtema_id"]
            isOneToOne: false
            referencedRelation: "subtemas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "taxonomia_keywords_tema_id_fkey"
            columns: ["tema_id"]
            isOneToOne: false
            referencedRelation: "temas"
            referencedColumns: ["id"]
          },
        ]
      }
      temas: {
        Row: {
          codigo: string
          created_at: string | null
          eixo_id: string
          id: string
          nome: string
          ordem: number | null
        }
        Insert: {
          codigo: string
          created_at?: string | null
          eixo_id: string
          id?: string
          nome: string
          ordem?: number | null
        }
        Update: {
          codigo?: string
          created_at?: string | null
          eixo_id?: string
          id?: string
          nome?: string
          ordem?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "temas_eixo_id_fkey"
            columns: ["eixo_id"]
            isOneToOne: false
            referencedRelation: "eixos_tematicos"
            referencedColumns: ["id"]
          },
        ]
      }
      tracking: {
        Row: {
          created_at: string
          created_by: string | null
          event_type: string
          id: string
          payload: Json | null
          round_id: string | null
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          event_type: string
          id?: string
          payload?: Json | null
          round_id?: string | null
        }
        Update: {
          created_at?: string
          created_by?: string | null
          event_type?: string
          id?: string
          payload?: Json | null
          round_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "tracking_round_id_fkey"
            columns: ["round_id"]
            isOneToOne: false
            referencedRelation: "tracking_rounds"
            referencedColumns: ["id"]
          },
        ]
      }
      tracking_ai_config: {
        Row: {
          config: Json | null
          created_at: string
          id: string
          is_active: boolean
          round_id: string | null
        }
        Insert: {
          config?: Json | null
          created_at?: string
          id?: string
          is_active?: boolean
          round_id?: string | null
        }
        Update: {
          config?: Json | null
          created_at?: string
          id?: string
          is_active?: boolean
          round_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "tracking_ai_config_round_id_fkey"
            columns: ["round_id"]
            isOneToOne: false
            referencedRelation: "tracking_rounds"
            referencedColumns: ["id"]
          },
        ]
      }
      tracking_ai_knowledge: {
        Row: {
          content: string
          created_at: string
          created_by: string | null
          id: string
          round_id: string | null
        }
        Insert: {
          content: string
          created_at?: string
          created_by?: string | null
          id?: string
          round_id?: string | null
        }
        Update: {
          content?: string
          created_at?: string
          created_by?: string | null
          id?: string
          round_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "tracking_ai_knowledge_round_id_fkey"
            columns: ["round_id"]
            isOneToOne: false
            referencedRelation: "tracking_rounds"
            referencedColumns: ["id"]
          },
        ]
      }
      tracking_ai_messages: {
        Row: {
          content: string
          created_at: string
          id: string
          role: string
          round_id: string | null
          user_id: string | null
        }
        Insert: {
          content: string
          created_at?: string
          id?: string
          role: string
          round_id?: string | null
          user_id?: string | null
        }
        Update: {
          content?: string
          created_at?: string
          id?: string
          role?: string
          round_id?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "tracking_ai_messages_round_id_fkey"
            columns: ["round_id"]
            isOneToOne: false
            referencedRelation: "tracking_rounds"
            referencedColumns: ["id"]
          },
        ]
      }
      tracking_interview_answers: {
        Row: {
          answer_value: string
          candidate_name: string | null
          created_at: string
          id: string
          interview_id: string
          question_key: string
        }
        Insert: {
          answer_value: string
          candidate_name?: string | null
          created_at?: string
          id?: string
          interview_id: string
          question_key: string
        }
        Update: {
          answer_value?: string
          candidate_name?: string | null
          created_at?: string
          id?: string
          interview_id?: string
          question_key?: string
        }
        Relationships: [
          {
            foreignKeyName: "tracking_interview_answers_interview_id_fkey"
            columns: ["interview_id"]
            isOneToOne: false
            referencedRelation: "tracking_interviews"
            referencedColumns: ["id"]
          },
        ]
      }
      tracking_interviewers: {
        Row: {
          created_at: string
          created_by: string | null
          email: string | null
          full_name: string
          id: string
          is_active: boolean
          phone: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          email?: string | null
          full_name: string
          id?: string
          is_active?: boolean
          phone?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string
          created_by?: string | null
          email?: string | null
          full_name?: string
          id?: string
          is_active?: boolean
          phone?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      tracking_interviews: {
        Row: {
          created_at: string
          id: string
          interviewer_id: string | null
          lat: number | null
          lng: number | null
          macroregion_id: string | null
          microregion: string | null
          municipality: string | null
          respondent_age_range: string | null
          respondent_education: string | null
          respondent_gender: string | null
          respondent_income: string | null
          round_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          interviewer_id?: string | null
          lat?: number | null
          lng?: number | null
          macroregion_id?: string | null
          microregion?: string | null
          municipality?: string | null
          respondent_age_range?: string | null
          respondent_education?: string | null
          respondent_gender?: string | null
          respondent_income?: string | null
          round_id: string
        }
        Update: {
          created_at?: string
          id?: string
          interviewer_id?: string | null
          lat?: number | null
          lng?: number | null
          macroregion_id?: string | null
          microregion?: string | null
          municipality?: string | null
          respondent_age_range?: string | null
          respondent_education?: string | null
          respondent_gender?: string | null
          respondent_income?: string | null
          round_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "tracking_interviews_round_id_fkey"
            columns: ["round_id"]
            isOneToOne: false
            referencedRelation: "tracking_rounds"
            referencedColumns: ["id"]
          },
        ]
      }
      tracking_round_questions: {
        Row: {
          allow_other: boolean
          conditional_question_key: string | null
          conditional_value: string | null
          description: string | null
          id: string
          is_required: boolean
          label: string
          options: Json | null
          question_key: string
          question_type: string
          round_id: string
          sort_order: number
        }
        Insert: {
          allow_other?: boolean
          conditional_question_key?: string | null
          conditional_value?: string | null
          description?: string | null
          id?: string
          is_required?: boolean
          label: string
          options?: Json | null
          question_key: string
          question_type?: string
          round_id: string
          sort_order?: number
        }
        Update: {
          allow_other?: boolean
          conditional_question_key?: string | null
          conditional_value?: string | null
          description?: string | null
          id?: string
          is_required?: boolean
          label?: string
          options?: Json | null
          question_key?: string
          question_type?: string
          round_id?: string
          sort_order?: number
        }
        Relationships: [
          {
            foreignKeyName: "tracking_round_questions_round_id_fkey"
            columns: ["round_id"]
            isOneToOne: false
            referencedRelation: "tracking_rounds"
            referencedColumns: ["id"]
          },
        ]
      }
      tracking_rounds: {
        Row: {
          city: string | null
          created_at: string
          created_by: string | null
          deleted_at: string | null
          description: string | null
          end_date: string | null
          end_time: string | null
          id: string
          macroregion_id: string | null
          microregion: string | null
          municipality: string | null
          share_code: string | null
          start_date: string
          start_time: string | null
          state: string | null
          status: string
          target_interviews: number
          territory_scope: string
          title: string
          updated_at: string
        }
        Insert: {
          city?: string | null
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          description?: string | null
          end_date?: string | null
          end_time?: string | null
          id?: string
          macroregion_id?: string | null
          microregion?: string | null
          municipality?: string | null
          share_code?: string | null
          start_date: string
          start_time?: string | null
          state?: string | null
          status?: string
          target_interviews?: number
          territory_scope?: string
          title: string
          updated_at?: string
        }
        Update: {
          city?: string | null
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          description?: string | null
          end_date?: string | null
          end_time?: string | null
          id?: string
          macroregion_id?: string | null
          microregion?: string | null
          municipality?: string | null
          share_code?: string | null
          start_date?: string
          start_time?: string | null
          state?: string | null
          status?: string
          target_interviews?: number
          territory_scope?: string
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      tse_candidatos: {
        Row: {
          cargo_id: string | null
          created_at: string
          eleicao_id: string
          foto_url: string | null
          id: string
          municipio_id: string | null
          nome_completo: string | null
          nome_urna: string
          numero_urna: number
          partido_id: string | null
          sequencial_tse: string | null
          situacao: string | null
          uf: string
        }
        Insert: {
          cargo_id?: string | null
          created_at?: string
          eleicao_id: string
          foto_url?: string | null
          id?: string
          municipio_id?: string | null
          nome_completo?: string | null
          nome_urna: string
          numero_urna: number
          partido_id?: string | null
          sequencial_tse?: string | null
          situacao?: string | null
          uf: string
        }
        Update: {
          cargo_id?: string | null
          created_at?: string
          eleicao_id?: string
          foto_url?: string | null
          id?: string
          municipio_id?: string | null
          nome_completo?: string | null
          nome_urna?: string
          numero_urna?: number
          partido_id?: string | null
          sequencial_tse?: string | null
          situacao?: string | null
          uf?: string
        }
        Relationships: [
          {
            foreignKeyName: "tse_candidatos_cargo_id_fkey"
            columns: ["cargo_id"]
            isOneToOne: false
            referencedRelation: "tse_cargos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tse_candidatos_eleicao_id_fkey"
            columns: ["eleicao_id"]
            isOneToOne: false
            referencedRelation: "tse_eleicoes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tse_candidatos_municipio_id_fkey"
            columns: ["municipio_id"]
            isOneToOne: false
            referencedRelation: "municipios"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tse_candidatos_partido_id_fkey"
            columns: ["partido_id"]
            isOneToOne: false
            referencedRelation: "tse_partidos"
            referencedColumns: ["id"]
          },
        ]
      }
      tse_cargos: {
        Row: {
          abrangencia: string
          codigo_tse: number
          created_at: string
          id: string
          nome: string
        }
        Insert: {
          abrangencia: string
          codigo_tse: number
          created_at?: string
          id?: string
          nome: string
        }
        Update: {
          abrangencia?: string
          codigo_tse?: number
          created_at?: string
          id?: string
          nome?: string
        }
        Relationships: []
      }
      tse_eleicoes: {
        Row: {
          ano: number
          created_at: string
          data_eleicao: string | null
          descricao: string | null
          id: string
          tipo: string
          turno: number
        }
        Insert: {
          ano: number
          created_at?: string
          data_eleicao?: string | null
          descricao?: string | null
          id?: string
          tipo: string
          turno?: number
        }
        Update: {
          ano?: number
          created_at?: string
          data_eleicao?: string | null
          descricao?: string | null
          id?: string
          tipo?: string
          turno?: number
        }
        Relationships: []
      }
      tse_importacoes: {
        Row: {
          ano: number
          batch_size: number | null
          created_at: string
          current_batch: number | null
          current_byte_offset: number | null
          erro_mensagem: string | null
          file_path: string | null
          id: string
          iniciado_por: string | null
          registros_importados: number | null
          status: string
          tipo_arquivo: string
          total_file_size: number | null
          total_registros: number | null
          uf: string
          updated_at: string
        }
        Insert: {
          ano: number
          batch_size?: number | null
          created_at?: string
          current_batch?: number | null
          current_byte_offset?: number | null
          erro_mensagem?: string | null
          file_path?: string | null
          id?: string
          iniciado_por?: string | null
          registros_importados?: number | null
          status?: string
          tipo_arquivo: string
          total_file_size?: number | null
          total_registros?: number | null
          uf: string
          updated_at?: string
        }
        Update: {
          ano?: number
          batch_size?: number | null
          created_at?: string
          current_batch?: number | null
          current_byte_offset?: number | null
          erro_mensagem?: string | null
          file_path?: string | null
          id?: string
          iniciado_por?: string | null
          registros_importados?: number | null
          status?: string
          tipo_arquivo?: string
          total_file_size?: number | null
          total_registros?: number | null
          uf?: string
          updated_at?: string
        }
        Relationships: []
      }
      tse_locais_votacao: {
        Row: {
          codigo_local_tse: number | null
          codigo_municipio_tse: number | null
          created_at: string
          endereco: string | null
          id: string
          latitude: number | null
          local_nome: string | null
          longitude: number | null
          municipio_id: string | null
          nome_municipio: string | null
          secao: number | null
          uf: string
          zona: number
        }
        Insert: {
          codigo_local_tse?: number | null
          codigo_municipio_tse?: number | null
          created_at?: string
          endereco?: string | null
          id?: string
          latitude?: number | null
          local_nome?: string | null
          longitude?: number | null
          municipio_id?: string | null
          nome_municipio?: string | null
          secao?: number | null
          uf: string
          zona: number
        }
        Update: {
          codigo_local_tse?: number | null
          codigo_municipio_tse?: number | null
          created_at?: string
          endereco?: string | null
          id?: string
          latitude?: number | null
          local_nome?: string | null
          longitude?: number | null
          municipio_id?: string | null
          nome_municipio?: string | null
          secao?: number | null
          uf?: string
          zona?: number
        }
        Relationships: [
          {
            foreignKeyName: "tse_locais_votacao_municipio_id_fkey"
            columns: ["municipio_id"]
            isOneToOne: false
            referencedRelation: "municipios"
            referencedColumns: ["id"]
          },
        ]
      }
      tse_partidos: {
        Row: {
          cor_hex: string | null
          created_at: string
          id: string
          nome: string | null
          numero: number
          sigla: string
        }
        Insert: {
          cor_hex?: string | null
          created_at?: string
          id?: string
          nome?: string | null
          numero: number
          sigla: string
        }
        Update: {
          cor_hex?: string | null
          created_at?: string
          id?: string
          nome?: string | null
          numero?: number
          sigla?: string
        }
        Relationships: []
      }
      tse_resultados_totalizacao: {
        Row: {
          candidato_id: string | null
          cargo_id: string | null
          codigo_municipio_tse: number | null
          created_at: string
          eleicao_id: string
          id: string
          nome_candidato: string | null
          nome_municipio: string | null
          nome_urna: string | null
          numero_candidato: number
          partido_id: string | null
          qt_abstencoes: number | null
          qt_aptos: number | null
          qt_comparecimento: number | null
          qt_votos: number
          sigla_partido: string | null
          situacao_totalizacao: string | null
          turno: number
          uf: string
          zona: number | null
        }
        Insert: {
          candidato_id?: string | null
          cargo_id?: string | null
          codigo_municipio_tse?: number | null
          created_at?: string
          eleicao_id: string
          id?: string
          nome_candidato?: string | null
          nome_municipio?: string | null
          nome_urna?: string | null
          numero_candidato: number
          partido_id?: string | null
          qt_abstencoes?: number | null
          qt_aptos?: number | null
          qt_comparecimento?: number | null
          qt_votos?: number
          sigla_partido?: string | null
          situacao_totalizacao?: string | null
          turno?: number
          uf: string
          zona?: number | null
        }
        Update: {
          candidato_id?: string | null
          cargo_id?: string | null
          codigo_municipio_tse?: number | null
          created_at?: string
          eleicao_id?: string
          id?: string
          nome_candidato?: string | null
          nome_municipio?: string | null
          nome_urna?: string | null
          numero_candidato?: number
          partido_id?: string | null
          qt_abstencoes?: number | null
          qt_aptos?: number | null
          qt_comparecimento?: number | null
          qt_votos?: number
          sigla_partido?: string | null
          situacao_totalizacao?: string | null
          turno?: number
          uf?: string
          zona?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "tse_resultados_totalizacao_candidato_id_fkey"
            columns: ["candidato_id"]
            isOneToOne: false
            referencedRelation: "tse_candidatos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tse_resultados_totalizacao_cargo_id_fkey"
            columns: ["cargo_id"]
            isOneToOne: false
            referencedRelation: "tse_cargos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tse_resultados_totalizacao_eleicao_id_fkey"
            columns: ["eleicao_id"]
            isOneToOne: false
            referencedRelation: "tse_eleicoes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tse_resultados_totalizacao_partido_id_fkey"
            columns: ["partido_id"]
            isOneToOne: false
            referencedRelation: "tse_partidos"
            referencedColumns: ["id"]
          },
        ]
      }
      tse_votos: {
        Row: {
          candidato_id: string
          codigo_municipio_tse: number | null
          created_at: string
          eleicao_id: string
          id: string
          local_id: string | null
          quantidade: number
          secao: number | null
          uf: string
          zona: number | null
        }
        Insert: {
          candidato_id: string
          codigo_municipio_tse?: number | null
          created_at?: string
          eleicao_id: string
          id?: string
          local_id?: string | null
          quantidade?: number
          secao?: number | null
          uf: string
          zona?: number | null
        }
        Update: {
          candidato_id?: string
          codigo_municipio_tse?: number | null
          created_at?: string
          eleicao_id?: string
          id?: string
          local_id?: string | null
          quantidade?: number
          secao?: number | null
          uf?: string
          zona?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "tse_votos_candidato_id_fkey"
            columns: ["candidato_id"]
            isOneToOne: false
            referencedRelation: "tse_candidatos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tse_votos_eleicao_id_fkey"
            columns: ["eleicao_id"]
            isOneToOne: false
            referencedRelation: "tse_eleicoes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tse_votos_local_id_fkey"
            columns: ["local_id"]
            isOneToOne: false
            referencedRelation: "tse_locais_votacao"
            referencedColumns: ["id"]
          },
        ]
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
      user_ai_hub_functions: {
        Row: {
          created_at: string | null
          function_id: string
          id: string
          user_id: string
        }
        Insert: {
          created_at?: string | null
          function_id: string
          id?: string
          user_id: string
        }
        Update: {
          created_at?: string | null
          function_id?: string
          id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_ai_hub_functions_function_id_fkey"
            columns: ["function_id"]
            isOneToOne: false
            referencedRelation: "ai_hub_functions"
            referencedColumns: ["id"]
          },
        ]
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
      sugestoes_publicas: {
        Row: {
          created_at: string | null
          descricao: string | null
          eixo: string | null
          id: string | null
          municipio: string | null
          publico: boolean | null
        }
        Insert: {
          created_at?: string | null
          descricao?: string | null
          eixo?: string | null
          id?: string | null
          municipio?: string | null
          publico?: boolean | null
        }
        Update: {
          created_at?: string | null
          descricao?: string | null
          eixo?: string | null
          id?: string | null
          municipio?: string | null
          publico?: boolean | null
        }
        Relationships: []
      }
    }
    Functions: {
      check_login_rate_limit: {
        Args: {
          p_ip_hash: string
          p_max_attempts?: number
          p_window_minutes?: number
        }
        Returns: boolean
      }
      classificar_genero_nome: {
        Args: { p_nome: string }
        Returns: {
          confianca: number
          genero: string
          primeiro_nome: string
        }[]
      }
      classificar_genero_sugestao: {
        Args: { p_sugestao_id: string }
        Returns: string
      }
      classificar_sugestao: {
        Args: { p_texto: string }
        Returns: {
          eixo: string
          subeixo: string
        }[]
      }
      classificar_sugestao_taxonomia: {
        Args: { p_sugestao_id: string }
        Returns: number
      }
      classificar_texto_taxonomia: {
        Args: { p_texto: string }
        Returns: {
          eixo_id: string
          score: number
          subtema_id: string
          tema_id: string
        }[]
      }
      definir_genero_manual: {
        Args: { p_genero: string; p_sugestao_id: string }
        Returns: undefined
      }
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
      get_moldura_avatares_count: { Args: never; Returns: number }
      get_shared_presentation_public: {
        Args: { _public_id: string }
        Returns: {
          created_at: string
          id: string
          presentation_data: Json
          public_id: string
          title: string
          view_count: number
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
      get_sugestoes_formulario_count: { Args: never; Returns: number }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      hist_candidatos: {
        Args: { p_ano: number; p_cargo: number; p_turno: number }
        Returns: {
          nm_candidato: string
          nr_candidato: string
          pct: number
          sg_partido: string
          votos: number
        }[]
      }
      hist_combos: {
        Args: never
        Returns: {
          ano: number
          cargo: number
          label: string
          turno: number
        }[]
      }
      hist_municipios: {
        Args: {
          p_ano: number
          p_candidato: string
          p_cargo: number
          p_turno: number
        }
        Returns: {
          cd_municipio_ibge: string
          lat: number
          lng: number
          nm_municipio: string
          pct: number
          votos: number
        }[]
      }
      increment_presentation_view: {
        Args: { p_public_id: string }
        Returns: undefined
      }
      increment_shared_presentation_view: {
        Args: { _public_id: string }
        Returns: undefined
      }
      is_admin: { Args: { _user_id: string }; Returns: boolean }
      match_document_chunks: {
        Args: {
          filter_doc_ids?: string[]
          match_count?: number
          match_threshold?: number
          query_embedding: string
        }
        Returns: {
          chunk_index: number
          content: string
          document_id: string
          id: string
          similarity: number
        }[]
      }
      painel_cruzamento_cidade_eixo: {
        Args: { p_limit?: number }
        Returns: {
          eixo: string
          municipio: string
          total: number
        }[]
      }
      painel_cruzamento_lista_sugestoes: {
        Args: {
          p_eixo?: string
          p_genero?: string
          p_limit?: number
          p_municipio?: string
          p_offset?: number
          p_regiao?: string
        }
        Returns: {
          created_at: string
          descricao: string
          eixo: string
          genero: string
          id: string
          latitude: number
          longitude: number
          mesorregiao: string
          municipio: string
          nome: string
        }[]
      }
      painel_cruzamento_nuvem_palavras: {
        Args: { p_limit?: number }
        Returns: {
          freq: number
          nivel: string
          palavra: string
        }[]
      }
      painel_cruzamento_por_eixo: {
        Args: never
        Returns: {
          eixo: string
          total: number
        }[]
      }
      painel_cruzamento_por_regiao: {
        Args: never
        Returns: {
          mesorregiao: string
          total: number
        }[]
      }
      painel_cruzamento_ranking_cidades: {
        Args: never
        Returns: {
          mesorregiao: string
          municipio: string
          total: number
        }[]
      }
      painel_cruzamento_reclassificacao: {
        Args: never
        Returns: {
          geral_com_tema: number
          geral_sem_tema: number
          geral_total: number
          multi_tema: number
        }[]
      }
      painel_cruzamento_regiao_eixo: {
        Args: never
        Returns: {
          eixo: string
          mesorregiao: string
          total: number
        }[]
      }
      painel_cruzamento_resumo: {
        Args: never
        Returns: {
          total_eixos: number
          total_municipios: number
          total_nao_identificados: number
          total_regioes: number
          total_sugestoes: number
        }[]
      }
      painel_cruzamento_semantico_regiao: {
        Args: never
        Returns: {
          eixo_detectado: string
          mesorregiao: string
          subeixo_detectado: string
          total: number
        }[]
      }
      painel_genero_indefinidos: {
        Args: { p_limite?: number; p_offset?: number }
        Returns: {
          created_at: string
          municipio: string
          nome: string
          sugestao_id: string
          trecho: string
        }[]
      }
      painel_genero_por_regiao: {
        Args: never
        Returns: {
          feminino: number
          indefinido: number
          masculino: number
          mesorregiao: string
        }[]
      }
      painel_genero_resumo: {
        Args: never
        Returns: {
          feminino: number
          indefinido: number
          masculino: number
          sem_registro: number
          total: number
        }[]
      }
      painel_taxonomia_cobertura: {
        Args: never
        Returns: {
          classificadas: number
          com_subtema: number
          com_tema: number
          total_sugestoes: number
        }[]
      }
      painel_taxonomia_resumo: {
        Args: never
        Returns: {
          eixo: string
          subtema: string
          tema: string
          total: number
        }[]
      }
      pode_ver_painel_cruzamento: { Args: never; Returns: boolean }
      reclassificar_genero_sugestoes: {
        Args: { p_limite?: number; p_somente_pendentes?: boolean }
        Returns: {
          definidas: number
          processadas: number
        }[]
      }
      reclassificar_sugestoes_taxonomia: {
        Args: { p_limite?: number; p_somente_pendentes?: boolean }
        Returns: {
          processadas: number
          vinculos: number
        }[]
      }
      unaccent: { Args: { "": string }; Returns: string }
    }
    Enums: {
      app_role:
        | "admin"
        | "lider_tematico"
        | "curador_municipal"
        | "especialista"
        | "admin_master"
        | "marketing"
      lead_origem: "formulario" | "chatbot" | "proposta"
      pergunta_tipo:
        | "intencao_espontanea"
        | "intencao_estimulada"
        | "rejeicao"
        | "avaliacao_governo"
        | "cenario"
        | "outro"
      pesquisa_status: "rascunho" | "processando" | "ativa" | "arquivada"
      pesquisa_tipo: "quantitativa" | "qualitativa" | "mista"
      proposal_politica_status:
        | "rascunho"
        | "revisao"
        | "aprovada"
        | "publicada"
        | "arquivada"
      proposal_status:
        | "rascunho"
        | "validada"
        | "consolidada"
        | "aprovada"
        | "em_analise"
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
        "marketing",
      ],
      lead_origem: ["formulario", "chatbot", "proposta"],
      pergunta_tipo: [
        "intencao_espontanea",
        "intencao_estimulada",
        "rejeicao",
        "avaliacao_governo",
        "cenario",
        "outro",
      ],
      pesquisa_status: ["rascunho", "processando", "ativa", "arquivada"],
      pesquisa_tipo: ["quantitativa", "qualitativa", "mista"],
      proposal_politica_status: [
        "rascunho",
        "revisao",
        "aprovada",
        "publicada",
        "arquivada",
      ],
      proposal_status: [
        "rascunho",
        "validada",
        "consolidada",
        "aprovada",
        "em_analise",
      ],
    },
  },
} as const
