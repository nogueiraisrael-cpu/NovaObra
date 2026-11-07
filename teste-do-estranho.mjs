// O TESTE DO ESTRANHO: alguém de fora, só com o endereço do app e a chave publicável (as duas
// estão no navegador de qualquer visitante), SEM login, tenta mexer em tudo.
// Rodar: node teste-do-estranho.mjs   (sai com erro se aparecer alguma 🚨)
//
// Cuidado de quem escreveu: ALTERAR e APAGAR miram um id que não existe. Se uma porta estivesse
// aberta, o banco aceitaria o pedido mas não mexeria em nada. INSERIR manda um registro vazio.
// Tabela nova no banco entra na lista TABELAS abaixo.
import { readFileSync } from 'node:fs'
import { createClient } from '@supabase/supabase-js'

const env = Object.fromEntries(
  readFileSync(new URL('./.env.local', import.meta.url), 'utf8')
    .split(/\r?\n/).filter((l) => l.includes('=') && !l.trim().startsWith('#'))
    .map((l) => [l.slice(0, l.indexOf('=')).trim(), l.slice(l.indexOf('=') + 1).trim()]),
)
const URL_APP = env.VITE_SUPABASE_URL
const CHAVE = env.VITE_SUPABASE_PUBLISHABLE_KEY
if (!URL_APP || !CHAVE) throw new Error('Faltam VITE_SUPABASE_URL e VITE_SUPABASE_PUBLISHABLE_KEY no .env.local')

const TABELAS = [
  'atividades', 'equipamentos', 'fotos', 'frentes_servico', 'funcionarios', 'insumos', 'materiais',
  'medicao_itens', 'medicoes', 'membros', 'movimentos_estoque', 'obras', 'pedidos_material', 'profiles',
  'rdo_efetivo', 'rdo_equipamentos', 'rdo_frente_equipe', 'rdo_frentes', 'rdos', 'restricoes',
  'semana_atividades', 'subtarefas',
]
const ID_QUE_NAO_EXISTE = '00000000-0000-0000-0000-000000000000'

const db = createClient(URL_APP, CHAVE, { auth: { persistSession: false, autoRefreshToken: false } })
let abertas = 0, total = 0

function linha(fechada, onde, operacao, detalhe) {
  total++
  if (!fechada) abertas++
  const marca = fechada ? '🔒 PORTA FECHADA' : '🚨 PORTA ABERTA '
  console.log(`${marca}  ${onde.padEnd(20)} ${operacao.padEnd(8)} ${detalhe}`)
}
// 42501 = "sem permissão" (falta grant ou a regra RLS recusou). É a resposta de porta fechada.
const recusou = (error) => error?.code === '42501'
const motivo = (error) => (error ? `(${error.code}: ${error.message})` : '(o banco aceitou o pedido)')

for (const t of TABELAS) {
  // Só "sem permissão" conta como fechada: "0 registros" pode ser só tabela vazia com a porta aberta.
  const ler = await db.from(t).select('*').limit(5)
  linha(recusou(ler.error), t, 'LER', ler.error ? motivo(ler.error) : `(o banco respondeu: ${ler.data.length} registro(s))`)

  const ins = await db.from(t).insert({}).select()
  linha(recusou(ins.error), t, 'INSERIR', motivo(ins.error))
  // Porta aberta de verdade: tira na hora o registro vazio que entrou (o banco é o real).
  for (const r of ins.data ?? []) await db.from(t).delete().eq('id', r.id)

  const upd = await db.from(t).update({ id: ID_QUE_NAO_EXISTE }).eq('id', ID_QUE_NAO_EXISTE).select()
  linha(recusou(upd.error), t, 'ALTERAR', motivo(upd.error))

  const del = await db.from(t).delete().eq('id', ID_QUE_NAO_EXISTE).select()
  linha(recusou(del.error), t, 'APAGAR', motivo(del.error))
}

// Depósito de fotos (Storage, pasta privada "fotos"). Só o MANDAR prova algo daqui: ler e apagar
// devolvem "nada" tanto com a porta fechada quanto com ela aberta e a pasta vazia. Quem prova ler e
// apagar é o raio-x (as regras de storage.objects só valem para quem fez login).
// Um "JPEG" de 4 bytes com o tipo certo: se for recusado, é por permissão, não pelo formato.
const caminho = `${ID_QUE_NAO_EXISTE}/diario/teste-do-estranho-${Date.now()}.jpg`
const up = await db.storage.from('fotos').upload(caminho, new Blob([new Uint8Array([0xff, 0xd8, 0xff, 0xd9])], { type: 'image/jpeg' }), { contentType: 'image/jpeg' })
linha(!!up.error, 'storage: fotos', 'INSERIR', up.error ? `(${up.error.message})` : '(o arquivo subiu!)')
if (!up.error) await db.storage.from('fotos').remove([caminho])

// Funções do banco que o app chama
for (const [fn, args] of [['efetivo_do_dia', { dia: '2026-11-01' }], ['nomes_da_equipe', {}]]) {
  const r = await db.rpc(fn, args)
  linha(recusou(r.error),`função ${fn}`, 'CHAMAR', motivo(r.error))
}

// Função que cria e muda contas (Painel de admin)
const resp = await fetch(`${URL_APP}/functions/v1/admin-usuarios`, {
  method: 'POST', headers: { apikey: CHAVE, 'Content-Type': 'application/json' }, body: '{}',
})
linha(resp.status === 401 || resp.status === 403, 'função admin-usuarios', 'CHAMAR', `(resposta ${resp.status})`)

// Cadastro público (criar conta sozinho): só olha a configuração, não cria nada
const cfg = await fetch(`${URL_APP}/auth/v1/settings`, { headers: { apikey: CHAVE } }).then((r) => r.json())
linha(cfg.disable_signup === true, 'cadastro público', 'CRIAR', cfg.disable_signup ? '(desligado no painel)' : '(qualquer um cria conta!)')

console.log(`\n${total - abertas} de ${total} portas fechadas.${abertas ? ` 🚨 ${abertas} ABERTA(S).` : ' Nenhuma aberta.'}`)
process.exit(abertas ? 1 : 0)
