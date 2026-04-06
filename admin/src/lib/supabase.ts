import { createClient } from '@supabase/supabase-js'

// moonvit-hub Supabase (hardcoded - same DB as bot)
const url = 'https://zcqkyuumopnchwwpgjwn.supabase.co'
const key = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpjcWt5dXVtb3BuY2h3d3BnanduIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzUyMTkwMTgsImV4cCI6MjA5MDc5NTAxOH0.WvtxZ3gwBUXB5067R3VZ-8y_DnOAERP34AfMApgkSIY'

export const supabase = createClient(url, key)
