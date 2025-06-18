import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm"

const supabaseUrl = "https://joyamcjuiupifvgkmdiu.supabase.co"
const supabaseKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpveWFtY2p1aXVwaWZ2Z2ttZGl1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTAxNTE5MzYsImV4cCI6MjA2NTcyNzkzNn0.gADumF2Yb3X_CNPJ9xZesGpp8HV75XGYH0ZGw-JSnpk"
export const supabase = createClient(supabaseUrl, supabaseKey)