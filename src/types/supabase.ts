export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  public: {
    Tables: {
      studios: {
        Row: {
          id: string
          name: string
          code: string | null
          city: string | null
          province: string | null
          country: string | null
          status: string | null
          email: string | null
          phone: string | null
          created_at: string | null
          owner_id: string
        }
        Insert: {
          id?: string
          name: string
          code?: string | null
          city?: string | null
          province?: string | null
          country?: string | null
          status?: string | null
          email?: string | null
          phone?: string | null
          created_at?: string | null
          owner_id: string
        }
        Update: {
          id?: string
          name?: string
          code?: string | null
          city?: string | null
          province?: string | null
          country?: string | null
          status?: string | null
          email?: string | null
          phone?: string | null
          created_at?: string | null
          owner_id?: string
        }
      }
      dancers: {
        Row: {
          id: string
          first_name: string
          last_name: string
          date_of_birth: string | null
          studio_id: string
        }
      }
      reservations: {
        Row: {
          id: string
          studio_id: string
        }
      }
      competition_entries: {
        Row: {
          id: string
          studio_id: string
        }
      }
    }
  }
}
