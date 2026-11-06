import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';

export const supabase = createClient(
  'https://nruksvjkytpxbiemtalj.supabase.co',
  'sb_publishable_0MgMCUpV93vXHxkthK5AYQ_9IoQgk0-',
  { auth: { storage: AsyncStorage, autoRefreshToken: true, persistSession: true, detectSessionInUrl: false } }
);
