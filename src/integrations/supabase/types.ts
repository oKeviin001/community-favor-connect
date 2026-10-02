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
      system_maintenance_log: {
        Row: {
          id: string
          created_at: string
          responsible_user_id: string | null
          action_description: string
          prompt_reference: string | null
          objective: string | null
          affected_files: string[]
          result: string
          tests: string | null
          errors_notes: string | null
          related_commit: string | null
        }
        Insert: {
          id?: string
          created_at?: string
          responsible_user_id?: string | null
          action_description: string
          prompt_reference?: string | null
          objective?: string | null
          affected_files?: string[]
          result?: string
          tests?: string | null
          errors_notes?: string | null
          related_commit?: string | null
        }
        Update: {
          id?: string
          created_at?: string
          responsible_user_id?: string | null
          action_description?: string
          prompt_reference?: string | null
          objective?: string | null
          affected_files?: string[]
          result?: string
          tests?: string | null
          errors_notes?: string | null
          related_commit?: string | null
        }
        Relationships: []
      }
      account_deletion_requests: {
        Row: {
          atendido_em: string | null
          criado_em: string
          id: string
          motivo: string | null
          status: string
          user_id: string
        }
        Insert: {
          atendido_em?: string | null
          criado_em?: string
          id?: string
          motivo?: string | null
          status?: string
          user_id: string
        }
        Update: {
          atendido_em?: string | null
          criado_em?: string
          id?: string
          motivo?: string | null
          status?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "account_deletion_requests_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      admin_audit_log: {
        Row: {
          acao: string
          alvo_id: string | null
          alvo_tipo: string | null
          autor_id: string | null
          autor_nome: string | null
          criado_em: string
          detalhes: Json
          id: string
        }
        Insert: {
          acao: string
          alvo_id?: string | null
          alvo_tipo?: string | null
          autor_id?: string | null
          autor_nome?: string | null
          criado_em?: string
          detalhes?: Json
          id?: string
        }
        Update: {
          acao?: string
          alvo_id?: string | null
          alvo_tipo?: string | null
          autor_id?: string | null
          autor_nome?: string | null
          criado_em?: string
          detalhes?: Json
          id?: string
        }
        Relationships: []
      }
      announcements: {
        Row: {
          ativo: boolean
          atualizado_em: string
          criado_em: string
          criado_por: string | null
          id: string
          mensagem: string
          publico: string
          titulo: string
        }
        Insert: {
          ativo?: boolean
          atualizado_em?: string
          criado_em?: string
          criado_por?: string | null
          id?: string
          mensagem: string
          publico?: string
          titulo: string
        }
        Update: {
          ativo?: boolean
          atualizado_em?: string
          criado_em?: string
          criado_por?: string | null
          id?: string
          mensagem?: string
          publico?: string
          titulo?: string
        }
        Relationships: []
      }
      app_settings: {
        Row: {
          atualizado_em: string
          chave: string
          criado_em: string
          valor: Json
        }
        Insert: {
          atualizado_em?: string
          chave: string
          criado_em?: string
          valor?: Json
        }
        Update: {
          atualizado_em?: string
          chave?: string
          criado_em?: string
          valor?: Json
        }
        Relationships: []
      }
      content_blocks: {
        Row: {
          atualizado_em: string
          atualizado_por: string | null
          chave: string
          corpo: string
          criado_em: string
          titulo: string
        }
        Insert: {
          atualizado_em?: string
          atualizado_por?: string | null
          chave: string
          corpo?: string
          criado_em?: string
          titulo: string
        }
        Update: {
          atualizado_em?: string
          atualizado_por?: string | null
          chave?: string
          corpo?: string
          criado_em?: string
          titulo?: string
        }
        Relationships: []
      }
      courier_application_events: {
        Row: {
          application_id: string
          autor_id: string | null
          criado_em: string
          id: string
          nota: string | null
          status: string
        }
        Insert: {
          application_id: string
          autor_id?: string | null
          criado_em?: string
          id?: string
          nota?: string | null
          status: string
        }
        Update: {
          application_id?: string
          autor_id?: string | null
          criado_em?: string
          id?: string
          nota?: string | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "courier_application_events_application_id_fkey"
            columns: ["application_id"]
            isOneToOne: false
            referencedRelation: "courier_applications"
            referencedColumns: ["id"]
          },
        ]
      }
      courier_applications: {
        Row: {
          analisado_em: string | null
          analisado_por: string | null
          analise_observacao: string | null
          atualizado_em: string
          bairro: string | null
          cep: string | null
          cidade: string | null
          complemento: string | null
          comprovante_residencia_url: string | null
          cpf: string
          criado_em: string
          data_nascimento: string | null
          dias_semana: string[]
          doc_frente_url: string | null
          doc_selfie_url: string | null
          email: string | null
          endereco: string | null
          estado: string | null
          horarios: string[]
          id: string
          info_adicional: string | null
          ja_trabalhou_entregas: boolean | null
          motivo: string | null
          nome_completo: string
          numero: string | null
          observacoes: string | null
          possui_bag: boolean | null
          possui_documento: boolean | null
          possui_smartphone: boolean | null
          regiao_atuacao: string | null
          status: string
          telefone: string
          transporte: string
          user_id: string
        }
        Insert: {
          analisado_em?: string | null
          analisado_por?: string | null
          analise_observacao?: string | null
          atualizado_em?: string
          bairro?: string | null
          cep?: string | null
          cidade?: string | null
          complemento?: string | null
          comprovante_residencia_url?: string | null
          cpf: string
          criado_em?: string
          data_nascimento?: string | null
          dias_semana?: string[]
          doc_frente_url?: string | null
          doc_selfie_url?: string | null
          email?: string | null
          endereco?: string | null
          estado?: string | null
          horarios?: string[]
          id?: string
          info_adicional?: string | null
          ja_trabalhou_entregas?: boolean | null
          motivo?: string | null
          nome_completo: string
          numero?: string | null
          observacoes?: string | null
          possui_bag?: boolean | null
          possui_documento?: boolean | null
          possui_smartphone?: boolean | null
          regiao_atuacao?: string | null
          status?: string
          telefone: string
          transporte?: string
          user_id: string
        }
        Update: {
          analisado_em?: string | null
          analisado_por?: string | null
          analise_observacao?: string | null
          atualizado_em?: string
          bairro?: string | null
          cep?: string | null
          cidade?: string | null
          complemento?: string | null
          comprovante_residencia_url?: string | null
          cpf?: string
          criado_em?: string
          data_nascimento?: string | null
          dias_semana?: string[]
          doc_frente_url?: string | null
          doc_selfie_url?: string | null
          email?: string | null
          endereco?: string | null
          estado?: string | null
          horarios?: string[]
          id?: string
          info_adicional?: string | null
          ja_trabalhou_entregas?: boolean | null
          motivo?: string | null
          nome_completo?: string
          numero?: string | null
          observacoes?: string | null
          possui_bag?: boolean | null
          possui_documento?: boolean | null
          possui_smartphone?: boolean | null
          regiao_atuacao?: string | null
          status?: string
          telefone?: string
          transporte?: string
          user_id?: string
        }
        Relationships: []
      }
      disputes: {
        Row: {
          aberto_por: string
          atualizado_em: string
          criado_em: string
          descricao: string | null
          id: string
          motivo: string
          order_id: string
          resposta_admin: string | null
          status: string
        }
        Insert: {
          aberto_por: string
          atualizado_em?: string
          criado_em?: string
          descricao?: string | null
          id?: string
          motivo: string
          order_id: string
          resposta_admin?: string | null
          status?: string
        }
        Update: {
          aberto_por?: string
          atualizado_em?: string
          criado_em?: string
          descricao?: string | null
          id?: string
          motivo?: string
          order_id?: string
          resposta_admin?: string | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "disputes_aberto_por_fkey"
            columns: ["aberto_por"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "disputes_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      kevin_app_identity: {
        Row: {
          app_nome: string
          app_slug: string
          app_uuid: string
          base_url: string | null
          criado_em: string
          id: string
          versao: string
        }
        Insert: {
          app_nome: string
          app_slug: string
          app_uuid?: string
          base_url?: string | null
          criado_em?: string
          id?: string
          versao?: string
        }
        Update: {
          app_nome?: string
          app_slug?: string
          app_uuid?: string
          base_url?: string | null
          criado_em?: string
          id?: string
          versao?: string
        }
        Relationships: []
      }
      kevin_backups: {
        Row: {
          conteudo: Json
          criado_em: string
          id: string
          itens: Json
          origem: string
          registros: number
          status: string
          tamanho_bytes: number
        }
        Insert: {
          conteudo: Json
          criado_em?: string
          id?: string
          itens?: Json
          origem: string
          registros?: number
          status?: string
          tamanho_bytes?: number
        }
        Update: {
          conteudo?: Json
          criado_em?: string
          id?: string
          itens?: Json
          origem?: string
          registros?: number
          status?: string
          tamanho_bytes?: number
        }
        Relationships: []
      }
      kevin_connections: {
        Row: {
          conectado_em: string
          direcao: string
          estrutura: Json | null
          id: string
          manifesto: Json | null
          permissoes: Json
          remote_base_url: string | null
          remote_nome: string
          remote_slug: string | null
          remote_uuid: string
          remote_versao: string | null
          status: string
          token_entrada: string | null
          token_saida: string | null
          ultima_sync: string | null
          ultimo_erro: string | null
        }
        Insert: {
          conectado_em?: string
          direcao?: string
          estrutura?: Json | null
          id?: string
          manifesto?: Json | null
          permissoes?: Json
          remote_base_url?: string | null
          remote_nome: string
          remote_slug?: string | null
          remote_uuid: string
          remote_versao?: string | null
          status?: string
          token_entrada?: string | null
          token_saida?: string | null
          ultima_sync?: string | null
          ultimo_erro?: string | null
        }
        Update: {
          conectado_em?: string
          direcao?: string
          estrutura?: Json | null
          id?: string
          manifesto?: Json | null
          permissoes?: Json
          remote_base_url?: string | null
          remote_nome?: string
          remote_slug?: string | null
          remote_uuid?: string
          remote_versao?: string | null
          status?: string
          token_entrada?: string | null
          token_saida?: string | null
          ultima_sync?: string | null
          ultimo_erro?: string | null
        }
        Relationships: []
      }
      kevin_inbox: {
        Row: {
          conexao_id: string | null
          id: string
          origem: string
          payload: Json
          recebido_em: string
          remote_id: string
          tipo: string
        }
        Insert: {
          conexao_id?: string | null
          id?: string
          origem: string
          payload: Json
          recebido_em?: string
          remote_id: string
          tipo: string
        }
        Update: {
          conexao_id?: string | null
          id?: string
          origem?: string
          payload?: Json
          recebido_em?: string
          remote_id?: string
          tipo?: string
        }
        Relationships: [
          {
            foreignKeyName: "kevin_inbox_conexao_id_fkey"
            columns: ["conexao_id"]
            isOneToOne: false
            referencedRelation: "kevin_connections"
            referencedColumns: ["id"]
          },
        ]
      }
      kevin_pairing_codes: {
        Row: {
          codigo: string
          criado_em: string
          criado_por: string | null
          expira_em: string
          id: string
          permissoes: Json
          status: string
          token_emitido: string | null
          usado_em: string | null
          usado_por_nome: string | null
          usado_por_uuid: string | null
        }
        Insert: {
          codigo: string
          criado_em?: string
          criado_por?: string | null
          expira_em: string
          id?: string
          permissoes?: Json
          status?: string
          token_emitido?: string | null
          usado_em?: string | null
          usado_por_nome?: string | null
          usado_por_uuid?: string | null
        }
        Update: {
          codigo?: string
          criado_em?: string
          criado_por?: string | null
          expira_em?: string
          id?: string
          permissoes?: Json
          status?: string
          token_emitido?: string | null
          usado_em?: string | null
          usado_por_nome?: string | null
          usado_por_uuid?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "kevin_pairing_codes_criado_por_fkey"
            columns: ["criado_por"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      kevin_sync_queue: {
        Row: {
          criado_em: string
          evento: string
          id: number
          processado_em: string | null
          registro_id: string
          tipo: string
        }
        Insert: {
          criado_em?: string
          evento: string
          id?: number
          processado_em?: string | null
          registro_id: string
          tipo: string
        }
        Update: {
          criado_em?: string
          evento?: string
          id?: number
          processado_em?: string | null
          registro_id?: string
          tipo?: string
        }
        Relationships: []
      }
      kevin_transfer_log: {
        Row: {
          conexao_id: string | null
          criado_em: string
          destino: string
          detalhes: Json | null
          direcao: string
          erro: string | null
          id: string
          operacao: string
          origem: string
          registros: number
          status: string
          tipos: Json
        }
        Insert: {
          conexao_id?: string | null
          criado_em?: string
          destino: string
          detalhes?: Json | null
          direcao: string
          erro?: string | null
          id?: string
          operacao: string
          origem: string
          registros?: number
          status?: string
          tipos?: Json
        }
        Update: {
          conexao_id?: string | null
          criado_em?: string
          destino?: string
          detalhes?: Json | null
          direcao?: string
          erro?: string | null
          id?: string
          operacao?: string
          origem?: string
          registros?: number
          status?: string
          tipos?: Json
        }
        Relationships: [
          {
            foreignKeyName: "kevin_transfer_log_conexao_id_fkey"
            columns: ["conexao_id"]
            isOneToOne: false
            referencedRelation: "kevin_connections"
            referencedColumns: ["id"]
          },
        ]
      }
      messages: {
        Row: {
          criado_em: string
          id: string
          order_id: string
          sender_id: string
          texto: string
        }
        Insert: {
          criado_em?: string
          id?: string
          order_id: string
          sender_id: string
          texto: string
        }
        Update: {
          criado_em?: string
          id?: string
          order_id?: string
          sender_id?: string
          texto?: string
        }
        Relationships: [
          {
            foreignKeyName: "messages_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "messages_sender_id_fkey"
            columns: ["sender_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      order_attachments: {
        Row: {
          criado_em: string
          descricao: string | null
          id: string
          order_id: string
          path: string
          tipo: string
          uploader_id: string
        }
        Insert: {
          criado_em?: string
          descricao?: string | null
          id?: string
          order_id: string
          path: string
          tipo?: string
          uploader_id: string
        }
        Update: {
          criado_em?: string
          descricao?: string | null
          id?: string
          order_id?: string
          path?: string
          tipo?: string
          uploader_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "order_attachments_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_attachments_uploader_id_fkey"
            columns: ["uploader_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      order_events: {
        Row: {
          autor_id: string | null
          criado_em: string
          id: string
          nota: string | null
          order_id: string
          status: Database["public"]["Enums"]["order_status"]
        }
        Insert: {
          autor_id?: string | null
          criado_em?: string
          id?: string
          nota?: string | null
          order_id: string
          status: Database["public"]["Enums"]["order_status"]
        }
        Update: {
          autor_id?: string | null
          criado_em?: string
          id?: string
          nota?: string | null
          order_id?: string
          status?: Database["public"]["Enums"]["order_status"]
        }
        Relationships: [
          {
            foreignKeyName: "order_events_autor_id_fkey"
            columns: ["autor_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_events_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      orders: {
        Row: {
          aceito_em: string | null
          atualizado_em: string
          bairro: string | null
          categoria: Database["public"]["Enums"]["order_category"]
          cliente_id: string
          criado_em: string
          descricao: string
          endereco_entrega: string
          endereco_loja: string | null
          entregador_id: string | null
          id: string
          loja: string | null
          observacoes: string | null
          referencia: string | null
          status: Database["public"]["Enums"]["order_status"]
          taxa_servico: number
          teste: boolean
          total: number | null
          valor_estimado_max: number | null
          valor_estimado_min: number | null
          valor_frete: number
          valor_produto: number
        }
        Insert: {
          aceito_em?: string | null
          atualizado_em?: string
          bairro?: string | null
          categoria?: Database["public"]["Enums"]["order_category"]
          cliente_id: string
          criado_em?: string
          descricao: string
          endereco_entrega: string
          endereco_loja?: string | null
          entregador_id?: string | null
          id?: string
          loja?: string | null
          observacoes?: string | null
          referencia?: string | null
          status?: Database["public"]["Enums"]["order_status"]
          taxa_servico?: number
          teste?: boolean
          total?: number | null
          valor_estimado_max?: number | null
          valor_estimado_min?: number | null
          valor_frete?: number
          valor_produto?: number
        }
        Update: {
          aceito_em?: string | null
          atualizado_em?: string
          bairro?: string | null
          categoria?: Database["public"]["Enums"]["order_category"]
          cliente_id?: string
          criado_em?: string
          descricao?: string
          endereco_entrega?: string
          endereco_loja?: string | null
          entregador_id?: string | null
          id?: string
          loja?: string | null
          observacoes?: string | null
          referencia?: string | null
          status?: Database["public"]["Enums"]["order_status"]
          taxa_servico?: number
          teste?: boolean
          total?: number | null
          valor_estimado_max?: number | null
          valor_estimado_min?: number | null
          valor_frete?: number
          valor_produto?: number
        }
        Relationships: [
          {
            foreignKeyName: "orders_cliente_id_fkey"
            columns: ["cliente_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orders_entregador_id_fkey"
            columns: ["entregador_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      payments: {
        Row: {
          criado_em: string
          id: string
          order_id: string
          ref_externa: string | null
          status: Database["public"]["Enums"]["payment_status"]
          valor: number
        }
        Insert: {
          criado_em?: string
          id?: string
          order_id: string
          ref_externa?: string | null
          status?: Database["public"]["Enums"]["payment_status"]
          valor: number
        }
        Update: {
          criado_em?: string
          id?: string
          order_id?: string
          ref_externa?: string | null
          status?: Database["public"]["Enums"]["payment_status"]
          valor?: number
        }
        Relationships: [
          {
            foreignKeyName: "payments_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          bairro: string | null
          bloqueado: boolean
          criado_em: string
          id: string
          nome: string
          nota_media: number | null
          suspenso: boolean
          telefone: string | null
          teste: boolean
          tipo: Database["public"]["Enums"]["user_role"]
          total_avaliacoes: number | null
          total_entregas: number
        }
        Insert: {
          avatar_url?: string | null
          bairro?: string | null
          bloqueado?: boolean
          criado_em?: string
          id: string
          nome: string
          nota_media?: number | null
          suspenso?: boolean
          telefone?: string | null
          teste?: boolean
          tipo?: Database["public"]["Enums"]["user_role"]
          total_avaliacoes?: number | null
          total_entregas?: number
        }
        Update: {
          avatar_url?: string | null
          bairro?: string | null
          bloqueado?: boolean
          criado_em?: string
          id?: string
          nome?: string
          nota_media?: number | null
          suspenso?: boolean
          telefone?: string | null
          teste?: boolean
          tipo?: Database["public"]["Enums"]["user_role"]
          total_avaliacoes?: number | null
          total_entregas?: number
        }
        Relationships: []
      }
      reviews: {
        Row: {
          comentario: string | null
          comunicacao: number | null
          confiabilidade: number | null
          criado_em: string
          educacao: number | null
          id: string
          nota: number
          order_id: string
          rapidez: number | null
          reviewee_id: string
          reviewer_id: string
        }
        Insert: {
          comentario?: string | null
          comunicacao?: number | null
          confiabilidade?: number | null
          criado_em?: string
          educacao?: number | null
          id?: string
          nota: number
          order_id: string
          rapidez?: number | null
          reviewee_id: string
          reviewer_id: string
        }
        Update: {
          comentario?: string | null
          comunicacao?: number | null
          confiabilidade?: number | null
          criado_em?: string
          educacao?: number | null
          id?: string
          nota?: number
          order_id?: string
          rapidez?: number | null
          reviewee_id?: string
          reviewer_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "reviews_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reviews_reviewee_id_fkey"
            columns: ["reviewee_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reviews_reviewer_id_fkey"
            columns: ["reviewer_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      user_consents: {
        Row: {
          aceito_em: string
          id: string
          privacidade_versao: string
          termos_versao: string
          user_id: string
        }
        Insert: {
          aceito_em?: string
          id?: string
          privacidade_versao: string
          termos_versao: string
          user_id: string
        }
        Update: {
          aceito_em?: string
          id?: string
          privacidade_versao?: string
          termos_versao?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_consents_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
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
      notification_preferences: {
        Row: {
          user_id: string
          pedidos: boolean
          mensagens: boolean
          entregas: boolean
          avaliacoes: boolean
          candidatura: boolean
          pagamentos: boolean
          disputas: boolean
          seguranca: boolean
          sistema: boolean
          som: boolean
          atualizado_em: string
        }
        Insert: {
          user_id: string
          pedidos?: boolean
          mensagens?: boolean
          entregas?: boolean
          avaliacoes?: boolean
          candidatura?: boolean
          pagamentos?: boolean
          disputas?: boolean
          seguranca?: boolean
          sistema?: boolean
          som?: boolean
          atualizado_em?: string
        }
        Update: {
          user_id?: string
          pedidos?: boolean
          mensagens?: boolean
          entregas?: boolean
          avaliacoes?: boolean
          candidatura?: boolean
          pagamentos?: boolean
          disputas?: boolean
          seguranca?: boolean
          sistema?: boolean
          som?: boolean
          atualizado_em?: string
        }
        Relationships: []
      }
      notifications: {
        Row: {
          id: string
          user_id: string
          tipo: string
          titulo: string
          mensagem: string
          dados: Json
          lida: boolean
          criado_em: string
        }
        Insert: {
          id?: string
          user_id: string
          tipo: string
          titulo: string
          mensagem: string
          dados?: Json
          lida?: boolean
          criado_em?: string
        }
        Update: {
          id?: string
          user_id?: string
          tipo?: string
          titulo?: string
          mensagem?: string
          dados?: Json
          lida?: boolean
          criado_em?: string
        }
        Relationships: []
      }
      notification_devices: {
        Row: {
          id: string
          user_id: string
          endpoint: string
          subscription: Json
          user_agent: string | null
          ativo: boolean
          criado_em: string
          atualizado_em: string
        }
        Insert: {
          id?: string
          user_id: string
          endpoint: string
          subscription: Json
          user_agent?: string | null
          ativo?: boolean
          criado_em?: string
          atualizado_em?: string
        }
        Update: {
          id?: string
          user_id?: string
          endpoint?: string
          subscription?: Json
          user_agent?: string | null
          ativo?: boolean
          criado_em?: string
          atualizado_em?: string
        }
        Relationships: []
      }
    Views: {
      [_ in never]: never
    }
    Functions: {
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_admin: { Args: { _user_id: string }; Returns: boolean }
      list_available_orders: {
        Args: Record<PropertyKey, never>
        Returns: {
          id: string
          categoria: Database["public"]["Enums"]["order_category"]
          loja: string | null
          bairro: string | null
          valor_frete: number
          valor_estimado_min: number | null
          valor_estimado_max: number | null
          status: Database["public"]["Enums"]["order_status"]
          criado_em: string
        }[]
      }
      get_courier_order: { Args: { _order_id: string }; Returns: Json }
      get_order_counterparty_profile: {
        Args: { _order_id: string }
        Returns: { id: string; nome: string; telefone: string | null } | null
      }
      accept_order: { Args: { _order_id: string }; Returns: Json }
    }
    Enums: {
      app_role: "admin" | "moderator" | "user"
      order_category:
        | "mercado"
        | "farmacia"
        | "padaria"
        | "lojas"
        | "retirada"
        | "favor"
        | "livre"
      order_status:
        | "aguardando_entregador"
        | "aceito"
        | "indo_loja"
        | "em_compra"
        | "compra_finalizada"
        | "em_entrega"
        | "entregue"
        | "confirmado"
        | "cancelado"
        | "em_disputa"
      payment_status: "depositado" | "liberado" | "reembolsado" | "cancelado"
      user_role: "cliente" | "entregador" | "ambos"
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
      app_role: ["admin", "moderator", "user"],
      order_category: [
        "mercado",
        "farmacia",
        "padaria",
        "lojas",
        "retirada",
        "favor",
        "livre",
      ],
      order_status: [
        "aguardando_entregador",
        "aceito",
        "indo_loja",
        "em_compra",
        "compra_finalizada",
        "em_entrega",
        "entregue",
        "confirmado",
        "cancelado",
        "em_disputa",
      ],
      payment_status: ["depositado", "liberado", "reembolsado", "cancelado"],
      user_role: ["cliente", "entregador", "ambos"],
    },
  },
} as const
