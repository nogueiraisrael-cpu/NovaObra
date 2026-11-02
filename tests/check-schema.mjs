// CHECK-SCHEMA: código x colunas do banco real (tests/_schema-snapshot.json).
//
// Pega o erro mais silencioso da camada de dados: o código pede ou grava uma
// coluna que o banco não tem, e a tela só mostra vazio ou "não foi possível salvar".
//
// Como confere: roda TODAS as funções de src/lib/dados.js no banco em memória,
// que anota cada coluna usada em filtro (das leituras e das alterações) e em
// gravação (insert/update); depois compara com o retrato do banco. Não confere a
// coluna que o código só LÊ do resultado (ex.: rdo.fechado_em): essa aparece na tela.
// Se uma função do percurso devolver erro, a régua reprova: erro calado pularia
// as colunas dela sem ninguém ver.
// Confere ainda que os dados de exemplo (mockData) só têm colunas que existem,
// e que nenhum arquivo além de dados.js chama supabase.from(...).
//
// Depois de QUALQUER migration, regenere o _schema-snapshot.json (o agente tira
// do banco com uma consulta em information_schema.columns). Retrato velho passa
// verde mentindo.
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import * as dados from '../src/lib/dados.js'
import { criarMock } from '../src/lib/mockData.js'
import { hojeISO, somarDias } from '../src/lib/datas.js'

const aqui = path.dirname(fileURLToPath(import.meta.url))
const schema = JSON.parse(fs.readFileSync(path.join(aqui, '_schema-snapshot.json'), 'utf8'))
const problemas = []

// A camada de dados, com um vigia: toda função que devolver { erro } vira problema.
const d = new Proxy(dados, {
  get(alvo, nome) {
    const f = alvo[nome]
    if (typeof f !== 'function' || nome.startsWith('_')) return f
    return async (...args) => {
      const r = await f(...args)
      if (r?.erro) problemas.push(`[PERCURSO] ${nome} falhou: ${r.erro}`)
      return r
    }
  },
})

// 1) Percorre a camada de dados inteira, como um dia de uso.
d._reiniciarMock()
await d.entrar('eng@novaobra.test', 'x')
await d.listarObras()
await d.listarResumoObras()
await d.listarQuadroEfetivo()
const nova = await d.salvarObra({ nome: 'Obra de conferência', codigo: 'conf', tipo: 'Licitação', cidade: 'Natal', data_inicio: '2026-01-10', situacao: 'Em andamento' })
await d.salvarObra({ ...nova.data, nome: 'Obra de conferência 2' })
for (const obra of ['obra-ubs', 'obra-serra']) {
  d.definirObraAtual(obra)
  await d.obterRdoHoje()
  await d.salvarRdo({ clima_manha: 'Nublado', observacoes: 'conferência' })
  await d.listarEfetivoHoje()
  await d.listarEquipamentosHoje()
  await d.listarFrentes()
  await d.listarDestinosDeslocamento()
  await d.listarFuncionariosParaTrazer()
  await d.listarPessoas()
  await d.listarEquipamentos()
  await d.listarDiarios()
}
await d.marcarEfetivo('f-paulo', 'Presente')
await d.marcarEfetivo('f-bruno', 'Deslocado', 'obra-ubs')
await d.marcarEfetivo('f-bruno', 'Presente')
await d.trazerFuncionario('f-geraldo')
await d.devolverFuncionario('f-geraldo')
await d.marcarEquipamentoDia('e-betoneira', 'Quebrado', 'Correia')
await d.mandarEquipamentoParaObra('e-fachadeiro')
await d.mandarEquipamentoParaDeposito('e-fachadeiro')
await d.salvarEquipamento({ nome: 'Serra circular', codigo: 'SC-1', nesta_obra: true })
const frente = await d.salvarFrente({ nome: 'Conferência', etapa: 'Alvenaria', executor: 'Terceirizado', empreiteiro: 'Fulano' })
await d.obterPreenchimento(frente.data.id)
await d.salvarPreenchimento('fs-revest', { situacao: 'Parada', motivo_parada: 'Chuva', descricao: 'x', equipe: ['f-joao'], fotos: [{ caminho: 'data:,', legenda: 'l' }] })
await d.resumoFechamento()
await d.fecharRdo()
const dias = (await d.listarDiarios()).data
await d.obterDiario(dias[0].id)
await d.listarQuadroMateriais()
const pedido = await d.salvarPedido({ material_id: 'mat-areia', quantidade: '2,5', frente: 'Conferência', prioridade: 'Crítico' })
await d.moverPedido(pedido.data.id, 'Em cotação')
await d.moverPedido(pedido.data.id, 'Comprado', { fornecedor: 'Areal', previsao_entrega: somarDias(hojeISO(), 3) })
await d.moverPedido(pedido.data.id, 'No almoxarifado', { qtd_bate_nf: true, estado_ok: false, avarias: 'Saco rasgado', foto_nf: 'data:,' })
await d.moverPedido(pedido.data.id, 'Entregue', { frente: 'Conferência' })
await d.apagarPedido(pedido.data.id)
const func = await d.salvarFuncionario({ nome: 'Novo', funcao: 'Servente', obra_id: 'obra-serra' })
await d.salvarFuncionario({ ...func.data, ativo: false })

const usadas = dados._colunasUsadas()
if (usadas.length < 40) problemas.push(`[CONFERÊNCIA] só ${usadas.length} colunas anotadas: o percurso acima não rodou a camada de dados`)
for (const tc of usadas) {
  const [tabela, coluna] = tc.split('.')
  if (!schema[tabela]) problemas.push(`[TABELA] o código usa a tabela ${tabela}, que não existe no banco`)
  else if (!schema[tabela].includes(coluna)) problemas.push(`[COLUNA] o código usa ${tabela}.${coluna}, que não existe no banco`)
}

// 2) Os dados de exemplo têm só colunas que existem (o supabase-seed.sql sai deles).
const mock = criarMock()
for (const [tabela, linhas] of Object.entries(mock)) {
  if (!schema[tabela]) continue // profiles e membros: chegam com o login (passo 10)
  for (const c of new Set(linhas.flatMap((l) => Object.keys(l)))) {
    if (!schema[tabela].includes(c)) problemas.push(`[MOCK] mockData.${tabela} tem a coluna ${c}, que não existe no banco`)
  }
}

// 3) Só a camada de dados fala com o Supabase.
function arquivos(pasta) {
  return fs.readdirSync(pasta, { withFileTypes: true }).flatMap((e) => {
    const p = path.join(pasta, e.name)
    return e.isDirectory() ? arquivos(p) : /\.(jsx?|mjs)$/.test(e.name) ? [p] : []
  })
}
for (const arq of arquivos(path.join(aqui, '..', 'src'))) {
  if (path.basename(arq) === 'dados.js') continue
  if (/supabase\s*\.\s*(from|rpc|storage)\b/.test(fs.readFileSync(arq, 'utf8'))) {
    problemas.push(`[PORTA] ${path.relative(path.join(aqui, '..'), arq)} fala com o Supabase direto; só src/lib/dados.js pode`)
  }
}

if (problemas.length) {
  console.log('✗ check-schema:')
  for (const p of [...new Set(problemas)]) console.log('  ' + p)
  process.exit(1)
}
console.log(`✓ check-schema: ${usadas.length} colunas usadas pelo código existem no banco`)
