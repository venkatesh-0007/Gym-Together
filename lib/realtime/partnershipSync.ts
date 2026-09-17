import { supabase } from '../supabase/client';
import { UserProfile } from '../types/account';

/**
 * Fetches the user profile by buddy code.
 */
export async function getProfileByBuddyCode(buddyCode: string): Promise<UserProfile | null> {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('buddy_code', buddyCode)
    .single();

  if (error || !data) return null;

  return {
    id: data.id,
    name: data.name,
    username: data.username,
    email: data.email,
    avatar: data.avatar || '⚡',
    bio: data.bio || '',
    buddyCode: data.buddy_code,
    levelTitle: data.level_title || 'Gym Novice',
    weeklyGoal: data.weekly_goal || 4,
    createdAt: data.created_at,
  };
}

/**
 * Adds a partner by buddy code.
 * Creates a row in partnerships table linking user_id_1 and user_id_2.
 */
export async function addPartner(myId: string, buddyCode: string): Promise<{ success: boolean; error?: string; partner?: UserProfile }> {
  const partner = await getProfileByBuddyCode(buddyCode);
  if (!partner) {
    return { success: false, error: 'Buddy not found with this code' };
  }
  
  if (partner.id === myId) {
    return { success: false, error: 'You cannot add yourself as a partner' };
  }

  // Ensure consistent ordering to avoid duplicate pairs in unique constraint
  const id1 = myId < partner.id ? myId : partner.id;
  const id2 = myId < partner.id ? partner.id : myId;

  const { error } = await supabase
    .from('partnerships')
    .upsert(
      { user_id_1: id1, user_id_2: id2 },
      { onConflict: 'user_id_1,user_id_2' }
    );

  if (error) {
    console.error('Error adding partner:', error);
    return { success: false, error: 'Failed to add partner' };
  }

  return { success: true, partner };
}

/**
 * Retrieves all persistent partners for the current user.
 */
export async function getMyPartners(myId: string): Promise<UserProfile[]> {
  // We need to fetch all partnerships where user is involved
  const { data: partnerships, error: err1 } = await supabase
    .from('partnerships')
    .select('*')
    .or(`user_id_1.eq.${myId},user_id_2.eq.${myId}`);

  if (err1 || !partnerships) {
    console.error('Error fetching partnerships:', err1);
    return [];
  }

  const partnerIds = partnerships.map(p => p.user_id_1 === myId ? p.user_id_2 : p.user_id_1);
  
  if (partnerIds.length === 0) return [];

  // Fetch profiles of all partners
  const { data: profiles, error: err2 } = await supabase
    .from('profiles')
    .select('*')
    .in('id', partnerIds);

  if (err2 || !profiles) {
    console.error('Error fetching partner profiles:', err2);
    return [];
  }

  return profiles.map(data => ({
    id: data.id,
    name: data.name,
    username: data.username,
    email: data.email,
    avatar: data.avatar || '⚡',
    bio: data.bio || '',
    buddyCode: data.buddy_code,
    levelTitle: data.level_title || 'Gym Novice',
    weeklyGoal: data.weekly_goal || 4,
    createdAt: data.created_at,
  }));
}

/**
 * Retrieves workouts for a list of user IDs to calculate leaderboards.
 */
export async function getLeaderboardWorkouts(userIds: string[]) {
  if (userIds.length === 0) return [];

  const { data, error } = await supabase
    .from('workouts')
    .select('*')
    .in('user_id', userIds)
    .eq('status', 'completed');

  if (error || !data) {
    console.error('Error fetching leaderboard workouts:', error);
    return [];
  }

  return data.map(w => ({
    id: w.id,
    userId: w.user_id,
    startTime: w.start_time,
    endTime: w.end_time,
    status: w.status,
    duration: w.duration,
    date: w.date,
    notes: w.notes,
    mood: w.mood,
    bodyWeight: w.body_weight,
    templateId: w.template_id,
    templateName: w.template_name,
    exercises: w.exercises || [],
  }));
}
