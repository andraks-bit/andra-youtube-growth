export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[]

export type BoatType = 'motor_yacht' | 'catamaran' | 'sailing' | 'speedboat' | 'fishing' | 'rib' | 'luxury' | 'jet_ski' | 'jet_car' | 'gulet'
export type PricingType = 'hourly' | 'daily'
export type Season = 'all' | 'peak' | 'shoulder' | 'off'
export type AvailabilityStatus = 'available' | 'blocked' | 'booked'
export type BookingStatus = 'pending' | 'confirmed' | 'cancelled' | 'completed'
export type CancellationPolicy = 'flexible' | 'moderate' | 'strict'
export type ListingStatus = 'draft' | 'active' | 'paused'
export type ReviewType = 'renter_review' | 'host_review'

// ─── Row types (standalone, no circular refs) ─────────────────────────────────

export interface ProfileRow {
  id: string
  full_name: string | null
  avatar_url: string | null
  bio: string | null
  stripe_account_id: string | null
  stripe_customer_id: string | null
  host_since: string | null
  auto_reply_enabled?: boolean // migration 007 — instant AI replies to guest messages
  created_at: string
  updated_at: string
}
export interface LocationRow {
  id: string
  slug: string
  name: string
  city: string
  country: string
  country_code: string
  lat: number
  lng: number
  description: string | null
  image_url: string | null
  is_featured: boolean
  created_at: string
}
export interface BoatRow {
  id: string
  host_id: string
  location_id: string
  slug: string
  name: string
  tagline: string | null
  description: string | null
  type: BoatType
  length_m: number | null
  capacity_pax: number
  cabins: number | null
  bathrooms: number | null
  builder: string | null
  model_year: number | null
  departure_port: string | null
  marina_lat: number | null
  marina_lng: number | null
  includes_skipper: boolean
  includes_fuel: boolean
  includes_drinks: boolean
  min_hours: number
  pricing_type: PricingType
  instant_book: boolean
  cancellation_policy: CancellationPolicy
  status: ListingStatus
  created_at: string
  updated_at: string
}
export interface BoatPricingRow {
  id: string
  boat_id: string
  duration_hours: number | null
  duration_days: number | null
  price: number
  currency: string
  season: Season
  valid_from: string | null
  valid_until: string | null
}
export interface BoatImageRow {
  id: string
  boat_id: string
  storage_url: string
  alt: string | null
  sort_order: number
  is_hero: boolean
  // Added by migration 002 — optional here since a fresh env may not have it
  // applied yet (column-tolerant, same pattern as is_boat_tour).
  media_type?: 'image' | 'video'
  video_url?: string | null
}
export interface BoatFeatureRow {
  id: string
  boat_id: string
  feature: string
}
export interface AvailabilityRow {
  id: string
  boat_id: string
  date: string
  status: AvailabilityStatus
}
export interface BookingRow {
  id: string
  boat_id: string
  renter_id: string
  start_datetime: string
  end_datetime: string
  duration_hours: number | null
  guests_count: number
  subtotal: number
  service_fee: number
  total: number
  currency: string
  status: BookingStatus
  stripe_payment_intent_id: string | null
  special_requests: string | null
  created_at: string
  updated_at: string
}
export interface ReviewRow {
  id: string
  booking_id: string
  reviewer_id: string
  reviewee_id: string
  boat_id: string
  rating: number
  body: string | null
  type: ReviewType
  created_at: string
}
export interface ConversationRow {
  id: string
  boat_id: string | null
  booking_id: string | null
  participant_ids: string[]
  created_at: string
  updated_at: string
}
export interface MessageRow {
  id: string
  conversation_id: string
  sender_id: string
  body: string
  read_at: string | null
  created_at: string
}
export interface WishlistRow {
  id: string
  user_id: string
  boat_id: string
  created_at: string
}
// Migration 007 — per-booking payout ledger written by /api/cron/payouts.
export interface PayoutRow {
  id: string
  booking_id: string
  host_id: string
  amount: number
  currency: string
  method: 'stripe_destination' | 'stripe_transfer' | 'manual_bank' | 'none'
  status: 'due' | 'processing' | 'paid' | 'failed'
  stripe_transfer_id: string | null
  error: string | null
  created_at: string
  paid_at: string | null
}

// ─── Supabase Database (v2 format with Relationships) ────────────────────────

type NoRelationships = { Relationships: [] }

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: ProfileRow
        Insert: Omit<ProfileRow, 'created_at' | 'updated_at'>
        Update: Partial<Omit<ProfileRow, 'id' | 'created_at' | 'updated_at'>>
      } & NoRelationships
      locations: {
        Row: LocationRow
        Insert: Omit<LocationRow, 'id' | 'created_at'>
        Update: Partial<Omit<LocationRow, 'id' | 'created_at'>>
      } & NoRelationships
      boats: {
        Row: BoatRow
        Insert: Omit<BoatRow, 'id' | 'created_at' | 'updated_at'>
        Update: Partial<Omit<BoatRow, 'id' | 'created_at' | 'updated_at'>>
      } & NoRelationships
      boat_pricing: {
        Row: BoatPricingRow
        Insert: Omit<BoatPricingRow, 'id'>
        Update: Partial<Omit<BoatPricingRow, 'id'>>
      } & NoRelationships
      boat_images: {
        Row: BoatImageRow
        Insert: Omit<BoatImageRow, 'id'>
        Update: Partial<Omit<BoatImageRow, 'id'>>
      } & NoRelationships
      boat_features: {
        Row: BoatFeatureRow
        Insert: Omit<BoatFeatureRow, 'id'>
        Update: Partial<Omit<BoatFeatureRow, 'id'>>
      } & NoRelationships
      availability: {
        Row: AvailabilityRow
        Insert: Omit<AvailabilityRow, 'id'>
        Update: Partial<Omit<AvailabilityRow, 'id'>>
      } & NoRelationships
      bookings: {
        Row: BookingRow
        Insert: Omit<BookingRow, 'id' | 'created_at' | 'updated_at'>
        Update: Partial<Omit<BookingRow, 'id' | 'created_at' | 'updated_at'>>
      } & NoRelationships
      reviews: {
        Row: ReviewRow
        Insert: Omit<ReviewRow, 'id' | 'created_at'>
        Update: Partial<Omit<ReviewRow, 'id' | 'created_at'>>
      } & NoRelationships
      conversations: {
        Row: ConversationRow
        Insert: Omit<ConversationRow, 'id' | 'created_at' | 'updated_at'>
        Update: Partial<Omit<ConversationRow, 'id' | 'created_at' | 'updated_at'>>
      } & NoRelationships
      messages: {
        Row: MessageRow
        Insert: Omit<MessageRow, 'id' | 'created_at'>
        Update: Partial<Omit<MessageRow, 'id' | 'created_at'>>
      } & NoRelationships
      wishlists: {
        Row: WishlistRow
        Insert: Omit<WishlistRow, 'id' | 'created_at'>
        Update: Partial<Omit<WishlistRow, 'id' | 'created_at'>>
      } & NoRelationships
      payouts: {
        Row: PayoutRow
        Insert: Omit<PayoutRow, 'id' | 'created_at'>
        Update: Partial<Omit<PayoutRow, 'id' | 'created_at'>>
      } & NoRelationships
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

// ─── Convenience joined types ─────────────────────────────────────────────────

export type Boat = BoatRow
export type BoatWithDetails = BoatRow & {
  boat_images: BoatImageRow[]
  boat_pricing: BoatPricingRow[]
  boat_features: BoatFeatureRow[]
  locations: LocationRow
  profiles: Pick<ProfileRow, 'id' | 'full_name' | 'avatar_url'>
  avg_rating?: number
  review_count?: number
}
export type Location = LocationRow
export type Booking = BookingRow
export type Review = ReviewRow
export type Profile = ProfileRow
export type Message = MessageRow
export type Conversation = ConversationRow
