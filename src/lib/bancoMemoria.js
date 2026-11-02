// Banco de mentira, em memória, com os dados de exemplo (mockData.js).
// Fala a mesma língua do banco de verdade em dados.js (ler, inserir, atualizar,
// apagar), então as regras da camada de dados rodam iguais nos dois.
// Serve aos testes (Node, sem internet) e ao app quando USAR_MOCK = true.
//
// Ele anota cada coluna que a camada de dados usa em filtro e em gravação: o
// tests/check-schema.mjs confere essa lista contra as colunas do banco real.
import { criarMock } from './mockData.js'

// Filtro { coluna: valor }: lista = "uma destas", null = "vazio".
export function casa(linha, filtros) {
  return Object.entries(filtros).every(([c, v]) =>
    Array.isArray(v) ? v.includes(linha[c]) : v === null ? linha[c] == null : linha[c] === v)
}

// As mesmas travas de "não repete" do banco real (migration 01), com o mesmo nome:
// assim a camada de dados recebe aqui o mesmo erro 23505 que receberia do Supabase.
export const UNICOS = {
  obras: [{ nome: 'obras_codigo_key', colunas: ['codigo'] }],
  rdos: [{ nome: 'rdos_um_por_obra_por_dia', colunas: ['obra_id', 'data'] }],
  rdo_efetivo: [
    { nome: 'rdo_efetivo_um_por_funcionario', colunas: ['rdo_id', 'funcionario_id'] },
    {
      nome: 'rdo_efetivo_uma_presenca_por_dia', colunas: ['funcionario_id', 'data'],
      vale: (l) => ['Presente', 'Veio de outra obra'].includes(l.situacao),
    },
  ],
  rdo_equipamentos: [{ nome: 'rdo_equipamentos_um_por_equipamento', colunas: ['rdo_id', 'equipamento_id'] }],
  rdo_frentes: [{ nome: 'rdo_frentes_uma_por_frente', colunas: ['rdo_id', 'frente_id'] }],
  rdo_frente_equipe: [{ nome: 'rdo_frente_equipe_uma_vez', colunas: ['rdo_frente_id', 'funcionario_id'] }],
  insumos: [{ nome: 'insumos_um_por_material', colunas: ['obra_id', 'material_id'] }],
  // Como no Postgres, linha sem pedido (baixa manual) não conta para a trava.
  movimentos_estoque: [{ nome: 'movimentos_um_por_pedido', colunas: ['pedido_id', 'tipo'], vale: (l) => l.pedido_id != null }],
}

// Recusa a tabela que ficaria com linha repetida, no mesmo formato do erro do Supabase.
function conferirUnicos(tabela, linhas) {
  for (const regra of UNICOS[tabela] ?? []) {
    const vistas = new Set()
    for (const l of linhas) {
      if (regra.vale && !regra.vale(l)) continue
      const chave = JSON.stringify(regra.colunas.map((c) => l[c]))
      if (vistas.has(chave)) {
        throw Object.assign(new Error(`duplicate key value violates unique constraint "${regra.nome}"`), { doBanco: true, code: '23505' })
      }
      vistas.add(chave)
    }
  }
}

export function criarBancoMemoria(hoje) {
  const db = criarMock(hoje)
  const colunas = new Set()
  const anotar = (tabela, objeto) => Object.keys(objeto).forEach((c) => colunas.add(`${tabela}.${c}`))
  const copia = (x) => structuredClone(x)

  return {
    perfis: db.profiles,
    colunasUsadas: () => [...colunas].sort(),

    async ler(tabela, filtros = {}) {
      anotar(tabela, filtros)
      return copia(db[tabela].filter((l) => casa(l, filtros)))
    },
    async inserir(tabela, linhas) {
      linhas.forEach((l) => anotar(tabela, l))
      const novas = linhas.map((l) => ({ id: crypto.randomUUID(), created_at: new Date().toISOString(), ...l }))
      conferirUnicos(tabela, [...db[tabela], ...novas])
      db[tabela].push(...novas)
      return copia(novas)
    },
    async atualizar(tabela, filtros, campos) {
      anotar(tabela, filtros)
      anotar(tabela, campos)
      // Confere numa cópia antes: se repetir, nada muda (como no banco de verdade).
      const depois = db[tabela].map((l) => (casa(l, filtros) ? { ...l, ...campos } : l))
      conferirUnicos(tabela, depois)
      const alvo = db[tabela].filter((l) => casa(l, filtros))
      alvo.forEach((l) => Object.assign(l, campos))
      return copia(alvo)
    },
    async apagar(tabela, filtros) {
      anotar(tabela, filtros)
      db[tabela] = db[tabela].filter((l) => !casa(l, filtros))
    },
  }
}
