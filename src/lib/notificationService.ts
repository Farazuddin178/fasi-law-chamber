import { supabase } from './supabase';

export const notificationService = {
  // Store FCM token for user
  async storeFCMToken(userId: string, fcmToken: string) {
    try {
      // Check if token already exists
      const { data: existing } = await supabase
        .from('fcm_tokens')
        .select('id')
        .eq('user_id', userId)
        .eq('token', fcmToken)
        .single();

      if (!existing) {
        const { error } = await supabase
          .from('fcm_tokens')
          .insert({
            user_id: userId,
            token: fcmToken,
            created_at: new Date().toISOString(),
          });

        if (error) console.error('Failed to store FCM token:', error);
      }
    } catch (error) {
      console.error('Error storing FCM token:', error);
    }
  },

  // Get all FCM tokens for a user
  async getFCMTokens(userId: string) {
    try {
      const { data, error } = await supabase
        .from('fcm_tokens')
        .select('token')
        .eq('user_id', userId);

      if (error) throw error;
      return data?.map(t => t.token) || [];
    } catch (error) {
      console.error('Error getting FCM tokens:', error);
      return [];
    }
  },

  // Delete FCM token
  async deleteFCMToken(userId: string, token: string) {
    try {
      const { error } = await supabase
        .from('fcm_tokens')
        .delete()
        .eq('user_id', userId)
        .eq('token', token);

      if (error) throw error;
    } catch (error) {
      console.error('Error deleting FCM token:', error);
    }
  },
};
