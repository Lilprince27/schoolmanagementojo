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
      academic_sessions: {
        Row: {
          created_at: string
          end_date: string | null
          id: string
          is_current: boolean
          name: string
          school_org_id: string | null
          start_date: string | null
          term: Database["public"]["Enums"]["term_type"]
          updated_at: string
        }
        Insert: {
          created_at?: string
          end_date?: string | null
          id?: string
          is_current?: boolean
          name: string
          school_org_id?: string | null
          start_date?: string | null
          term: Database["public"]["Enums"]["term_type"]
          updated_at?: string
        }
        Update: {
          created_at?: string
          end_date?: string | null
          id?: string
          is_current?: boolean
          name?: string
          school_org_id?: string | null
          start_date?: string | null
          term?: Database["public"]["Enums"]["term_type"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "academic_sessions_school_org_id_fkey"
            columns: ["school_org_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
        ]
      }
      announcements: {
        Row: {
          audience: Database["public"]["Enums"]["announcement_audience"]
          body: string
          created_at: string
          created_by: string | null
          id: string
          school_org_id: string | null
          title: string
          updated_at: string
        }
        Insert: {
          audience?: Database["public"]["Enums"]["announcement_audience"]
          body: string
          created_at?: string
          created_by?: string | null
          id?: string
          school_org_id?: string | null
          title: string
          updated_at?: string
        }
        Update: {
          audience?: Database["public"]["Enums"]["announcement_audience"]
          body?: string
          created_at?: string
          created_by?: string | null
          id?: string
          school_org_id?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "announcements_school_org_id_fkey"
            columns: ["school_org_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
        ]
      }
      attendance: {
        Row: {
          created_at: string
          date: string
          id: string
          notes: string | null
          notified: boolean
          recorded_by: string | null
          status: Database["public"]["Enums"]["attendance_status"]
          student_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          date: string
          id?: string
          notes?: string | null
          notified?: boolean
          recorded_by?: string | null
          status: Database["public"]["Enums"]["attendance_status"]
          student_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          date?: string
          id?: string
          notes?: string | null
          notified?: boolean
          recorded_by?: string | null
          status?: Database["public"]["Enums"]["attendance_status"]
          student_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "attendance_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
        ]
      }
      bus_fee_payments: {
        Row: {
          amount: number
          created_at: string
          due_date: string | null
          id: string
          method: string | null
          note: string | null
          paid_at: string | null
          parent_id: string | null
          period: string
          receipt_no: string | null
          recorded_by: string | null
          reference: string | null
          route_id: string | null
          session_id: string | null
          status: string
          student_id: string
          term: string | null
          updated_at: string
        }
        Insert: {
          amount: number
          created_at?: string
          due_date?: string | null
          id?: string
          method?: string | null
          note?: string | null
          paid_at?: string | null
          parent_id?: string | null
          period: string
          receipt_no?: string | null
          recorded_by?: string | null
          reference?: string | null
          route_id?: string | null
          session_id?: string | null
          status?: string
          student_id: string
          term?: string | null
          updated_at?: string
        }
        Update: {
          amount?: number
          created_at?: string
          due_date?: string | null
          id?: string
          method?: string | null
          note?: string | null
          paid_at?: string | null
          parent_id?: string | null
          period?: string
          receipt_no?: string | null
          recorded_by?: string | null
          reference?: string | null
          route_id?: string | null
          session_id?: string | null
          status?: string
          student_id?: string
          term?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "bus_fee_payments_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "parents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bus_fee_payments_route_id_fkey"
            columns: ["route_id"]
            isOneToOne: false
            referencedRelation: "bus_routes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bus_fee_payments_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "academic_sessions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bus_fee_payments_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
        ]
      }
      bus_gps_pings: {
        Row: {
          accuracy: number | null
          heading: number | null
          id: string
          latitude: number
          longitude: number
          recorded_at: string
          speed: number | null
          trip_id: string
        }
        Insert: {
          accuracy?: number | null
          heading?: number | null
          id?: string
          latitude: number
          longitude: number
          recorded_at?: string
          speed?: number | null
          trip_id: string
        }
        Update: {
          accuracy?: number | null
          heading?: number | null
          id?: string
          latitude?: number
          longitude?: number
          recorded_at?: string
          speed?: number | null
          trip_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "bus_gps_pings_trip_id_fkey"
            columns: ["trip_id"]
            isOneToOne: false
            referencedRelation: "bus_trips"
            referencedColumns: ["id"]
          },
        ]
      }
      bus_routes: {
        Row: {
          bus_id: string | null
          created_at: string
          description: string | null
          destination_lat: number | null
          destination_lng: number | null
          destination_name: string | null
          distance_km: number | null
          dropoff_time: string | null
          id: string
          monthly_fee: number
          name: string
          pickup_time: string | null
          school_id: string
          stops: Json
          travel_minutes: number | null
          updated_at: string
        }
        Insert: {
          bus_id?: string | null
          created_at?: string
          description?: string | null
          destination_lat?: number | null
          destination_lng?: number | null
          destination_name?: string | null
          distance_km?: number | null
          dropoff_time?: string | null
          id?: string
          monthly_fee?: number
          name: string
          pickup_time?: string | null
          school_id: string
          stops?: Json
          travel_minutes?: number | null
          updated_at?: string
        }
        Update: {
          bus_id?: string | null
          created_at?: string
          description?: string | null
          destination_lat?: number | null
          destination_lng?: number | null
          destination_name?: string | null
          distance_km?: number | null
          dropoff_time?: string | null
          id?: string
          monthly_fee?: number
          name?: string
          pickup_time?: string | null
          school_id?: string
          stops?: Json
          travel_minutes?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "bus_routes_bus_id_fkey"
            columns: ["bus_id"]
            isOneToOne: false
            referencedRelation: "buses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bus_routes_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
        ]
      }
      bus_trips: {
        Row: {
          bus_id: string
          created_at: string
          direction: string
          driver_id: string | null
          ended_at: string | null
          id: string
          last_lat: number | null
          last_lng: number | null
          last_ping_at: string | null
          last_speed: number | null
          route_id: string | null
          school_id: string
          started_at: string
          status: string
          updated_at: string
        }
        Insert: {
          bus_id: string
          created_at?: string
          direction?: string
          driver_id?: string | null
          ended_at?: string | null
          id?: string
          last_lat?: number | null
          last_lng?: number | null
          last_ping_at?: string | null
          last_speed?: number | null
          route_id?: string | null
          school_id: string
          started_at?: string
          status?: string
          updated_at?: string
        }
        Update: {
          bus_id?: string
          created_at?: string
          direction?: string
          driver_id?: string | null
          ended_at?: string | null
          id?: string
          last_lat?: number | null
          last_lng?: number | null
          last_ping_at?: string | null
          last_speed?: number | null
          route_id?: string | null
          school_id?: string
          started_at?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "bus_trips_bus_id_fkey"
            columns: ["bus_id"]
            isOneToOne: false
            referencedRelation: "buses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bus_trips_driver_id_fkey"
            columns: ["driver_id"]
            isOneToOne: false
            referencedRelation: "drivers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bus_trips_route_id_fkey"
            columns: ["route_id"]
            isOneToOne: false
            referencedRelation: "bus_routes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bus_trips_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
        ]
      }
      buses: {
        Row: {
          archived_at: string | null
          assigned_driver_id: string | null
          assistant_name: string | null
          assistant_phone: string | null
          capacity: number
          color: string | null
          created_at: string
          driver_name: string | null
          driver_phone: string | null
          gps_enabled: boolean
          id: string
          inspection_date: string | null
          insurance_expiry: string | null
          model: string | null
          plate_number: string
          registration_no: string | null
          school_id: string
          status: string
          updated_at: string
          vehicle_type: string | null
        }
        Insert: {
          archived_at?: string | null
          assigned_driver_id?: string | null
          assistant_name?: string | null
          assistant_phone?: string | null
          capacity?: number
          color?: string | null
          created_at?: string
          driver_name?: string | null
          driver_phone?: string | null
          gps_enabled?: boolean
          id?: string
          inspection_date?: string | null
          insurance_expiry?: string | null
          model?: string | null
          plate_number: string
          registration_no?: string | null
          school_id: string
          status?: string
          updated_at?: string
          vehicle_type?: string | null
        }
        Update: {
          archived_at?: string | null
          assigned_driver_id?: string | null
          assistant_name?: string | null
          assistant_phone?: string | null
          capacity?: number
          color?: string | null
          created_at?: string
          driver_name?: string | null
          driver_phone?: string | null
          gps_enabled?: boolean
          id?: string
          inspection_date?: string | null
          insurance_expiry?: string | null
          model?: string | null
          plate_number?: string
          registration_no?: string | null
          school_id?: string
          status?: string
          updated_at?: string
          vehicle_type?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "buses_driver_fk"
            columns: ["assigned_driver_id"]
            isOneToOne: false
            referencedRelation: "drivers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "buses_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
        ]
      }
      classes: {
        Row: {
          created_at: string
          id: string
          level: string | null
          name: string
          school_org_id: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          level?: string | null
          name: string
          school_org_id?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          level?: string | null
          name?: string
          school_org_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "classes_school_org_id_fkey"
            columns: ["school_org_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
        ]
      }
      drivers: {
        Row: {
          address: string | null
          assigned_bus_id: string | null
          created_at: string
          email: string | null
          emergency_contact: string | null
          employment_status: string
          full_name: string
          id: string
          license_expiry: string | null
          license_no: string | null
          phone: string | null
          photo_url: string | null
          profile_id: string | null
          school_id: string
          updated_at: string
        }
        Insert: {
          address?: string | null
          assigned_bus_id?: string | null
          created_at?: string
          email?: string | null
          emergency_contact?: string | null
          employment_status?: string
          full_name: string
          id?: string
          license_expiry?: string | null
          license_no?: string | null
          phone?: string | null
          photo_url?: string | null
          profile_id?: string | null
          school_id: string
          updated_at?: string
        }
        Update: {
          address?: string | null
          assigned_bus_id?: string | null
          created_at?: string
          email?: string | null
          emergency_contact?: string | null
          employment_status?: string
          full_name?: string
          id?: string
          license_expiry?: string | null
          license_no?: string | null
          phone?: string | null
          photo_url?: string | null
          profile_id?: string | null
          school_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "drivers_assigned_bus_id_fkey"
            columns: ["assigned_bus_id"]
            isOneToOne: false
            referencedRelation: "buses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "drivers_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
        ]
      }
      emergency_alerts: {
        Row: {
          alert_type: string
          bus_id: string | null
          created_at: string
          created_by: string | null
          driver_id: string | null
          id: string
          latitude: number | null
          longitude: number | null
          note: string | null
          resolved_at: string | null
          resolved_by: string | null
          school_id: string
          trip_id: string | null
          updated_at: string
        }
        Insert: {
          alert_type?: string
          bus_id?: string | null
          created_at?: string
          created_by?: string | null
          driver_id?: string | null
          id?: string
          latitude?: number | null
          longitude?: number | null
          note?: string | null
          resolved_at?: string | null
          resolved_by?: string | null
          school_id: string
          trip_id?: string | null
          updated_at?: string
        }
        Update: {
          alert_type?: string
          bus_id?: string | null
          created_at?: string
          created_by?: string | null
          driver_id?: string | null
          id?: string
          latitude?: number | null
          longitude?: number | null
          note?: string | null
          resolved_at?: string | null
          resolved_by?: string | null
          school_id?: string
          trip_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "emergency_alerts_bus_id_fkey"
            columns: ["bus_id"]
            isOneToOne: false
            referencedRelation: "buses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "emergency_alerts_driver_id_fkey"
            columns: ["driver_id"]
            isOneToOne: false
            referencedRelation: "drivers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "emergency_alerts_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "emergency_alerts_trip_id_fkey"
            columns: ["trip_id"]
            isOneToOne: false
            referencedRelation: "bus_trips"
            referencedColumns: ["id"]
          },
        ]
      }
      fee_invoices: {
        Row: {
          amount: number
          amount_paid: number
          created_at: string
          created_by: string | null
          due_date: string | null
          fee_structure_id: string | null
          id: string
          school_id: string
          session_id: string | null
          status: string
          student_id: string
          term: Database["public"]["Enums"]["term_type"] | null
          title: string
          updated_at: string
        }
        Insert: {
          amount: number
          amount_paid?: number
          created_at?: string
          created_by?: string | null
          due_date?: string | null
          fee_structure_id?: string | null
          id?: string
          school_id: string
          session_id?: string | null
          status?: string
          student_id: string
          term?: Database["public"]["Enums"]["term_type"] | null
          title: string
          updated_at?: string
        }
        Update: {
          amount?: number
          amount_paid?: number
          created_at?: string
          created_by?: string | null
          due_date?: string | null
          fee_structure_id?: string | null
          id?: string
          school_id?: string
          session_id?: string | null
          status?: string
          student_id?: string
          term?: Database["public"]["Enums"]["term_type"] | null
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "fee_invoices_fee_structure_id_fkey"
            columns: ["fee_structure_id"]
            isOneToOne: false
            referencedRelation: "fee_structures"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fee_invoices_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fee_invoices_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "academic_sessions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fee_invoices_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
        ]
      }
      fee_structures: {
        Row: {
          amount: number
          class_id: string | null
          created_at: string
          created_by: string | null
          description: string | null
          id: string
          is_active: boolean
          name: string
          school_id: string
          session_id: string | null
          term: Database["public"]["Enums"]["term_type"] | null
          updated_at: string
        }
        Insert: {
          amount: number
          class_id?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          is_active?: boolean
          name: string
          school_id: string
          session_id?: string | null
          term?: Database["public"]["Enums"]["term_type"] | null
          updated_at?: string
        }
        Update: {
          amount?: number
          class_id?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          is_active?: boolean
          name?: string
          school_id?: string
          session_id?: string | null
          term?: Database["public"]["Enums"]["term_type"] | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "fee_structures_class_id_fkey"
            columns: ["class_id"]
            isOneToOne: false
            referencedRelation: "classes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fee_structures_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fee_structures_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "academic_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      join_requests: {
        Row: {
          created_at: string
          id: string
          message: string | null
          requested_role: Database["public"]["Enums"]["app_role"]
          reviewed_at: string | null
          reviewed_by: string | null
          school_id: string
          status: Database["public"]["Enums"]["join_status"]
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          message?: string | null
          requested_role: Database["public"]["Enums"]["app_role"]
          reviewed_at?: string | null
          reviewed_by?: string | null
          school_id: string
          status?: Database["public"]["Enums"]["join_status"]
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          message?: string | null
          requested_role?: Database["public"]["Enums"]["app_role"]
          reviewed_at?: string | null
          reviewed_by?: string | null
          school_id?: string
          status?: Database["public"]["Enums"]["join_status"]
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "join_requests_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
        ]
      }
      parent_students: {
        Row: {
          created_at: string
          id: string
          parent_id: string
          relationship: string | null
          student_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          parent_id: string
          relationship?: string | null
          student_id: string
        }
        Update: {
          created_at?: string
          id?: string
          parent_id?: string
          relationship?: string | null
          student_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "parent_students_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "parents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "parent_students_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
        ]
      }
      parents: {
        Row: {
          address: string | null
          created_at: string
          full_name: string | null
          id: string
          occupation: string | null
          phone: string | null
          profile_id: string
          school_org_id: string | null
          status: Database["public"]["Enums"]["approval_status"]
          updated_at: string
        }
        Insert: {
          address?: string | null
          created_at?: string
          full_name?: string | null
          id?: string
          occupation?: string | null
          phone?: string | null
          profile_id: string
          school_org_id?: string | null
          status?: Database["public"]["Enums"]["approval_status"]
          updated_at?: string
        }
        Update: {
          address?: string | null
          created_at?: string
          full_name?: string | null
          id?: string
          occupation?: string | null
          phone?: string | null
          profile_id?: string
          school_org_id?: string | null
          status?: Database["public"]["Enums"]["approval_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "parents_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "parents_school_org_id_fkey"
            columns: ["school_org_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
        ]
      }
      payment_settings: {
        Row: {
          id: boolean
          live_secret_key: string | null
          mode: string
          secret_hash: string | null
          test_secret_key: string | null
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          id?: boolean
          live_secret_key?: string | null
          mode?: string
          secret_hash?: string | null
          test_secret_key?: string | null
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          id?: boolean
          live_secret_key?: string | null
          mode?: string
          secret_hash?: string | null
          test_secret_key?: string | null
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: []
      }
      payments: {
        Row: {
          amount: number
          bus_fee_payment_id: string | null
          channel: string | null
          created_at: string
          currency: string
          fee_invoice_id: string | null
          id: string
          metadata: Json
          order_id: string | null
          paid_at: string | null
          payer_id: string
          payment_link: string | null
          provider: string
          provider_tx_id: string | null
          purpose: string
          reference: string
          school_id: string
          status: string
          updated_at: string
        }
        Insert: {
          amount: number
          bus_fee_payment_id?: string | null
          channel?: string | null
          created_at?: string
          currency?: string
          fee_invoice_id?: string | null
          id?: string
          metadata?: Json
          order_id?: string | null
          paid_at?: string | null
          payer_id: string
          payment_link?: string | null
          provider?: string
          provider_tx_id?: string | null
          purpose: string
          reference: string
          school_id: string
          status?: string
          updated_at?: string
        }
        Update: {
          amount?: number
          bus_fee_payment_id?: string | null
          channel?: string | null
          created_at?: string
          currency?: string
          fee_invoice_id?: string | null
          id?: string
          metadata?: Json
          order_id?: string | null
          paid_at?: string | null
          payer_id?: string
          payment_link?: string | null
          provider?: string
          provider_tx_id?: string | null
          purpose?: string
          reference?: string
          school_id?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "payments_bus_fee_payment_id_fkey"
            columns: ["bus_fee_payment_id"]
            isOneToOne: false
            referencedRelation: "bus_fee_payments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payments_fee_invoice_id_fkey"
            columns: ["fee_invoice_id"]
            isOneToOne: false
            referencedRelation: "fee_invoices"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payments_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "shop_orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payments_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          email: string | null
          full_name: string
          id: string
          phone: string | null
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          email?: string | null
          full_name?: string
          id: string
          phone?: string | null
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          email?: string | null
          full_name?: string
          id?: string
          phone?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      results: {
        Row: {
          attendance_score: number
          created_at: string
          exam_score: number
          grade: string | null
          id: string
          notes_score: number
          recorded_by: string | null
          remark: string | null
          session_id: string
          student_id: string
          subject_id: string
          term: Database["public"]["Enums"]["term_type"]
          test_score: number
          total: number | null
          updated_at: string
        }
        Insert: {
          attendance_score?: number
          created_at?: string
          exam_score?: number
          grade?: string | null
          id?: string
          notes_score?: number
          recorded_by?: string | null
          remark?: string | null
          session_id: string
          student_id: string
          subject_id: string
          term: Database["public"]["Enums"]["term_type"]
          test_score?: number
          total?: number | null
          updated_at?: string
        }
        Update: {
          attendance_score?: number
          created_at?: string
          exam_score?: number
          grade?: string | null
          id?: string
          notes_score?: number
          recorded_by?: string | null
          remark?: string | null
          session_id?: string
          student_id?: string
          subject_id?: string
          term?: Database["public"]["Enums"]["term_type"]
          test_score?: number
          total?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "results_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "academic_sessions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "results_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "results_subject_id_fkey"
            columns: ["subject_id"]
            isOneToOne: false
            referencedRelation: "subjects"
            referencedColumns: ["id"]
          },
        ]
      }
      route_stops: {
        Row: {
          created_at: string
          id: string
          latitude: number | null
          longitude: number | null
          name: string
          pickup_time: string | null
          route_id: string
          stop_order: number
        }
        Insert: {
          created_at?: string
          id?: string
          latitude?: number | null
          longitude?: number | null
          name: string
          pickup_time?: string | null
          route_id: string
          stop_order?: number
        }
        Update: {
          created_at?: string
          id?: string
          latitude?: number | null
          longitude?: number | null
          name?: string
          pickup_time?: string | null
          route_id?: string
          stop_order?: number
        }
        Relationships: [
          {
            foreignKeyName: "route_stops_route_id_fkey"
            columns: ["route_id"]
            isOneToOne: false
            referencedRelation: "bus_routes"
            referencedColumns: ["id"]
          },
        ]
      }
      schools: {
        Row: {
          address: string | null
          admin_email: string | null
          admin_profile_id: string | null
          banner_url: string | null
          code: string | null
          country: string
          created_at: string
          created_by: string | null
          email: string | null
          favicon_url: string | null
          flw_subaccount_id: string | null
          id: string
          lga: string
          login_background_url: string | null
          logo_url: string | null
          motto: string | null
          name: string
          payout_account_name: string | null
          payout_account_number: string | null
          payout_bank_code: string | null
          phone: string | null
          platform_fee_percent: number
          primary_color: string | null
          secondary_color: string | null
          state: string
          updated_at: string
        }
        Insert: {
          address?: string | null
          admin_email?: string | null
          admin_profile_id?: string | null
          banner_url?: string | null
          code?: string | null
          country?: string
          created_at?: string
          created_by?: string | null
          email?: string | null
          favicon_url?: string | null
          flw_subaccount_id?: string | null
          id?: string
          lga: string
          login_background_url?: string | null
          logo_url?: string | null
          motto?: string | null
          name: string
          payout_account_name?: string | null
          payout_account_number?: string | null
          payout_bank_code?: string | null
          phone?: string | null
          platform_fee_percent?: number
          primary_color?: string | null
          secondary_color?: string | null
          state: string
          updated_at?: string
        }
        Update: {
          address?: string | null
          admin_email?: string | null
          admin_profile_id?: string | null
          banner_url?: string | null
          code?: string | null
          country?: string
          created_at?: string
          created_by?: string | null
          email?: string | null
          favicon_url?: string | null
          flw_subaccount_id?: string | null
          id?: string
          lga?: string
          login_background_url?: string | null
          logo_url?: string | null
          motto?: string | null
          name?: string
          payout_account_name?: string | null
          payout_account_number?: string | null
          payout_bank_code?: string | null
          phone?: string | null
          platform_fee_percent?: number
          primary_color?: string | null
          secondary_color?: string | null
          state?: string
          updated_at?: string
        }
        Relationships: []
      }
      shop_order_items: {
        Row: {
          created_at: string
          id: string
          order_id: string
          product_id: string
          quantity: number
          unit_price: number
        }
        Insert: {
          created_at?: string
          id?: string
          order_id: string
          product_id: string
          quantity?: number
          unit_price?: number
        }
        Update: {
          created_at?: string
          id?: string
          order_id?: string
          product_id?: string
          quantity?: number
          unit_price?: number
        }
        Relationships: [
          {
            foreignKeyName: "shop_order_items_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "shop_orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "shop_order_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "shop_products"
            referencedColumns: ["id"]
          },
        ]
      }
      shop_orders: {
        Row: {
          buyer_id: string
          created_at: string
          id: string
          notes: string | null
          payment_status: string
          school_id: string
          status: string
          total: number
          updated_at: string
        }
        Insert: {
          buyer_id: string
          created_at?: string
          id?: string
          notes?: string | null
          payment_status?: string
          school_id: string
          status?: string
          total?: number
          updated_at?: string
        }
        Update: {
          buyer_id?: string
          created_at?: string
          id?: string
          notes?: string | null
          payment_status?: string
          school_id?: string
          status?: string
          total?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "shop_orders_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
        ]
      }
      shop_products: {
        Row: {
          category: string
          created_at: string
          created_by: string | null
          description: string | null
          id: string
          image_url: string | null
          is_active: boolean
          name: string
          price: number
          school_id: string
          stock: number
          updated_at: string
        }
        Insert: {
          category?: string
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          image_url?: string | null
          is_active?: boolean
          name: string
          price?: number
          school_id: string
          stock?: number
          updated_at?: string
        }
        Update: {
          category?: string
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          image_url?: string | null
          is_active?: boolean
          name?: string
          price?: number
          school_id?: string
          stock?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "shop_products_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
        ]
      }
      student_bus_assignments: {
        Row: {
          created_at: string
          dropoff_stop_id: string | null
          id: string
          pickup_stop_id: string | null
          pickup_time: string | null
          route_id: string
          seat_number: string | null
          status: string
          stop_name: string | null
          student_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          dropoff_stop_id?: string | null
          id?: string
          pickup_stop_id?: string | null
          pickup_time?: string | null
          route_id: string
          seat_number?: string | null
          status?: string
          stop_name?: string | null
          student_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          dropoff_stop_id?: string | null
          id?: string
          pickup_stop_id?: string | null
          pickup_time?: string | null
          route_id?: string
          seat_number?: string | null
          status?: string
          stop_name?: string | null
          student_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "student_bus_assignments_dropoff_stop_id_fkey"
            columns: ["dropoff_stop_id"]
            isOneToOne: false
            referencedRelation: "route_stops"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "student_bus_assignments_pickup_stop_id_fkey"
            columns: ["pickup_stop_id"]
            isOneToOne: false
            referencedRelation: "route_stops"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "student_bus_assignments_route_id_fkey"
            columns: ["route_id"]
            isOneToOne: false
            referencedRelation: "bus_routes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "student_bus_assignments_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
        ]
      }
      students: {
        Row: {
          address: string | null
          class_id: string | null
          created_at: string
          date_of_birth: string | null
          emergency_contact: string | null
          full_name: string
          gender: Database["public"]["Enums"]["gender_type"] | null
          id: string
          photo_url: string | null
          profile_id: string | null
          school_id: string
          school_org_id: string | null
          session_id: string | null
          updated_at: string
        }
        Insert: {
          address?: string | null
          class_id?: string | null
          created_at?: string
          date_of_birth?: string | null
          emergency_contact?: string | null
          full_name: string
          gender?: Database["public"]["Enums"]["gender_type"] | null
          id?: string
          photo_url?: string | null
          profile_id?: string | null
          school_id: string
          school_org_id?: string | null
          session_id?: string | null
          updated_at?: string
        }
        Update: {
          address?: string | null
          class_id?: string | null
          created_at?: string
          date_of_birth?: string | null
          emergency_contact?: string | null
          full_name?: string
          gender?: Database["public"]["Enums"]["gender_type"] | null
          id?: string
          photo_url?: string | null
          profile_id?: string | null
          school_id?: string
          school_org_id?: string | null
          session_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "students_class_id_fkey"
            columns: ["class_id"]
            isOneToOne: false
            referencedRelation: "classes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "students_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "students_school_org_id_fkey"
            columns: ["school_org_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "students_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "academic_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      subjects: {
        Row: {
          code: string | null
          created_at: string
          id: string
          name: string
          updated_at: string
        }
        Insert: {
          code?: string | null
          created_at?: string
          id?: string
          name: string
          updated_at?: string
        }
        Update: {
          code?: string | null
          created_at?: string
          id?: string
          name?: string
          updated_at?: string
        }
        Relationships: []
      }
      teacher_subjects: {
        Row: {
          class_id: string
          created_at: string
          id: string
          subject_id: string
          teacher_id: string
        }
        Insert: {
          class_id: string
          created_at?: string
          id?: string
          subject_id: string
          teacher_id: string
        }
        Update: {
          class_id?: string
          created_at?: string
          id?: string
          subject_id?: string
          teacher_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "teacher_subjects_class_id_fkey"
            columns: ["class_id"]
            isOneToOne: false
            referencedRelation: "classes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "teacher_subjects_subject_id_fkey"
            columns: ["subject_id"]
            isOneToOne: false
            referencedRelation: "subjects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "teacher_subjects_teacher_id_fkey"
            columns: ["teacher_id"]
            isOneToOne: false
            referencedRelation: "teachers"
            referencedColumns: ["id"]
          },
        ]
      }
      teachers: {
        Row: {
          class_id: string | null
          created_at: string
          employee_id: string
          full_name: string | null
          id: string
          profile_id: string
          qualification: string | null
          school_org_id: string | null
          status: Database["public"]["Enums"]["approval_status"]
          teacher_type: Database["public"]["Enums"]["teacher_type"]
          updated_at: string
        }
        Insert: {
          class_id?: string | null
          created_at?: string
          employee_id: string
          full_name?: string | null
          id?: string
          profile_id: string
          qualification?: string | null
          school_org_id?: string | null
          status?: Database["public"]["Enums"]["approval_status"]
          teacher_type?: Database["public"]["Enums"]["teacher_type"]
          updated_at?: string
        }
        Update: {
          class_id?: string | null
          created_at?: string
          employee_id?: string
          full_name?: string | null
          id?: string
          profile_id?: string
          qualification?: string | null
          school_org_id?: string | null
          status?: Database["public"]["Enums"]["approval_status"]
          teacher_type?: Database["public"]["Enums"]["teacher_type"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "teachers_class_id_fkey"
            columns: ["class_id"]
            isOneToOne: false
            referencedRelation: "classes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "teachers_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "teachers_school_org_id_fkey"
            columns: ["school_org_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
        ]
      }
      transport_fee_rates: {
        Row: {
          amount: number
          created_at: string
          id: string
          route_id: string | null
          school_id: string
          session_id: string | null
          term: string
          updated_at: string
        }
        Insert: {
          amount?: number
          created_at?: string
          id?: string
          route_id?: string | null
          school_id: string
          session_id?: string | null
          term: string
          updated_at?: string
        }
        Update: {
          amount?: number
          created_at?: string
          id?: string
          route_id?: string | null
          school_id?: string
          session_id?: string | null
          term?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "transport_fee_rates_route_id_fkey"
            columns: ["route_id"]
            isOneToOne: false
            referencedRelation: "bus_routes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transport_fee_rates_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transport_fee_rates_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "academic_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      trip_events: {
        Row: {
          event_type: string
          id: string
          latitude: number | null
          longitude: number | null
          note: string | null
          occurred_at: string
          stop_id: string | null
          student_id: string | null
          trip_id: string
        }
        Insert: {
          event_type: string
          id?: string
          latitude?: number | null
          longitude?: number | null
          note?: string | null
          occurred_at?: string
          stop_id?: string | null
          student_id?: string | null
          trip_id: string
        }
        Update: {
          event_type?: string
          id?: string
          latitude?: number | null
          longitude?: number | null
          note?: string | null
          occurred_at?: string
          stop_id?: string | null
          student_id?: string | null
          trip_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "trip_events_stop_id_fkey"
            columns: ["stop_id"]
            isOneToOne: false
            referencedRelation: "route_stops"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "trip_events_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "trip_events_trip_id_fkey"
            columns: ["trip_id"]
            isOneToOne: false
            referencedRelation: "bus_trips"
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
      vehicle_maintenance: {
        Row: {
          bus_id: string
          cost: number | null
          created_at: string
          created_by: string | null
          id: string
          maintenance_type: string
          next_due_date: string | null
          notes: string | null
          provider: string | null
          school_id: string
          service_date: string
          updated_at: string
        }
        Insert: {
          bus_id: string
          cost?: number | null
          created_at?: string
          created_by?: string | null
          id?: string
          maintenance_type: string
          next_due_date?: string | null
          notes?: string | null
          provider?: string | null
          school_id: string
          service_date: string
          updated_at?: string
        }
        Update: {
          bus_id?: string
          cost?: number | null
          created_at?: string
          created_by?: string | null
          id?: string
          maintenance_type?: string
          next_due_date?: string | null
          notes?: string | null
          provider?: string | null
          school_id?: string
          service_date?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "vehicle_maintenance_bus_id_fkey"
            columns: ["bus_id"]
            isOneToOne: false
            referencedRelation: "buses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vehicle_maintenance_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      approve_join_request: {
        Args: { _request_id: string }
        Returns: undefined
      }
      approve_parent: { Args: { _parent_id: string }; Returns: undefined }
      approve_teacher: { Args: { _teacher_id: string }; Returns: undefined }
      assign_school_admin: {
        Args: { _email: string; _school_id: string }
        Returns: undefined
      }
      can_access_school: {
        Args: { _school_id: string; _user_id: string }
        Returns: boolean
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_admin: { Args: { _user_id: string }; Returns: boolean }
      is_admin_of_user: {
        Args: { _admin: string; _target: string }
        Returns: boolean
      }
      is_any_teacher: { Args: { _user_id: string }; Returns: boolean }
      is_parent_of: {
        Args: { _student_id: string; _user_id: string }
        Returns: boolean
      }
      is_platform_admin: { Args: { _user_id: string }; Returns: boolean }
      is_school_admin: {
        Args: { _school_id: string; _user_id: string }
        Returns: boolean
      }
      is_student_self: {
        Args: { _student_id: string; _user_id: string }
        Returns: boolean
      }
      platform_schools: {
        Args: never
        Returns: {
          address: string
          admin_email: string
          admin_profile_id: string
          banner_url: string
          country: string
          created_at: string
          email: string
          id: string
          lga: string
          logo_url: string
          motto: string
          name: string
          phone: string
          primary_color: string
          secondary_color: string
          state: string
        }[]
      }
      reject_join_request: { Args: { _request_id: string }; Returns: undefined }
      reject_parent: { Args: { _parent_id: string }; Returns: undefined }
      reject_teacher: { Args: { _teacher_id: string }; Returns: undefined }
      school_payout_info: {
        Args: { _school_id: string }
        Returns: {
          flw_subaccount_id: string
          name: string
          payout_account_name: string
          payout_account_number: string
          payout_bank_code: string
        }[]
      }
      student_school: { Args: { _student_id: string }; Returns: string }
      teacher_can_see_student: {
        Args: { _student_id: string; _user_id: string }
        Returns: boolean
      }
    }
    Enums: {
      announcement_audience: "all" | "teachers" | "parents" | "students"
      app_role:
        | "super_admin"
        | "class_teacher"
        | "subject_teacher"
        | "parent"
        | "student"
        | "transport_manager"
      approval_status: "pending" | "approved" | "rejected"
      attendance_status: "present" | "absent" | "late"
      gender_type: "male" | "female" | "other"
      join_status: "pending" | "approved" | "rejected"
      teacher_type: "class_teacher" | "subject_teacher"
      term_type: "first" | "second" | "third"
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
      announcement_audience: ["all", "teachers", "parents", "students"],
      app_role: [
        "super_admin",
        "class_teacher",
        "subject_teacher",
        "parent",
        "student",
        "transport_manager",
      ],
      approval_status: ["pending", "approved", "rejected"],
      attendance_status: ["present", "absent", "late"],
      gender_type: ["male", "female", "other"],
      join_status: ["pending", "approved", "rejected"],
      teacher_type: ["class_teacher", "subject_teacher"],
      term_type: ["first", "second", "third"],
    },
  },
} as const
