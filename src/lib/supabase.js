import { createClient } from '@supabase/supabase-js'

// A conexão com o banco. Quem usa é só src/lib/dados.js.
// URL e chave vêm do .env.local (que não vai para o Git). A chave é a
// PUBLICÁVEL (sb_publishable_...): pode ir no app. Nunca a secreta nem a service_role.
// Sem o .env.local (ou nos testes, no Node), a conexão fica desligada.
const env = import.meta.env ?? {}
const url = env.VITE_SUPABASE_URL
const key = env.VITE_SUPABASE_PUBLISHABLE_KEY

export const supabase = url && key ? createClient(url, key) : null
