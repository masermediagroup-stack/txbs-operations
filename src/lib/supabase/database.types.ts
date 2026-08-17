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
      activity_events: {
        Row: {
          activity_type: string
          actor_user_id: string | null
          description: string
          entity_id: string
          entity_type: string
          id: string
          occurred_at: string
          operator_name: string
          project_id: string | null
          site_id: string
        }
        Insert: {
          activity_type: string
          actor_user_id?: string | null
          description: string
          entity_id: string
          entity_type: string
          id?: string
          occurred_at: string
          operator_name: string
          project_id?: string | null
          site_id: string
        }
        Update: {
          activity_type?: string
          actor_user_id?: string | null
          description?: string
          entity_id?: string
          entity_type?: string
          id?: string
          occurred_at?: string
          operator_name?: string
          project_id?: string | null
          site_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "activity_events_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "activity_events_site_id_fkey"
            columns: ["site_id"]
            isOneToOne: false
            referencedRelation: "sites"
            referencedColumns: ["id"]
          },
        ]
      }
      audit_records: {
        Row: {
          action: string
          actor_name: string
          actor_user_id: string | null
          after_state: Json | null
          before_state: Json | null
          command_id: string | null
          entity_id: string | null
          entity_type: string
          id: string
          occurred_at: string
          site_id: string | null
        }
        Insert: {
          action: string
          actor_name: string
          actor_user_id?: string | null
          after_state?: Json | null
          before_state?: Json | null
          command_id?: string | null
          entity_id?: string | null
          entity_type: string
          id?: string
          occurred_at?: string
          site_id?: string | null
        }
        Update: {
          action?: string
          actor_name?: string
          actor_user_id?: string | null
          after_state?: Json | null
          before_state?: Json | null
          command_id?: string | null
          entity_id?: string | null
          entity_type?: string
          id?: string
          occurred_at?: string
          site_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "audit_records_command_id_fkey"
            columns: ["command_id"]
            isOneToOne: false
            referencedRelation: "command_receipts"
            referencedColumns: ["command_id"]
          },
          {
            foreignKeyName: "audit_records_site_id_fkey"
            columns: ["site_id"]
            isOneToOne: false
            referencedRelation: "sites"
            referencedColumns: ["id"]
          },
        ]
      }
      command_receipts: {
        Row: {
          actor_name: string
          actor_user_id: string
          command_id: string
          command_type: string
          command_version: number
          created_at: string
          entity_id: string | null
          result: Json
          site_id: string
        }
        Insert: {
          actor_name: string
          actor_user_id: string
          command_id: string
          command_type: string
          command_version: number
          created_at?: string
          entity_id?: string | null
          result?: Json
          site_id: string
        }
        Update: {
          actor_name?: string
          actor_user_id?: string
          command_id?: string
          command_type?: string
          command_version?: number
          created_at?: string
          entity_id?: string | null
          result?: Json
          site_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "command_receipts_site_id_fkey"
            columns: ["site_id"]
            isOneToOne: false
            referencedRelation: "sites"
            referencedColumns: ["id"]
          },
        ]
      }
      issue_comments: {
        Row: {
          actor_user_id: string | null
          body: string
          created_at: string
          id: string
          issue_id: string
          operator_name: string
        }
        Insert: {
          actor_user_id?: string | null
          body?: string
          created_at: string
          id?: string
          issue_id: string
          operator_name: string
        }
        Update: {
          actor_user_id?: string | null
          body?: string
          created_at?: string
          id?: string
          issue_id?: string
          operator_name?: string
        }
        Relationships: [
          {
            foreignKeyName: "issue_comments_issue_id_fkey"
            columns: ["issue_id"]
            isOneToOne: false
            referencedRelation: "issues"
            referencedColumns: ["id"]
          },
        ]
      }
      issue_transitions: {
        Row: {
          actor_user_id: string | null
          from_status: string | null
          id: string
          issue_id: string
          note: string
          occurred_at: string
          operator_name: string
          to_status: string
          transition_kind: string
        }
        Insert: {
          actor_user_id?: string | null
          from_status?: string | null
          id?: string
          issue_id: string
          note: string
          occurred_at: string
          operator_name: string
          to_status: string
          transition_kind: string
        }
        Update: {
          actor_user_id?: string | null
          from_status?: string | null
          id?: string
          issue_id?: string
          note?: string
          occurred_at?: string
          operator_name?: string
          to_status?: string
          transition_kind?: string
        }
        Relationships: [
          {
            foreignKeyName: "issue_transitions_issue_id_fkey"
            columns: ["issue_id"]
            isOneToOne: false
            referencedRelation: "issues"
            referencedColumns: ["id"]
          },
        ]
      }
      issues: {
        Row: {
          actor_user_id: string | null
          assignee_name: string | null
          assignee_user_id: string | null
          blocking: boolean
          created_at: string
          description: string
          id: string
          idempotency_key: string
          issue_type: string
          location_id: string | null
          lot_id: string | null
          movement_id: string | null
          operator_name: string
          outbound_batch_id: string | null
          priority: string
          project_id: string | null
          receipt_id: string | null
          resolution_note: string | null
          site_id: string
          status: string
          title: string
          updated_at: string
          version: number
        }
        Insert: {
          actor_user_id?: string | null
          assignee_name?: string | null
          assignee_user_id?: string | null
          blocking?: boolean
          created_at: string
          description?: string
          id?: string
          idempotency_key: string
          issue_type: string
          location_id?: string | null
          lot_id?: string | null
          movement_id?: string | null
          operator_name: string
          outbound_batch_id?: string | null
          priority: string
          project_id?: string | null
          receipt_id?: string | null
          resolution_note?: string | null
          site_id: string
          status: string
          title: string
          updated_at: string
          version?: number
        }
        Update: {
          actor_user_id?: string | null
          assignee_name?: string | null
          assignee_user_id?: string | null
          blocking?: boolean
          created_at?: string
          description?: string
          id?: string
          idempotency_key?: string
          issue_type?: string
          location_id?: string | null
          lot_id?: string | null
          movement_id?: string | null
          operator_name?: string
          outbound_batch_id?: string | null
          priority?: string
          project_id?: string | null
          receipt_id?: string | null
          resolution_note?: string | null
          site_id?: string
          status?: string
          title?: string
          updated_at?: string
          version?: number
        }
        Relationships: [
          {
            foreignKeyName: "issues_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "storage_locations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "issues_lot_id_fkey"
            columns: ["lot_id"]
            isOneToOne: false
            referencedRelation: "material_lots"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "issues_movement_id_fkey"
            columns: ["movement_id"]
            isOneToOne: false
            referencedRelation: "material_movements"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "issues_outbound_batch_id_fkey"
            columns: ["outbound_batch_id"]
            isOneToOne: false
            referencedRelation: "outbound_batches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "issues_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "issues_receipt_id_fkey"
            columns: ["receipt_id"]
            isOneToOne: false
            referencedRelation: "receipts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "issues_site_id_fkey"
            columns: ["site_id"]
            isOneToOne: false
            referencedRelation: "sites"
            referencedColumns: ["id"]
          },
        ]
      }
      material_groups: {
        Row: {
          description: string
          id: string
          name: string
          project_id: string
        }
        Insert: {
          description?: string
          id?: string
          name: string
          project_id: string
        }
        Update: {
          description?: string
          id?: string
          name?: string
          project_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "material_groups_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      material_lots: {
        Row: {
          accessibility: string
          condition: string
          created_at: string
          group_id: string
          handling_requirements: string[]
          id: string
          location_id: string | null
          migration_note: string | null
          package_type: string
          parent_lot_id: string | null
          position_column: string | null
          position_note: string
          position_precision: string
          position_row: string | null
          presence: string
          project_id: string
          protection: string
          quantity: number | null
          root_lot_id: string
          site_id: string
          updated_at: string
          version: number
        }
        Insert: {
          accessibility: string
          condition: string
          created_at: string
          group_id: string
          handling_requirements?: string[]
          id?: string
          location_id?: string | null
          migration_note?: string | null
          package_type: string
          parent_lot_id?: string | null
          position_column?: string | null
          position_note?: string
          position_precision?: string
          position_row?: string | null
          presence: string
          project_id: string
          protection: string
          quantity?: number | null
          root_lot_id: string
          site_id: string
          updated_at: string
          version?: number
        }
        Update: {
          accessibility?: string
          condition?: string
          created_at?: string
          group_id?: string
          handling_requirements?: string[]
          id?: string
          location_id?: string | null
          migration_note?: string | null
          package_type?: string
          parent_lot_id?: string | null
          position_column?: string | null
          position_note?: string
          position_precision?: string
          position_row?: string | null
          presence?: string
          project_id?: string
          protection?: string
          quantity?: number | null
          root_lot_id?: string
          site_id?: string
          updated_at?: string
          version?: number
        }
        Relationships: [
          {
            foreignKeyName: "material_lots_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "material_groups"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "material_lots_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "storage_locations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "material_lots_parent_lot_id_fkey"
            columns: ["parent_lot_id"]
            isOneToOne: false
            referencedRelation: "material_lots"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "material_lots_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "material_lots_root_lot_fkey"
            columns: ["root_lot_id"]
            isOneToOne: false
            referencedRelation: "material_lots"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "material_lots_site_id_fkey"
            columns: ["site_id"]
            isOneToOne: false
            referencedRelation: "sites"
            referencedColumns: ["id"]
          },
        ]
      }
      material_movements: {
        Row: {
          actor_user_id: string | null
          client_mutation_id: string
          id: string
          movement_kind: string
          note: string
          occurred_at: string
          operator_name: string
          reason: string
          reversal_of_movement_id: string | null
          site_id: string
        }
        Insert: {
          actor_user_id?: string | null
          client_mutation_id: string
          id?: string
          movement_kind: string
          note?: string
          occurred_at: string
          operator_name: string
          reason: string
          reversal_of_movement_id?: string | null
          site_id: string
        }
        Update: {
          actor_user_id?: string | null
          client_mutation_id?: string
          id?: string
          movement_kind?: string
          note?: string
          occurred_at?: string
          operator_name?: string
          reason?: string
          reversal_of_movement_id?: string | null
          site_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "material_movements_reversal_of_movement_id_fkey"
            columns: ["reversal_of_movement_id"]
            isOneToOne: false
            referencedRelation: "material_movements"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "material_movements_site_id_fkey"
            columns: ["site_id"]
            isOneToOne: false
            referencedRelation: "sites"
            referencedColumns: ["id"]
          },
        ]
      }
      movement_lines: {
        Row: {
          destination_location_id: string | null
          destination_position_column: string | null
          destination_position_note: string
          destination_position_precision: string
          destination_position_row: string | null
          id: string
          movement_id: string
          quantity: number | null
          resulting_lot_id: string
          resulting_lot_version: number
          source_location_id: string | null
          source_lot_id: string
          source_position_column: string | null
          source_position_note: string
          source_position_precision: string
          source_position_row: string | null
        }
        Insert: {
          destination_location_id?: string | null
          destination_position_column?: string | null
          destination_position_note?: string
          destination_position_precision: string
          destination_position_row?: string | null
          id?: string
          movement_id: string
          quantity?: number | null
          resulting_lot_id: string
          resulting_lot_version: number
          source_location_id?: string | null
          source_lot_id: string
          source_position_column?: string | null
          source_position_note?: string
          source_position_precision: string
          source_position_row?: string | null
        }
        Update: {
          destination_location_id?: string | null
          destination_position_column?: string | null
          destination_position_note?: string
          destination_position_precision?: string
          destination_position_row?: string | null
          id?: string
          movement_id?: string
          quantity?: number | null
          resulting_lot_id?: string
          resulting_lot_version?: number
          source_location_id?: string | null
          source_lot_id?: string
          source_position_column?: string | null
          source_position_note?: string
          source_position_precision?: string
          source_position_row?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "movement_lines_destination_location_id_fkey"
            columns: ["destination_location_id"]
            isOneToOne: false
            referencedRelation: "storage_locations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "movement_lines_movement_id_fkey"
            columns: ["movement_id"]
            isOneToOne: false
            referencedRelation: "material_movements"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "movement_lines_resulting_lot_id_fkey"
            columns: ["resulting_lot_id"]
            isOneToOne: false
            referencedRelation: "material_lots"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "movement_lines_source_location_id_fkey"
            columns: ["source_location_id"]
            isOneToOne: false
            referencedRelation: "storage_locations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "movement_lines_source_lot_id_fkey"
            columns: ["source_lot_id"]
            isOneToOne: false
            referencedRelation: "material_lots"
            referencedColumns: ["id"]
          },
        ]
      }
      outbound_batches: {
        Row: {
          actor_user_id: string | null
          cancelled_at: string | null
          carrier_reference: string
          client_mutation_id: string
          departed_at: string | null
          driver_reference: string
          id: string
          note: string
          operator_name: string
          planned_at: string
          project_id: string
          ready_at: string | null
          reversal_of_batch_id: string | null
          reversed_at: string | null
          site_id: string
          state: string
          version: number
        }
        Insert: {
          actor_user_id?: string | null
          cancelled_at?: string | null
          carrier_reference?: string
          client_mutation_id: string
          departed_at?: string | null
          driver_reference?: string
          id?: string
          note?: string
          operator_name: string
          planned_at: string
          project_id: string
          ready_at?: string | null
          reversal_of_batch_id?: string | null
          reversed_at?: string | null
          site_id: string
          state: string
          version?: number
        }
        Update: {
          actor_user_id?: string | null
          cancelled_at?: string | null
          carrier_reference?: string
          client_mutation_id?: string
          departed_at?: string | null
          driver_reference?: string
          id?: string
          note?: string
          operator_name?: string
          planned_at?: string
          project_id?: string
          ready_at?: string | null
          reversal_of_batch_id?: string | null
          reversed_at?: string | null
          site_id?: string
          state?: string
          version?: number
        }
        Relationships: [
          {
            foreignKeyName: "outbound_batches_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "outbound_batches_reversal_of_batch_id_fkey"
            columns: ["reversal_of_batch_id"]
            isOneToOne: false
            referencedRelation: "outbound_batches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "outbound_batches_site_id_fkey"
            columns: ["site_id"]
            isOneToOne: false
            referencedRelation: "sites"
            referencedColumns: ["id"]
          },
        ]
      }
      outbound_lines: {
        Row: {
          batch_id: string
          handling_requirements: string[]
          id: string
          material_name: string
          package_type: string
          quantity: number | null
          resulting_lot_id: string | null
          resulting_lot_version: number | null
          source_location_id: string | null
          source_lot_id: string
          source_lot_version: number
          source_position_column: string | null
          source_position_note: string
          source_position_precision: string
          source_position_row: string | null
        }
        Insert: {
          batch_id: string
          handling_requirements?: string[]
          id?: string
          material_name: string
          package_type: string
          quantity?: number | null
          resulting_lot_id?: string | null
          resulting_lot_version?: number | null
          source_location_id?: string | null
          source_lot_id: string
          source_lot_version: number
          source_position_column?: string | null
          source_position_note?: string
          source_position_precision: string
          source_position_row?: string | null
        }
        Update: {
          batch_id?: string
          handling_requirements?: string[]
          id?: string
          material_name?: string
          package_type?: string
          quantity?: number | null
          resulting_lot_id?: string | null
          resulting_lot_version?: number | null
          source_location_id?: string | null
          source_lot_id?: string
          source_lot_version?: number
          source_position_column?: string | null
          source_position_note?: string
          source_position_precision?: string
          source_position_row?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "outbound_lines_batch_id_fkey"
            columns: ["batch_id"]
            isOneToOne: false
            referencedRelation: "outbound_batches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "outbound_lines_resulting_lot_id_fkey"
            columns: ["resulting_lot_id"]
            isOneToOne: false
            referencedRelation: "material_lots"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "outbound_lines_source_location_id_fkey"
            columns: ["source_location_id"]
            isOneToOne: false
            referencedRelation: "storage_locations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "outbound_lines_source_lot_id_fkey"
            columns: ["source_lot_id"]
            isOneToOne: false
            referencedRelation: "material_lots"
            referencedColumns: ["id"]
          },
        ]
      }
      photos: {
        Row: {
          actor_user_id: string | null
          bucket_id: string
          caption: string
          checksum_sha256: string | null
          content_type: string
          file_name: string
          id: string
          issue_comment_id: string | null
          issue_id: string | null
          location_id: string | null
          lot_id: string | null
          movement_id: string | null
          object_path: string
          operator_name: string
          outbound_batch_id: string | null
          photo_type: string
          project_id: string | null
          receipt_id: string | null
          receipt_line_id: string | null
          site_id: string
          size_bytes: number | null
          taken_at: string
          uploaded_at: string
        }
        Insert: {
          actor_user_id?: string | null
          bucket_id?: string
          caption?: string
          checksum_sha256?: string | null
          content_type: string
          file_name: string
          id?: string
          issue_comment_id?: string | null
          issue_id?: string | null
          location_id?: string | null
          lot_id?: string | null
          movement_id?: string | null
          object_path: string
          operator_name: string
          outbound_batch_id?: string | null
          photo_type: string
          project_id?: string | null
          receipt_id?: string | null
          receipt_line_id?: string | null
          site_id: string
          size_bytes?: number | null
          taken_at: string
          uploaded_at: string
        }
        Update: {
          actor_user_id?: string | null
          bucket_id?: string
          caption?: string
          checksum_sha256?: string | null
          content_type?: string
          file_name?: string
          id?: string
          issue_comment_id?: string | null
          issue_id?: string | null
          location_id?: string | null
          lot_id?: string | null
          movement_id?: string | null
          object_path?: string
          operator_name?: string
          outbound_batch_id?: string | null
          photo_type?: string
          project_id?: string | null
          receipt_id?: string | null
          receipt_line_id?: string | null
          site_id?: string
          size_bytes?: number | null
          taken_at?: string
          uploaded_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "photos_issue_comment_id_fkey"
            columns: ["issue_comment_id"]
            isOneToOne: false
            referencedRelation: "issue_comments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "photos_issue_id_fkey"
            columns: ["issue_id"]
            isOneToOne: false
            referencedRelation: "issues"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "photos_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "storage_locations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "photos_lot_id_fkey"
            columns: ["lot_id"]
            isOneToOne: false
            referencedRelation: "material_lots"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "photos_movement_id_fkey"
            columns: ["movement_id"]
            isOneToOne: false
            referencedRelation: "material_movements"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "photos_outbound_batch_id_fkey"
            columns: ["outbound_batch_id"]
            isOneToOne: false
            referencedRelation: "outbound_batches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "photos_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "photos_receipt_id_fkey"
            columns: ["receipt_id"]
            isOneToOne: false
            referencedRelation: "receipts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "photos_receipt_line_id_fkey"
            columns: ["receipt_line_id"]
            isOneToOne: false
            referencedRelation: "receipt_lines"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "photos_site_id_fkey"
            columns: ["site_id"]
            isOneToOne: false
            referencedRelation: "sites"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          active: boolean
          created_at: string
          display_name: string
          email: string
          id: string
          system_role: Database["public"]["Enums"]["app_role"]
          updated_at: string
        }
        Insert: {
          active?: boolean
          created_at?: string
          display_name: string
          email: string
          id: string
          system_role?: Database["public"]["Enums"]["app_role"]
          updated_at?: string
        }
        Update: {
          active?: boolean
          created_at?: string
          display_name?: string
          email?: string
          id?: string
          system_role?: Database["public"]["Enums"]["app_role"]
          updated_at?: string
        }
        Relationships: []
      }
      project_aliases: {
        Row: {
          alias_type: string
          id: string
          project_id: string
          value: string
        }
        Insert: {
          alias_type: string
          id?: string
          project_id: string
          value: string
        }
        Update: {
          alias_type?: string
          id?: string
          project_id?: string
          value?: string
        }
        Relationships: [
          {
            foreignKeyName: "project_aliases_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      project_notes: {
        Row: {
          display_order: number
          id: string
          note: string
          project_id: string
        }
        Insert: {
          display_order?: number
          id?: string
          note: string
          project_id: string
        }
        Update: {
          display_order?: number
          id?: string
          note?: string
          project_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "project_notes_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      project_purchase_orders: {
        Row: {
          id: string
          project_id: string
          purchase_order: string
        }
        Insert: {
          id?: string
          project_id: string
          purchase_order: string
        }
        Update: {
          id?: string
          project_id?: string
          purchase_order?: string
        }
        Relationships: [
          {
            foreignKeyName: "project_purchase_orders_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      projects: {
        Row: {
          created_at: string
          id: string
          job_number: string
          name: string
          site_id: string
          slug: string
          status: string
          updated_at: string
          version: number
        }
        Insert: {
          created_at: string
          id?: string
          job_number?: string
          name: string
          site_id: string
          slug: string
          status: string
          updated_at: string
          version?: number
        }
        Update: {
          created_at?: string
          id?: string
          job_number?: string
          name?: string
          site_id?: string
          slug?: string
          status?: string
          updated_at?: string
          version?: number
        }
        Relationships: [
          {
            foreignKeyName: "projects_site_id_fkey"
            columns: ["site_id"]
            isOneToOne: false
            referencedRelation: "sites"
            referencedColumns: ["id"]
          },
        ]
      }
      receipt_lines: {
        Row: {
          accessibility: string
          active: boolean
          condition: string
          description: string
          handling_requirements: string[]
          id: string
          material_name: string
          package_type: string
          protection: string
          quantity: number | null
          receipt_id: string
          target_location_id: string | null
        }
        Insert: {
          accessibility: string
          active?: boolean
          condition: string
          description?: string
          handling_requirements?: string[]
          id?: string
          material_name: string
          package_type: string
          protection: string
          quantity?: number | null
          receipt_id: string
          target_location_id?: string | null
        }
        Update: {
          accessibility?: string
          active?: boolean
          condition?: string
          description?: string
          handling_requirements?: string[]
          id?: string
          material_name?: string
          package_type?: string
          protection?: string
          quantity?: number | null
          receipt_id?: string
          target_location_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "receipt_lines_receipt_id_fkey"
            columns: ["receipt_id"]
            isOneToOne: false
            referencedRelation: "receipts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "receipt_lines_target_location_id_fkey"
            columns: ["target_location_id"]
            isOneToOne: false
            referencedRelation: "storage_locations"
            referencedColumns: ["id"]
          },
        ]
      }
      receipts: {
        Row: {
          actor_user_id: string | null
          completed_at: string | null
          created_at: string
          handwritten_project_text: string
          id: string
          identity_state: string
          inspection_state: string
          notes: string
          operator_name: string
          physical_label_applied: boolean
          project_id: string | null
          receipt_number: string
          site_id: string
          staging_location_id: string | null
          status: string
          updated_at: string
          version: number
        }
        Insert: {
          actor_user_id?: string | null
          completed_at?: string | null
          created_at: string
          handwritten_project_text?: string
          id?: string
          identity_state: string
          inspection_state: string
          notes?: string
          operator_name: string
          physical_label_applied?: boolean
          project_id?: string | null
          receipt_number?: string
          site_id: string
          staging_location_id?: string | null
          status: string
          updated_at: string
          version?: number
        }
        Update: {
          actor_user_id?: string | null
          completed_at?: string | null
          created_at?: string
          handwritten_project_text?: string
          id?: string
          identity_state?: string
          inspection_state?: string
          notes?: string
          operator_name?: string
          physical_label_applied?: boolean
          project_id?: string | null
          receipt_number?: string
          site_id?: string
          staging_location_id?: string | null
          status?: string
          updated_at?: string
          version?: number
        }
        Relationships: [
          {
            foreignKeyName: "receipts_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "receipts_site_id_fkey"
            columns: ["site_id"]
            isOneToOne: false
            referencedRelation: "sites"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "receipts_staging_location_id_fkey"
            columns: ["staging_location_id"]
            isOneToOne: false
            referencedRelation: "storage_locations"
            referencedColumns: ["id"]
          },
        ]
      }
      site_memberships: {
        Row: {
          active: boolean
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          site_id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          active?: boolean
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          site_id: string
          updated_at?: string
          user_id: string
        }
        Update: {
          active?: boolean
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          site_id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "site_memberships_site_id_fkey"
            columns: ["site_id"]
            isOneToOne: false
            referencedRelation: "sites"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "site_memberships_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      sites: {
        Row: {
          active: boolean
          created_at: string
          id: string
          name: string
          slug: string
          updated_at: string
        }
        Insert: {
          active?: boolean
          created_at?: string
          id?: string
          name: string
          slug: string
          updated_at?: string
        }
        Update: {
          active?: boolean
          created_at?: string
          id?: string
          name?: string
          slug?: string
          updated_at?: string
        }
        Relationships: []
      }
      staged_uploads: {
        Row: {
          actor_user_id: string
          bucket_id: string
          checksum_sha256: string | null
          command_id: string
          consumed_at: string | null
          content_type: string
          created_at: string
          id: string
          object_path: string
          site_id: string
          size_bytes: number
        }
        Insert: {
          actor_user_id: string
          bucket_id?: string
          checksum_sha256?: string | null
          command_id: string
          consumed_at?: string | null
          content_type: string
          created_at?: string
          id?: string
          object_path: string
          site_id: string
          size_bytes: number
        }
        Update: {
          actor_user_id?: string
          bucket_id?: string
          checksum_sha256?: string | null
          command_id?: string
          consumed_at?: string | null
          content_type?: string
          created_at?: string
          id?: string
          object_path?: string
          site_id?: string
          size_bytes?: number
        }
        Relationships: [
          {
            foreignKeyName: "staged_uploads_site_id_fkey"
            columns: ["site_id"]
            isOneToOne: false
            referencedRelation: "sites"
            referencedColumns: ["id"]
          },
        ]
      }
      storage_locations: {
        Row: {
          active: boolean
          created_at: string
          id: string
          location_type: string
          name: string
          notes: string
          parent_location_id: string | null
          site_id: string
          slug: string
          updated_at: string
          zone: string
        }
        Insert: {
          active?: boolean
          created_at?: string
          id?: string
          location_type: string
          name: string
          notes?: string
          parent_location_id?: string | null
          site_id: string
          slug: string
          updated_at?: string
          zone?: string
        }
        Update: {
          active?: boolean
          created_at?: string
          id?: string
          location_type?: string
          name?: string
          notes?: string
          parent_location_id?: string | null
          site_id?: string
          slug?: string
          updated_at?: string
          zone?: string
        }
        Relationships: [
          {
            foreignKeyName: "storage_locations_parent_location_id_fkey"
            columns: ["parent_location_id"]
            isOneToOne: false
            referencedRelation: "storage_locations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "storage_locations_site_id_fkey"
            columns: ["site_id"]
            isOneToOne: false
            referencedRelation: "sites"
            referencedColumns: ["id"]
          },
        ]
      }
      verification_photos: {
        Row: {
          photo_id: string
          verification_id: string
        }
        Insert: {
          photo_id: string
          verification_id: string
        }
        Update: {
          photo_id?: string
          verification_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "verification_photos_photo_id_fkey"
            columns: ["photo_id"]
            isOneToOne: false
            referencedRelation: "photos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "verification_photos_verification_id_fkey"
            columns: ["verification_id"]
            isOneToOne: false
            referencedRelation: "verification_records"
            referencedColumns: ["id"]
          },
        ]
      }
      verification_records: {
        Row: {
          actor_user_id: string | null
          id: string
          location_id: string | null
          lot_id: string
          note: string
          operator_name: string
          position_column: string | null
          position_note: string
          position_precision: string
          position_row: string | null
          verified_at: string
        }
        Insert: {
          actor_user_id?: string | null
          id?: string
          location_id?: string | null
          lot_id: string
          note?: string
          operator_name: string
          position_column?: string | null
          position_note?: string
          position_precision: string
          position_row?: string | null
          verified_at: string
        }
        Update: {
          actor_user_id?: string | null
          id?: string
          location_id?: string | null
          lot_id?: string
          note?: string
          operator_name?: string
          position_column?: string | null
          position_note?: string
          position_precision?: string
          position_row?: string | null
          verified_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "verification_records_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "storage_locations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "verification_records_lot_id_fkey"
            columns: ["lot_id"]
            isOneToOne: false
            referencedRelation: "material_lots"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      admin_configure_profile_v1: {
        Args: {
          p_active: boolean
          p_display_name: string
          p_role: Database["public"]["Enums"]["app_role"]
          p_site_id?: string | null
          p_user_id: string
        }
        Returns: Json
      }
      execute_inventory_command_v1: {
        Args: {
          p_command_id: string
          p_command_type: string
          p_payload: Json
          p_site_id: string
        }
        Returns: Json
      }
    }
    Enums: {
      app_role: "Operator" | "Manager" | "Administrator" | "Tech"
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
      app_role: ["Operator", "Manager", "Administrator", "Tech"],
    },
  },
} as const
