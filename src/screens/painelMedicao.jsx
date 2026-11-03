// Painel de medição (v1.3, etapa 2) — só para ver: nada se edita aqui. Abre por "Ver painel"
// na aba Medições, ou sozinho depois de subir uma medição. As contas (o que é medido, saldo e
// %) moram em src/lib/painelMedicao.js; esta tela só escolhe as medições e mostra.
//
// No computador, a tabela tem todas as colunas; no celular vira cartões com Descrição, Valor
// medido, Saldo e %, e tocar no cartão mostra o resto.
import { useState } from 'react'
import { obterPainelMedicoes } from '../lib/dados.js'
import { useDados } from '../lib/useDados.js'
import { useObra } from '../lib/ObraContext.jsx'
import { alternarEscolha, painelContrato, painelEmpreiteiro, filtrarEtapas, passaNoFiltro } from '../lib/painelMedicao.js'
import { formatarReais, formatarPct, formatarQtd, ordinal, TOLERANCIA } from '../lib/medicoes.js'
import { formatarData } from '../lib/datas.js'
import { Carregando, ErroCarga, Icon, Pill, Vazio } from '../components/index.jsx'

const r$ = formatarReais
const cor = (n) => (n < -TOLERANCIA ? 't-bad' : '')

function Numeros({ itens }) {
  return (
    <div className="med-numeros med-numeros-painel">
      {itens.map((n) => (
        <div key={n.rotulo}>
          <span>{n.rotulo}</span>
          <b className={n.cor ?? ''}>{n.valor}</b>
          {n.sub && <small>{n.sub}</small>}
        </div>
      ))}
    </div>
  )
}

// Barras horizontais: o comprimento é o tamanho (adequado da etapa, ou o valor pago). A parte
// clara é o que já tinha sido medido antes da escolha, a forte o medido na escolha, e o cinza o saldo.
// Passou do adequado, a barra fica vermelha.
function Barras({ titulo, linhas, legenda }) {
  const maior = Math.max(...linhas.map((l) => l.total), 1)
  return (
    <section className="block med-barras">
      <div className="block-h"><h3>{titulo}</h3></div>
      {legenda && <div className="hint" style={{ marginTop: 0 }}>{legenda}</div>}
      {linhas.map((l) => (
        <div className="med-barra" key={l.chave}>
          <div className="med-barra-nome"><span>{l.rotulo}</span><b className={l.estourou ? 't-bad' : ''}>{l.lado}</b></div>
          <div className={`med-trilho${l.estourou ? ' acima' : ''}`} style={{ width: `${Math.max(2, (l.total / maior) * 100)}%` }} aria-hidden="true">
            {l.antes > 0 && <div className="med-antes" style={{ width: `${l.antes}%` }} />}
            <div className="med-feito" style={{ width: `${l.escolha}%` }} />
          </div>
        </div>
      ))}
    </section>
  )
}

function Escolha({ medicoes, escolhidos, mudar }) {
  return (
    <div className="chips med-escolha nao-imprimir" role="group" aria-label="Escolha das medições">
      {medicoes.map((m) => (
        <button key={m.id} className={`chip${escolhidos?.includes(m.numero) ? ' on' : ''}`} aria-pressed={Boolean(escolhidos?.includes(m.numero))}
          onClick={() => mudar(alternarEscolha(escolhidos, m.numero))}>{ordinal(m.numero)}</button>
      ))}
      <button className={`chip${escolhidos === null ? ' on' : ''}`} aria-pressed={escolhidos === null} onClick={() => mudar(null)}>Todas</button>
    </div>
  )
}

function Filtros({ filtro, mudar, acima }) {
  return (
    <div className="med-filtros nao-imprimir">
      <input className="field" type="search" placeholder="Buscar pela descrição ou pelo item" aria-label="Buscar"
        value={filtro.busca} onChange={(e) => mudar({ ...filtro, busca: e.target.value })} />
      <button className={`chip${filtro.soNegativo ? ' on' : ''}`} aria-pressed={filtro.soNegativo} onClick={() => mudar({ ...filtro, soNegativo: !filtro.soNegativo })}>
        Só com saldo negativo{acima > 0 && <small>{acima}</small>}
      </button>
    </div>
  )
}

// Cartão do celular: o resumo sempre; o resto ao tocar.
function Cartao({ titulo, etiquetas, resumo, resto, acima }) {
  const [aberto, setAberto] = useState(false)
  return (
    <button className={`med-cartao${acima ? ' acima' : ''}`} onClick={() => setAberto(!aberto)} aria-expanded={aberto}>
      <div className="med-cartao-topo"><b>{titulo}</b>{etiquetas}</div>
      <div className="med-cartao-resumo">{resumo.map(([r, v, c]) => <span key={r}><small>{r}</small><b className={c ?? ''}>{v}</b></span>)}</div>
      {aberto && <div className="med-cartao-resto">{resto.map(([r, v, c]) => <span key={r}><small>{r}</small><b className={c ?? ''}>{v}</b></span>)}</div>}
    </button>
  )
}

// ---------------------------------------------------------------------------
// Contrato: etapa → subetapa → serviço
// ---------------------------------------------------------------------------

const etiquetasDoServico = (s) => (
  <>
    {s.acima && <Pill cor="bad">Acima do contratado</Pill>}
    {s.cresceu && <Pill cor="warn">Cresceu na adequação</Pill>}
  </>
)

function TabelaContrato({ etapas, abertas, alternar, filtrando }) {
  const aberta = (codigo) => filtrando || abertas.includes(codigo)
  const grupo = (g, nivel) => (
    <tr key={`${nivel}-${g.codigo}`} className={`med-grupo n${nivel}${g.acima ? ' acima' : ''}`} onClick={() => alternar(g.codigo)}>
      <td><Icon nome={aberta(g.codigo) ? 'down' : 'chev'} /> {g.codigo}</td>
      <td colSpan={7}><b>{g.nome}</b></td>
      <td>{r$(g.adequado)}</td><td>{r$(g.medido)}</td><td className={cor(g.saldo)}>{r$(g.saldo)}</td><td>{formatarPct(g.pct)}</td>
    </tr>
  )
  const servico = (s) => (
    <tr key={s.item} className={s.acima ? 'acima' : ''}>
      <td>{s.item}</td>
      <td className="med-desc">{s.descricao} {etiquetasDoServico(s)}</td>
      <td>{s.unidade}</td>
      <td>{formatarQtd(s.qtd_prevista)}</td>
      <td className={s.cresceu ? 't-warn' : ''}>{formatarQtd(s.qtd_contratada)}</td>
      <td>{formatarQtd(s.qtd_medida)}</td>
      <td className={cor(s.saldo_qtd)}>{formatarQtd(s.saldo_qtd)}</td>
      <td>{formatarPct(s.pct_qtd)}</td>
      <td>{r$(s.valor_contratado)}</td>
      <td>{r$(s.valor_medido)}</td>
      <td className={cor(s.saldo_valor)}>{r$(s.saldo_valor)}</td>
      <td>{formatarPct(s.pct_valor)}</td>
    </tr>
  )
  return (
    <div className="tabela-rolagem med-so-computador">
      <table className="med-tabela">
        <thead>
          <tr>
            <th>Item</th><th>Descrição</th><th>Unid.</th><th>Qtd prevista</th><th>Qtd adequada</th><th>Qtd medida</th><th>Saldo qtd</th><th>% qtd</th>
            <th>Valor adequado</th><th>Valor medido</th><th>Saldo R$</th><th>% valor</th>
          </tr>
        </thead>
        <tbody>
          {etapas.flatMap((e) => [
            grupo(e, 0),
            ...(aberta(e.codigo) ? [
              ...e.servicos.map(servico),
              ...e.subetapas.flatMap((sub) => [grupo(sub, 1), ...(aberta(sub.codigo) ? sub.servicos.map(servico) : [])]),
            ] : []),
          ])}
        </tbody>
      </table>
    </div>
  )
}

function CartoesContrato({ etapas, abertas, alternar, filtrando }) {
  const aberta = (codigo) => filtrando || abertas.includes(codigo)
  const cabeca = (g, nivel) => (
    <button key={`${nivel}-${g.codigo}`} className={`med-grupo-cel n${nivel}${g.acima ? ' acima' : ''}`} onClick={() => alternar(g.codigo)} aria-expanded={aberta(g.codigo)}>
      <span><Icon nome={aberta(g.codigo) ? 'down' : 'chev'} /> <b>{g.codigo} {g.nome}</b></span>
      <span className="med-grupo-num">{r$(g.medido)} · <span className={cor(g.saldo)}>saldo {r$(g.saldo)}</span> · {formatarPct(g.pct)}</span>
    </button>
  )
  const cartao = (s) => (
    <Cartao key={s.item} acima={s.acima} titulo={`${s.item} ${s.descricao}`} etiquetas={etiquetasDoServico(s)}
      resumo={[['Valor medido', r$(s.valor_medido)], ['Saldo', r$(s.saldo_valor), cor(s.saldo_valor)], ['%', formatarPct(s.pct_valor)]]}
      resto={[
        ['Qtd prevista', formatarQtd(s.qtd_prevista, s.unidade)], ['Qtd adequada', formatarQtd(s.qtd_contratada, s.unidade), s.cresceu ? 't-warn' : ''],
        ['Qtd medida', formatarQtd(s.qtd_medida, s.unidade)], ['Saldo qtd', formatarQtd(s.saldo_qtd, s.unidade), cor(s.saldo_qtd)],
        ['% qtd', formatarPct(s.pct_qtd)], ['Valor adequado', r$(s.valor_contratado)],
      ]} />
  )
  return (
    <div className="med-so-celular med-cartoes">
      {etapas.flatMap((e) => [
        cabeca(e, 0),
        ...(aberta(e.codigo) ? [
          ...e.servicos.map(cartao),
          ...e.subetapas.flatMap((sub) => [cabeca(sub, 1), ...(aberta(sub.codigo) ? sub.servicos.map(cartao) : [])]),
        ] : []),
      ])}
    </div>
  )
}

function PainelContrato({ medicoes, itens, inicial }) {
  const [escolhidos, setEscolhidos] = useState(inicial ?? null)
  const [filtro, setFiltro] = useState({ busca: '', soNegativo: false })
  const [abertas, setAbertas] = useState([])
  const p = painelContrato(medicoes, itens, escolhidos)
  const t = p.totais
  const filtrando = Boolean(filtro.busca.trim() || filtro.soNegativo)
  const etapas = filtrarEtapas(p.etapas, filtro)
  const alternar = (codigo) => setAbertas(abertas.includes(codigo) ? abertas.filter((c) => c !== codigo) : [...abertas, codigo])
  const escolha = escolhidos === null ? `todas (acumulado até a ${ordinal(p.ultima.numero)})` : escolhidos.map(ordinal).join(' + ')

  return (
    <>
      <Escolha medicoes={medicoes} escolhidos={escolhidos} mudar={setEscolhidos} />
      <div className="hint">Medições: {escolha}. O saldo conta tudo o que foi medido até a {ordinal(p.ultima.numero)}.</div>
      <Numeros itens={[
        { rotulo: 'Previsto original', valor: r$(t.previsto) },
        { rotulo: 'Adequado', valor: r$(t.adequado), sub: t.adequado !== t.previsto ? `${t.adequado > t.previsto ? '+' : ''}${r$(t.adequado - t.previsto)} na adequação` : null },
        { rotulo: 'Medido', valor: r$(t.medido), cor: 't-info', sub: `na ${ordinal(p.ultima.numero)}: ${r$(t.ultimaPeriodo)}` },
        { rotulo: 'Saldo', valor: r$(t.saldo), cor: cor(t.saldo) },
        { rotulo: '% medido', valor: formatarPct(t.pct), sub: `na ${ordinal(p.ultima.numero)}: ${formatarPct(t.ultimaPct)}` },
      ]} />
      {t.acimaDoContratado > 0 && (
        <div className="banner bad">
          {t.acimaDoContratado === 1 ? '1 serviço medido acima do contratado' : `${t.acimaDoContratado} serviços medidos acima do contratado`} (candidatos a aditivo).
          {!filtro.soNegativo && <div className="nao-imprimir"><button className="btn btn-ghost" style={{ marginTop: 10 }} onClick={() => setFiltro({ ...filtro, soNegativo: true })}>Ver quais</button></div>}
        </div>
      )}
      <Barras titulo="Por etapa: medido × saldo"
        legenda={escolhidos === null ? 'Turquesa: medido · cinza: saldo.' : 'Turquesa claro: medido antes · forte: medido na escolha · cinza: saldo.'}
        linhas={p.etapas.map((e) => ({ chave: e.codigo, rotulo: `${e.codigo} ${e.nome}`, lado: formatarPct(e.pct), total: e.adequado, ...e.barra }))} />
      <Filtros filtro={filtro} mudar={setFiltro} acima={t.acimaDoContratado} />
      {etapas.length ? (
        <>
          <TabelaContrato etapas={etapas} abertas={abertas} alternar={alternar} filtrando={filtrando} />
          <CartoesContrato etapas={etapas} abertas={abertas} alternar={alternar} filtrando={filtrando} />
        </>
      ) : <div className="note">Nenhum serviço com esse filtro.</div>}
    </>
  )
}

// ---------------------------------------------------------------------------
// Empreiteiro: uma linha por item de cada medição, agrupada por medição
// ---------------------------------------------------------------------------

function PainelEmpreiteiro({ medicoes, itens, inicial }) {
  const [escolhidos, setEscolhidos] = useState(inicial ?? null)
  const [filtro, setFiltro] = useState({ busca: '', soNegativo: false })
  const p = painelEmpreiteiro(medicoes, itens, escolhidos)
  const t = p.totais
  const grupos = p.grupos.map((g) => ({ ...g, linhas: g.linhas.filter((l) => passaNoFiltro(l, filtro)) })).filter((g) => g.linhas.length)
  const nomeDo = (m) => `${ordinal(m.numero)} medição${p.varios ? ` · ${m.empreiteiro}` : ''} · ${formatarData(m.data_medicao)}`

  return (
    <>
      {p.varios
        ? <div className="hint">Todos os empreiteiros somados. Para escolher medições, escolha um empreiteiro.</div>
        : <Escolha medicoes={medicoes} escolhidos={escolhidos} mudar={setEscolhidos} />}
      <Numeros itens={[
        { rotulo: 'Previsto', valor: r$(t.previsto) },
        { rotulo: 'Executado', valor: r$(t.executado), cor: 't-info' },
        { rotulo: 'Descontos', valor: r$(t.descontos) },
        { rotulo: 'Pago', valor: r$(t.pago) },
        { rotulo: '% executado', valor: formatarPct(t.pct) },
      ]} />
      {t.acimaDoContratado > 0 && <div className="banner bad">{t.acimaDoContratado === 1 ? '1 item executado acima do previsto' : `${t.acimaDoContratado} itens executados acima do previsto`} (candidatos a aditivo).</div>}
      <Barras titulo="Pago em cada medição" linhas={p.barras.map((b) => ({
        chave: b.id, rotulo: `${ordinal(b.numero)}${p.varios ? ` · ${b.empreiteiro}` : ''}`, lado: r$(b.valor), total: b.valor, escolha: 100, antes: 0,
      }))} />
      <Filtros filtro={filtro} mudar={setFiltro} acima={t.acimaDoContratado} />
      {!grupos.length && <div className="note">Nenhum item com esse filtro.</div>}
      {grupos.length > 0 && (
        <div className="tabela-rolagem med-so-computador">
          <table className={`med-tabela med-tabela-emp${p.varios ? ' varios' : ''}`}>
            <thead>
              <tr>
                <th>Medição</th>{p.varios && <th>Empreiteiro</th>}<th>Item</th><th>Discriminação</th><th>Unid.</th><th>Qtd prevista</th><th>Qtd executada</th><th>Saldo qtd</th>
                <th>Valor previsto</th><th>Valor executado</th><th>Saldo R$</th><th>%</th>
              </tr>
            </thead>
            <tbody>
              {grupos.flatMap((g) => [
                <tr key={g.medicao.id} className="med-grupo n0"><td colSpan={p.varios ? 9 : 8}><b>{nomeDo(g.medicao)}</b></td><td colSpan={3}>pago {r$(g.pago)}</td></tr>,
                ...g.linhas.map((l, i) => (
                  <tr key={`${g.medicao.id}-${i}`} className={l.acima ? 'acima' : ''}>
                    <td>{ordinal(g.medicao.numero)}</td>{p.varios && <td>{g.medicao.empreiteiro}</td>}
                    <td>{l.item}</td>
                    <td className="med-desc">{l.descricao} {l.acima && <Pill cor="bad">Acima do contratado</Pill>}</td>
                    <td>{l.unidade}</td>
                    <td>{formatarQtd(l.qtd_prevista)}</td><td>{formatarQtd(l.qtd_executada)}</td><td className={cor(l.saldo_qtd)}>{formatarQtd(l.saldo_qtd)}</td>
                    <td>{r$(l.valor_previsto)}</td><td>{r$(l.valor_executado)}</td><td className={cor(l.saldo_valor)}>{r$(l.saldo_valor)}</td><td>{formatarPct(l.pct)}</td>
                  </tr>
                )),
              ])}
            </tbody>
          </table>
        </div>
      )}
      <div className="med-so-celular med-cartoes">
        {grupos.flatMap((g) => [
          <div key={g.medicao.id} className="med-grupo-cel n0"><span><b>{nomeDo(g.medicao)}</b></span><span className="med-grupo-num">pago {r$(g.pago)}</span></div>,
          ...g.linhas.map((l, i) => (
            <Cartao key={`${g.medicao.id}-${i}`} acima={l.acima} titulo={`${l.item} ${l.descricao}`} etiquetas={l.acima && <Pill cor="bad">Acima do contratado</Pill>}
              resumo={[['Executado', r$(l.valor_executado)], ['Saldo', r$(l.saldo_valor), cor(l.saldo_valor)], ['%', formatarPct(l.pct)]]}
              resto={[
                ['Qtd prevista', formatarQtd(l.qtd_prevista, l.unidade)], ['Qtd executada', formatarQtd(l.qtd_executada, l.unidade)],
                ['Saldo qtd', formatarQtd(l.saldo_qtd, l.unidade), cor(l.saldo_qtd)], ['Valor previsto', r$(l.valor_previsto)],
              ]} />
          )),
        ])}
      </div>
    </>
  )
}

// ---------------------------------------------------------------------------

// `alvo` = { tipo: 'Contrato' } ou { tipo: 'Empreiteiro', empreiteiro } (sem nome = todos), e `escolhidos`
// (nº das medições que já abrem marcadas; sem = Todas).
export default function PainelMedicao({ alvo, voltar }) {
  const { obra } = useObra()
  const dados = useDados(() => obterPainelMedicoes(alvo), [alvo.tipo, alvo.empreiteiro])
  const titulo = alvo.tipo === 'Contrato' ? 'Medição do contrato' : alvo.empreiteiro ? `Medição — ${alvo.empreiteiro}` : 'Todos os empreiteiros'

  let corpo
  if (dados.carregando) corpo = <Carregando />
  else if (dados.erro) corpo = <ErroCarga erro={dados.erro} tentar={dados.recarregar} />
  else if (!dados.data.medicoes.length) corpo = <Vazio icone="prancheta" titulo="Nenhuma medição para mostrar" texto="Suba a planilha da 1ª medição." />
  else if (alvo.tipo === 'Contrato') corpo = <PainelContrato medicoes={dados.data.medicoes} itens={dados.data.itens} inicial={alvo.escolhidos} />
  else corpo = <PainelEmpreiteiro medicoes={dados.data.medicoes} itens={dados.data.itens} inicial={alvo.escolhidos} />

  return (
    <div className="med-painel">
      <div className="so-impressao">Nova Obra · {titulo} · {obra.nome} ({obra.codigo})</div>
      <div className="med-painel-topo nao-imprimir">
        <button className="back" onClick={voltar}><Icon nome="back" />Medições</button>
        {dados.data?.medicoes.length > 0 && <button className="btn btn-ghost" onClick={() => window.print()}>Imprimir</button>}
      </div>
      <h2 className="med-painel-titulo">{titulo}</h2>
      {corpo}
    </div>
  )
}
