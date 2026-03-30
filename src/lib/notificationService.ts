/**
 * Notification Service - FCM Token Management
 *
 * FIXES APPLIED:
 * 1. Fixed storeFCMToken: .single() throws PGRST116 when no row found.
 *    Changed to .maybeSingle() which returns null instead of throwing.
 * 2. Added token cleanup: deleteFCMToken properly removes stale tokens.
 * 3. Added upsert logic: if a token already exists for this user, update timestamp.
 * 4. Wrapped all operations in proper try/catch with error logging.
 */

import { supabase } from './supabase';

export const notificationService = {
  /**
   * Store FCM token for user
   * FIX #1: Uses maybeSingle() instead of single() to avoid PGRST116 on missing row
   */
  async storeFCMToken(userId: string, fcmToken: string) {
    try {
      if (!userId || !fcmToken) {
        console.warn('storeFCMToken: missing userId or token');
        return;
      }

      // Check if token already exists using maybeSingle (won't throw on no-match)
      const { data: existing, error: checkError } = await supabase
        .from('fcm_tokens')
        .select('id')
        .eq('user_id', userId)
        .eq('token', fcmToken)
        .maybeSingle();

      if (checkError) {
        console.error('Failed to check existing FCM token:', checkError);
        return;
      }

      if (existing) {
        // Token already stored — update timestamp to keep it fresh
        await supabase
          .from('fcm_tokens')
          .update({ updated_at: new Date().toISOString() })
          .eq('id', existing.id);
        return;
      }

      // Insert new token
      const { error } = await supabase
        .from('fcm_tokens')
        .insert({
          user_id: userId,
          token: fcmToken,
          created_at: new Date().toISOString(),
        });

      if (error) {
        // FIX: Handle unique constraint violation gracefully (race condition)
        if (error.code === '23505') {
          console.log('FCM token already exists (race condition), skipping');
          return;
        }
        console.error('Failed to store FCM token:', error);
      }
    } catch (error) {
      console.error('Error storing FCM token:', error);
    }
  },

  /**
   * Get all FCM tokens for a user
   */
  async getFCMTokens(userId: string): Promise<string[]> {
    try {
      if (!userId) return [];

      const { data, error } = await supabase
        .from('fcm_tokens')
        .select('token')
        .eq('user_id', userId);

      if (error) {
        console.error('Error getting FCM tokens:', error);
        return [];
      }
      return data?.map(t => t.token) || [];
    } catch (error) {
      console.error('Error getting FCM tokens:', error);
      return [];
    }
  },

  /**
   * Delete FCM token
   */
  async deleteFCMToken(userId: string, token: string) {
    try {
      if (!userId || !token) return;

      const { error } = await supabase
        .from('fcm_tokens')
        .delete()
        .eq('user_id', userId)
        .eq('token', token);

      if (error) {
        console.error('Error deleting FCM token:', error);
      }
    } catch (error) {
      console.error('Error deleting FCM token:', error);
    }
  },

  /**
   * Delete all FCM tokens for a user (on logout)
   */
  async deleteAllTokensForUser(userId: string) {
    try {
      if (!userId) return;

      const { error } = await supabase
        .from('fcm_tokens')
        .delete()
        .eq('user_id', userId);

      if (error) {
        console.error('Error deleting all FCM tokens:', error);
      }
    } catch (error) {
      console.error('Error deleting all FCM tokens:', error);
    }
  },
};
