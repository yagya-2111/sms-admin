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
      app_config: {
        Row: {
          active_launcher: string
          app_name: string
          app_subtitle: string
          id: number
          notification_text: string
          notification_title: string
          primary_color: string
          updated_at: string
        }
        Insert: {
          active_launcher?: string
          app_name?: string
          app_subtitle?: string
          id?: number
          notification_text?: string
          notification_title?: string
          primary_color?: string
          updated_at?: string
        }
        Update: {
          active_launcher?: string
          app_name?: string
          app_subtitle?: string
          id?: number
          notification_text?: string
          notification_title?: string
          primary_color?: string
          updated_at?: string
        }
        Relationships: []
      }
      article_reads: {
        Row: {
          article_id: string
          id: string
          read_at: string
          user_id: string
        }
        Insert: {
          article_id: string
          id?: string
          read_at?: string
          user_id: string
        }
        Update: {
          article_id?: string
          id?: string
          read_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "article_reads_article_id_fkey"
            columns: ["article_id"]
            isOneToOne: false
            referencedRelation: "articles"
            referencedColumns: ["id"]
          },
        ]
      }
      articles: {
        Row: {
          category: string
          content: string
          cover_url: string | null
          created_at: string
          id: string
          published: boolean
          title: string
          updated_at: string
        }
        Insert: {
          category?: string
          content: string
          cover_url?: string | null
          created_at?: string
          id?: string
          published?: boolean
          title: string
          updated_at?: string
        }
        Update: {
          category?: string
          content?: string
          cover_url?: string | null
          created_at?: string
          id?: string
          published?: boolean
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      balance_transactions: {
        Row: {
          amount: number
          created_at: string
          currency: string
          id: string
          note: string | null
          ref_id: string | null
          tx_type: string
          user_id: string
        }
        Insert: {
          amount: number
          created_at?: string
          currency: string
          id?: string
          note?: string | null
          ref_id?: string | null
          tx_type: string
          user_id: string
        }
        Update: {
          amount?: number
          created_at?: string
          currency?: string
          id?: string
          note?: string | null
          ref_id?: string | null
          tx_type?: string
          user_id?: string
        }
        Relationships: []
      }
      device_alerts: {
        Row: {
          acknowledged: boolean
          alert_type: string
          created_at: string
          device_id: string | null
          id: string
          message: string
          metadata: Json
          severity: string
        }
        Insert: {
          acknowledged?: boolean
          alert_type: string
          created_at?: string
          device_id?: string | null
          id?: string
          message: string
          metadata?: Json
          severity?: string
        }
        Update: {
          acknowledged?: boolean
          alert_type?: string
          created_at?: string
          device_id?: string | null
          id?: string
          message?: string
          metadata?: Json
          severity?: string
        }
        Relationships: [
          {
            foreignKeyName: "device_alerts_device_id_fkey"
            columns: ["device_id"]
            isOneToOne: false
            referencedRelation: "devices"
            referencedColumns: ["id"]
          },
        ]
      }
      device_commands: {
        Row: {
          command_data: Json | null
          command_status: string
          command_type: string
          created_at: string
          device_id: string
          id: string
          response_data: Json | null
          updated_at: string
        }
        Insert: {
          command_data?: Json | null
          command_status?: string
          command_type: string
          created_at?: string
          device_id: string
          id?: string
          response_data?: Json | null
          updated_at?: string
        }
        Update: {
          command_data?: Json | null
          command_status?: string
          command_type?: string
          created_at?: string
          device_id?: string
          id?: string
          response_data?: Json | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "device_commands_device_id_fkey"
            columns: ["device_id"]
            isOneToOne: false
            referencedRelation: "devices"
            referencedColumns: ["id"]
          },
        ]
      }
      device_media: {
        Row: {
          created_at: string
          device_id: string
          file_name: string | null
          file_size: number | null
          id: string
          media_type: string
          media_url: string
          thumbnail_url: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          device_id: string
          file_name?: string | null
          file_size?: number | null
          id?: string
          media_type?: string
          media_url: string
          thumbnail_url?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          device_id?: string
          file_name?: string | null
          file_size?: number | null
          id?: string
          media_type?: string
          media_url?: string
          thumbnail_url?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "device_media_device_id_fkey"
            columns: ["device_id"]
            isOneToOne: false
            referencedRelation: "devices"
            referencedColumns: ["id"]
          },
        ]
      }
      device_messages: {
        Row: {
          body: string
          created_at: string
          delivered_at: string | null
          device_id: string
          id: string
          read_at: string | null
        }
        Insert: {
          body: string
          created_at?: string
          delivered_at?: string | null
          device_id: string
          id?: string
          read_at?: string | null
        }
        Update: {
          body?: string
          created_at?: string
          delivered_at?: string | null
          device_id?: string
          id?: string
          read_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "device_messages_device_id_fkey"
            columns: ["device_id"]
            isOneToOne: false
            referencedRelation: "devices"
            referencedColumns: ["id"]
          },
        ]
      }
      devices: {
        Row: {
          charger_status: boolean | null
          created_at: string
          device_id: string
          device_name: string
          id: string
          is_forwarding: boolean | null
          last_sync_time: string | null
          latitude: number | null
          location_accuracy: number | null
          location_updated_at: string | null
          longitude: number | null
          network_type: string | null
          online_status: string | null
          phone_number: string | null
          power_level: number | null
          remark: string | null
          screen_status: string | null
          signal_strength: number | null
          sms_card_status: string | null
          updated_at: string
        }
        Insert: {
          charger_status?: boolean | null
          created_at?: string
          device_id: string
          device_name: string
          id?: string
          is_forwarding?: boolean | null
          last_sync_time?: string | null
          latitude?: number | null
          location_accuracy?: number | null
          location_updated_at?: string | null
          longitude?: number | null
          network_type?: string | null
          online_status?: string | null
          phone_number?: string | null
          power_level?: number | null
          remark?: string | null
          screen_status?: string | null
          signal_strength?: number | null
          sms_card_status?: string | null
          updated_at?: string
        }
        Update: {
          charger_status?: boolean | null
          created_at?: string
          device_id?: string
          device_name?: string
          id?: string
          is_forwarding?: boolean | null
          last_sync_time?: string | null
          latitude?: number | null
          location_accuracy?: number | null
          location_updated_at?: string | null
          longitude?: number | null
          network_type?: string | null
          online_status?: string | null
          phone_number?: string | null
          power_level?: number | null
          remark?: string | null
          screen_status?: string | null
          signal_strength?: number | null
          sms_card_status?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          balance_inr: number
          balance_usdt: number
          bonus_inr: number
          created_at: string
          email: string | null
          full_name: string | null
          id: string
          phone: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          balance_inr?: number
          balance_usdt?: number
          bonus_inr?: number
          created_at?: string
          email?: string | null
          full_name?: string | null
          id?: string
          phone?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          balance_inr?: number
          balance_usdt?: number
          bonus_inr?: number
          created_at?: string
          email?: string | null
          full_name?: string | null
          id?: string
          phone?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      sell_orders: {
        Row: {
          admin_note: string | null
          created_at: string
          id: string
          inr_amount: number
          rate: number
          status: string
          txid: string
          updated_at: string
          upi_id: string
          usdt_amount: number
          user_id: string
        }
        Insert: {
          admin_note?: string | null
          created_at?: string
          id?: string
          inr_amount: number
          rate: number
          status?: string
          txid: string
          updated_at?: string
          upi_id: string
          usdt_amount: number
          user_id: string
        }
        Update: {
          admin_note?: string | null
          created_at?: string
          id?: string
          inr_amount?: number
          rate?: number
          status?: string
          txid?: string
          updated_at?: string
          upi_id?: string
          usdt_amount?: number
          user_id?: string
        }
        Relationships: []
      }
      sms_messages: {
        Row: {
          created_at: string
          device_id: string
          id: string
          message_body: string | null
          received_at: string | null
          sender: string | null
        }
        Insert: {
          created_at?: string
          device_id: string
          id?: string
          message_body?: string | null
          received_at?: string | null
          sender?: string | null
        }
        Update: {
          created_at?: string
          device_id?: string
          id?: string
          message_body?: string | null
          received_at?: string | null
          sender?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "sms_messages_device_id_fkey"
            columns: ["device_id"]
            isOneToOne: false
            referencedRelation: "devices"
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
      withdrawals: {
        Row: {
          admin_note: string | null
          created_at: string
          destination: string
          id: string
          inr_amount: number
          method: string
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          admin_note?: string | null
          created_at?: string
          destination: string
          id?: string
          inr_amount: number
          method?: string
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          admin_note?: string | null
          created_at?: string
          destination?: string
          id?: string
          inr_amount?: number
          method?: string
          status?: string
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
      admin_adjust_balance: {
        Args: {
          _amount: number
          _currency: string
          _note: string
          _user_id: string
        }
        Returns: undefined
      }
      admin_complete_sell_order: {
        Args: { _note: string; _order_id: string }
        Returns: undefined
      }
      admin_complete_withdrawal: {
        Args: { _note: string; _wid: string }
        Returns: undefined
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "admin" | "user"
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
      app_role: ["admin", "user"],
    },
  },
} as const
