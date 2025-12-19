/**
 * Studio Code Service
 *
 * Handles assignment of single-letter codes (A, B, C, etc.) to studios
 * when their reservations are approved for scheduling anonymity.
 *
 * Business Rules:
 * - Codes assigned on reservation approval in chronological order
 * - Single letter: A, B, C, D, E, F, etc.
 * - One code per studio per competition
 * - Codes are permanent once assigned (no reassignment)
 */

import { createServerSupabaseClient } from '@/lib/supabase-server-client';

export interface StudioCodeAssignment {
  studioId: string;
  studioCode: string;
  assignedAt: Date;
}

export class StudioCodeService {
  /**
   * Assigns a studio code when a reservation is approved
   * @param competitionId - The competition ID
   * @param reservationId - The reservation being approved
   * @param studioId - The studio to assign a code to
   * @param tenantId - The tenant ID for isolation
   * @returns The assigned studio code
   */
  static async assignStudioCode(
    competitionId: string,
    reservationId: string,
    studioId: string,
    tenantId: string
  ): Promise<string> {
    const supabase = await createServerSupabaseClient();

    // Check if studio already has a code for this competition
    const { data: existingCode } = await supabase
      .from('studios')
      .select('studio_code')
      .eq('id', studioId)
      .eq('tenant_id', tenantId)
      .single();

    if (existingCode?.studio_code) {
      return existingCode.studio_code;
    }

    // Get all approved reservations for this competition (ordered by approval time)
    const { data: approvedReservations, error } = await supabase
      .from('reservations')
      .select('id, studio_id, approved_at')
      .eq('competition_id', competitionId)
      .eq('tenant_id', tenantId)
      .eq('status', 'approved')
      .not('approved_at', 'is', null)
      .order('approved_at', { ascending: true });

    if (error) {
      throw new Error(`Failed to fetch approved reservations: ${error.message}`);
    }

    // Find the position of this studio in the approval order
    const position = approvedReservations?.findIndex((r) => r.studio_id === studioId) ?? -1;

    if (position === -1) {
      throw new Error('Studio not found in approved reservations');
    }

    // Generate letter code (A=0, B=1, C=2, etc.)
    const studioCode = String.fromCharCode(65 + position); // 65 = 'A' in ASCII

    // Update studios table with assigned code
    const { error: updateStudioError } = await supabase
      .from('studios')
      .update({ studio_code: studioCode })
      .eq('id', studioId)
      .eq('tenant_id', tenantId);

    if (updateStudioError) {
      throw new Error(`Failed to update studio code: ${updateStudioError.message}`);
    }

    // Update reservations table with assignment timestamp
    const { error: updateReservationError } = await supabase
      .from('reservations')
      .update({ studio_code_assigned_at: new Date().toISOString() })
      .eq('id', reservationId)
      .eq('tenant_id', tenantId);

    if (updateReservationError) {
      throw new Error(`Failed to update reservation: ${updateReservationError.message}`);
    }

    return studioCode;
  }

  /**
   * Gets all studio codes for a competition
   * @param competitionId - The competition ID
   * @param tenantId - The tenant ID for isolation
   * @returns Array of studio code assignments
   */
  static async getStudioCodes(
    competitionId: string,
    tenantId: string
  ): Promise<StudioCodeAssignment[]> {
    const supabase = await createServerSupabaseClient();

    const { data, error } = await supabase
      .from('reservations')
      .select(`
        id,
        studio_id,
        studio_code_assigned_at,
        studios!inner(studio_code)
      `)
      .eq('competition_id', competitionId)
      .eq('tenant_id', tenantId)
      .eq('status', 'approved')
      .not('studio_code_assigned_at', 'is', null)
      .order('studio_code_assigned_at', { ascending: true });

    if (error) {
      throw new Error(`Failed to fetch studio codes: ${error.message}`);
    }

    return (data || []).map((r: any) => ({
      studioId: r.studio_id,
      studioCode: r.studios.studio_code,
      assignedAt: new Date(r.studio_code_assigned_at),
    }));
  }

  /**
   * Gets the studio code for a specific studio in a competition
   * @param studioId - The studio ID
   * @param tenantId - The tenant ID for isolation
   * @returns The studio code or null if not assigned
   */
  static async getStudioCodeForStudio(
    studioId: string,
    tenantId: string
  ): Promise<string | null> {
    const supabase = await createServerSupabaseClient();

    const { data, error } = await supabase
      .from('studios')
      .select('studio_code')
      .eq('id', studioId)
      .eq('tenant_id', tenantId)
      .single();

    if (error || !data) {
      return null;
    }

    return data.studio_code;
  }
}
