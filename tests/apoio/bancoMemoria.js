// Banco de mentira, em memória, com os dados de exemplo (mockData.js).
// Fala a mesma língua do banco de verdade em dados.js (ler, inserir, atualizar,
// apagar), então as regras da camada de dados rodam iguais nos dois.
// Serve só aos testes (Node, sem internet): o app não tem mais modo de mentira.
//
// Ele anota cada coluna que a camada de dados usa em filtro e em gravação: o
// tests/check-schema.mjs confere essa lista contra as colunas do banco real.
import { criarMock } from './mockData.js'
import {
  PERFIS_VALIDOS, ehAdminAtivo, gerarSenha, nomeConfere, recusaSobreConta, validarNovoUsuario, AUTORIA,
  situacaoAoDesbloquear, situacaoAoMudarPerfil,
} from '../../supabase/functions/admin-usuarios/regras.js'

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
  semana_atividades: [{ nome: 'semana_atividades_uma_por_semana', colunas: ['atividade_id', 'semana'] }],
  // Como no Postgres, linha sem pedido (baixa manual) não conta para a trava.
  movimentos_estoque: [{ nome: 'movimentos_um_por_pedido', colunas: ['pedido_id', 'tipo'], vale: (l) => l.pedido_id != null }],
  // "nulls not distinct": duas medições de contrato (empreiteiro vazio) com o mesmo nº também repetem.
  medicoes: [{ nome: 'medicoes_um_numero', colunas: ['obra_id', 'tipo', 'empreiteiro', 'numero'] }],
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
      const apagadas = db[tabela].filter((l) => casa(l, filtros))
      db[tabela] = db[tabela].filter((l) => !casa(l, filtros))
      return copia(apagadas)
    },
    // O papel da função admin-usuarios nos testes: mesmas regras, sem login de verdade.
    async admin(acao, dados, quem) {
      if (!ehAdminAtivo(quem)) throw new Error('Só o Engenheiro administrador cuida dos usuários.')
      const conta = (id) => {
        const achada = db.profiles.find((p) => p.id === id)
        if (!achada) throw new Error('Usuário não encontrado.')
        return achada
      }
      const adminsAtivos = () => db.profiles.filter(ehAdminAtivo).length
      const travar = (nome, alvo, novoPerfil) => {
        const frase = recusaSobreConta({ acao: nome, quem, alvo, novoPerfil, adminsAtivos: adminsAtivos() })
        if (frase) throw new Error(frase)
      }
      const gravarObras = (id, obras = []) => {
        db.membros = db.membros.filter((m) => m.profile_id !== id)
        db.membros.push(...obras.map((obra_id) => ({ id: crypto.randomUUID(), obra_id, profile_id: id })))
      }
      const { id } = dados
      if (acao === 'listar') {
        return { usuarios: copia(db.profiles).map((p) => ({ ...p, ultimo_acesso: null, obras: db.membros.filter((m) => m.profile_id === p.id).map((m) => m.obra_id) })) }
      }
      if (acao === 'criar') {
        const invalido = validarNovoUsuario(dados)
        if (invalido) throw new Error(invalido)
        if (db.profiles.some((p) => p.email === dados.email.trim())) throw new Error('Já existe conta com este e-mail.')
        const novo = { id: crypto.randomUUID(), nome: dados.nome.trim(), email: dados.email.trim(), role: dados.role, status: 'ativo' }
        db.profiles.push(novo)
        if (dados.role !== 'admin_master') gravarObras(novo.id, dados.obras)
        return { id: novo.id, senha: gerarSenha() }
      }
      const alvo = conta(id)
      if (acao === 'redefinir_senha') return { senha: gerarSenha() }
      if (acao === 'perfil') {
        if (!PERFIS_VALIDOS.includes(dados.role)) throw new Error('Escolha o perfil.')
        travar('perfil', alvo, dados.role)
        Object.assign(alvo, { role: dados.role, status: situacaoAoMudarPerfil(alvo) })
        if (dados.role === 'admin_master') gravarObras(id, [])
      } else if (acao === 'obras') {
        if (alvo.role === 'admin_master') throw new Error('O Engenheiro já vê todas as obras.')
        gravarObras(id, dados.obras)
      } else if (acao === 'bloquear') {
        travar('bloquear', alvo)
        alvo.status = 'bloqueado'
      } else if (acao === 'desbloquear') {
        alvo.status = situacaoAoDesbloquear(alvo)
      } else if (acao === 'excluir') {
        travar('excluir', alvo)
        if (!nomeConfere(dados.confirmacao, alvo.nome)) throw new Error('Digite o nome da pessoa, igual ao da lista, para confirmar.')
        const registros = AUTORIA.reduce((total, [tabela, coluna]) => total + (db[tabela] ?? []).filter((l) => l[coluna] === id).length, 0)
        if (registros) throw new Error(`${alvo.nome} tem registros lançados no app: a conta não pode ser excluída. Bloqueie no lugar.`)
        db.profiles.splice(db.profiles.indexOf(alvo), 1)
        gravarObras(id, [])
      }
      return { ok: true }
    },
  }
}

// Os testes trocam o banco da camada de dados por um em memória novo, com os exemplos.
export const reiniciarMock = (dados, hoje) => dados._usarBancoDeTeste(criarBancoMemoria(hoje))
