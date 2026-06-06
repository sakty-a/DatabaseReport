import { createClient } from '@supabase/supabase-js'

// Mengambil kunci dari Vercel
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL=https://xputthytezdkrxcrqyzw.supabase.co
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=sb_publishable_GBheCKI13fi6VrSR58MgFw_m81pvoKK

// Membuat jembatan ke Supabase
export const supabase = createClient(supabaseUrl, supabaseKey)