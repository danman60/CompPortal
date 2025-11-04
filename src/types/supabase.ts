/**
 * Supabase Database Types
 * Auto-generated placeholder - actual types generated via Supabase CLI
 */

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      [_ in string]: {
        Row: Record<string, any>
        Insert: Record<string, any>
        Update: Record<string, any>
        Relationships: any[]
      }
    }
    Views: {
      [_ in string]: {
        Row: Record<string, any>
        Relationships: any[]
      }
    }
    Functions: {
      [_ in string]: {
        Args: Record<string, any>
        Returns: any
      }
    }
    Enums: {
      [_ in string]: string
    }
    CompositeTypes: {
      [_ in string]: Record<string, any>
    }
  }
}
