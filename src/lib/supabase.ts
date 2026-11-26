import AsyncStorage from "@react-native-async-storage/async-storage";
import { createClient } from "@supabase/supabase-js";
import { AppState, Platform } from "react-native";

// TODO: Replace these with your actual Supabase project credentials
const supabaseUrl = "https://ypfrvkzbooybykhlchfu.supabase.co";
const supabaseAnonKey =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlwZnJ2a3pib295YnlraGxjaGZ1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODc0Njg3NDMsImV4cCI6MjEwMzA0NDc0M30.kSSBRIxcHHBXLf9e3DB7jG8iKfy2Jg9Lfxmp2NGhMBU";

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: Platform.OS === "web" ? undefined : AsyncStorage,
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: Platform.OS === "web",
    flowType: "pkce",
  },
});

// Phones: keep refreshing the login while the app is open, pause when it is in the background.
if (Platform.OS !== "web") {
  AppState.addEventListener("change", (state) => {
    if (state === "active") supabase.auth.startAutoRefresh();
    else supabase.auth.stopAutoRefresh();
  });
}
