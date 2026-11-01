import { createClient } from '@supabase/supabase-js'

// As chaves entram na Etapa 7, no .env.local. Até lá o app roda no mock
// (USAR_MOCK em dados.js) e esta conexão fica desligada.
const env = import.meta.env ?? {}
const url = env.VITE_SUPABASE_URL
// Chave publicável (sb_publishable_...).
const key = env.VITE_SUPABASE_PUBLISHABLE_KEY

export const supabase = url && key ? createClient(url, key) : null
