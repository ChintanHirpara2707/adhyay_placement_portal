import { createClient } from '@supabase/supabase-js';
import { Platform } from 'react-native';

// TODO: Replace these with your actual Supabase project credentials
const supabaseUrl = 'https://ypfrvkzbooybykhlchfu.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlwZnJ2a3pib295YnlraGxjaGZ1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODc0Njg3NDMsImV4cCI6MjEwMzA0NDc0M30.kSSBRIxcHHBXLf9e3DB7jG8iKfy2Jg9Lfxmp2NGhMBU';

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: Platform.OS === 'web',
    autoRefreshToken: true,
    detectSessionInUrl: false,
  },
});
