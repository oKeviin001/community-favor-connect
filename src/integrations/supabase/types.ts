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
      orders: {
        Row: {
          atualizado_em: string
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
          status: Database["public"]["Enums"]["order_status"]
          taxa_servico: number
          total: number | null
          valor_frete: number
          valor_produto: number
        }
        Insert: {
          atualizado_em?: string
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
          status?: Database["public"]["Enums"]["order_status"]
          taxa_servico?: number
          total?: number | null
          valor_frete?: number
          valor_produto?: number
        }
        Update: {
          atualizado_em?: string
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
          status?: Database["public"]["Enums"]["order_status"]
          taxa_servico?: number
          total?: number | null
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
          criado_em: string
          id: string
          nome: string
          nota_media: number | null
          telefone: string | null
          tipo: Database["public"]["Enums"]["user_role"]
          total_avaliacoes: number | null
        }
        Insert: {
          avatar_url?: string | null
          bairro?: string | null
          criado_em?: string
          id: string
          nome: string
          nota_media?: number | null
          telefone?: string | null
          tipo?: Database["public"]["Enums"]["user_role"]
          total_avaliacoes?: number | null
        }
        Update: {
          avatar_url?: string | null
          bairro?: string | null
          criado_em?: string
          id?: string
          nome?: string
          nota_media?: number | null
          telefone?: string | null
          tipo?: Database["public"]["Enums"]["user_role"]
          total_avaliacoes?: number | null
        }
        Relationships: []
      }
      reviews: {
        Row: {
          comentario: string | null
          criado_em: string
          id: string
          nota: number
          order_id: string
          reviewee_id: string
          reviewer_id: string
        }
        Insert: {
          comentario?: string | null
          criado_em?: string
          id?: string
          nota: number
          order_id: string
          reviewee_id: string
          reviewer_id: string
        }
        Update: {
          comentario?: string | null
          criado_em?: string
          id?: string
          nota?: number
          order_id?: string
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
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
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
        | "em_compra"
        | "compra_finalizada"
        | "em_entrega"
        | "entregue"
        | "confirmado"
        | "cancelado"
        | "em_disputa"
      payment_status: "depositado" | "liberado" | "reembolsado" | "cancelado"
      user_role: "cliente" | "entregador"
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
        "em_compra",
        "compra_finalizada",
        "em_entrega",
        "entregue",
        "confirmado",
        "cancelado",
        "em_disputa",
      ],
      payment_status: ["depositado", "liberado", "reembolsado", "cancelado"],
      user_role: ["cliente", "entregador"],
    },
  },
} as const
