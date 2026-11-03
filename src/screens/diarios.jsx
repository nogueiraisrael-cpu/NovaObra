// Diários — histórico dos RDOs da obra atual, do mais novo para o mais antigo.
// Só leitura: lançar e corrigir o de hoje é na aba Hoje. Tocar num dia abre o
// dia inteiro, com o botão Imprimir (versão limpa pelo navegador).
import { useState } from 'react'
import { listarDiarios, obterDiario } from '../lib/dados.js'
import { useDados } from '../lib/useDados.js'
import { useObra } from '../lib/ObraContext.jsx'
import { situacaoDiario, textoClima, textoResponsavel } from '../lib/diarios.js'
import { rotuloExecutor } from '../lib/frentes.js'
import { hojeISO, formatarDataLonga } from '../lib/datas.js'
import {
  Carregando, ErroCarga, Icon, Pill, Stats, Vazio, ICONE_CLIMA, COR_EFETIVO, COR_EQUIP, COR_FRENTE_DIA,
} from '../components/index.jsx'

const COR_SITUACAO_DIARIO = { 'Fechado': 'ok', 'Em andamento': 'warn', 'Não fechado': 'bad' }
const plural = (n, um, varios) => `${n} ${n === 1 ? um : varios}`

function Miniaturas({ fotos }) {
  if (!fotos.length) return null
  return (
    <div className="thumbs">
      {fotos.map((ft) => <div className="thumb" key={ft.id}><img src={ft.url ?? ft.caminho} alt={ft.legenda || 'Foto do dia'} /></div>)}
    </div>
  )
}

function CartaoDiario({ r, hoje, abrir }) {
  const situacao = situacaoDiario(r, hoje)
  return (
    <button className={`item${situacao === 'Não fechado' ? ' alert' : ''}`} onClick={() => abrir(r.id)}>
      <div className="item-top">
        <div>
          {r.data === hoje && <div className="eyebrow">Hoje</div>}
          <h3>{formatarDataLonga(r.data)}</h3>
          <div className="meta clima-meta">
            {[...new Set([r.clima_manha, r.clima_tarde])].map((c) => <Icon key={c} nome={ICONE_CLIMA[c]} />)}{textoClima(r)}
          </div>
        </div>
        <Pill cor={COR_SITUACAO_DIARIO[situacao]}>{situacao}</Pill>
      </div>
      <div className="lines">
        <div className="line"><span className="dot ok" />{r.presentes} presentes de {r.total}</div>
        <div className={`line${r.frentes_paradas ? ' t-bad' : ''}`}><span className={`dot ${r.frentes_paradas ? 'bad' : 'idle'}`} />{plural(r.frentes_paradas, 'frente parada', 'frentes paradas')}</div>
        <div className="line"><span className="dot idle" />{plural(r.fotos, 'foto', 'fotos')}</div>
      </div>
      <Miniaturas fotos={r.miniaturas} />
    </button>
  )
}

function DiaDoDiario({ id, voltar }) {
  const { obra } = useObra()
  const dia = useDados(() => obterDiario(id), [id])
  const hoje = hojeISO()

  if (dia.carregando) return <Carregando />
  if (dia.erro) {
    return (
      <>
        <button className="back" onClick={voltar}><Icon nome="back" />Todos os diários</button>
        <ErroCarga erro={dia.erro} tentar={dia.recarregar} />
      </>
    )
  }

  const d = dia.data
  const situacao = situacaoDiario(d, hoje)

  return (
    <div className="diario-dia">
      <button className="back nao-imprimir" onClick={voltar}><Icon nome="back" />Todos os diários</button>
      <div className="so-impressao">Nova Obra · Diário de obra · {obra.nome} ({obra.codigo}) · {obra.cidade}</div>
      <div className="item-top" style={{ marginTop: 6 }}>
        <div>
          <h2 className="dia-titulo">{formatarDataLonga(d.data)}</h2>
          <div className="sub">{textoResponsavel(d)}</div>
        </div>
        <Pill cor={COR_SITUACAO_DIARIO[situacao]}>{situacao}</Pill>
      </div>

      <div style={{ marginTop: 16 }}>
        <Stats itens={[
          { valor: d.presentes, de: d.total, rotulo: 'presentes', cor: 'accent' },
          { valor: d.frentes_paradas, rotulo: d.frentes_paradas === 1 ? 'frente parada' : 'frentes paradas', cor: d.frentes_paradas ? 'bad' : '' },
          { valor: d.fotos, rotulo: d.fotos === 1 ? 'foto' : 'fotos' },
        ]} />
      </div>

      <div className="cols" style={{ marginTop: 12 }}>
        <div>
          <section className="block">
            <div className="block-h"><h3>Clima</h3></div>
            {[['Manhã', d.clima_manha, d.praticavel_manha], ['Tarde', d.clima_tarde, d.praticavel_tarde]].map(([per, clima, praticavel]) => (
              <div className="linha-dia" key={per}>
                <span className="clima-meta"><Icon nome={ICONE_CLIMA[clima]} /><b>{per}</b>&nbsp;· {clima}</span>
                <Pill cor={praticavel ? 'ok' : 'bad'}>{praticavel ? 'Praticável' : 'Não praticável'}</Pill>
              </div>
            ))}
          </section>
          <section className="block">
            <div className="block-h"><h3>Equipamentos</h3><span className="count">{d.equipamentos.length} na obra</span></div>
            {d.equipamentos.length === 0 && <p className="t-muted">Nenhum equipamento neste dia.</p>}
            {d.equipamentos.map((e) => (
              <div className="linha-dia" key={e.id}>
                <div><b>{e.nome}</b>{e.codigo && <span className="t-muted"> · {e.codigo}</span>}
                  {e.observacao && <div className="meta">{e.observacao}</div>}</div>
                <Pill cor={COR_EQUIP[e.situacao]}>{e.situacao}</Pill>
              </div>
            ))}
          </section>
        </div>
        <div>
          <section className="block">
            <div className="block-h"><h3>Efetivo</h3><span className="count"><b>{d.presentes}</b> presentes de {d.total}</span></div>
            {d.efetivo.length === 0 && <p className="t-muted">Nenhum funcionário registrado neste dia.</p>}
            {d.efetivo.map((l) => (
              <div className="linha-dia" key={l.id}>
                <div><b>{l.nome}</b><span className="t-muted"> · {l.funcao}</span>
                  {l.obra_destino_nome && <div className="dest" style={{ marginTop: 2 }}>→ {l.obra_destino_nome}</div>}</div>
                <Pill cor={COR_EFETIVO[l.situacao]}>{l.situacao}</Pill>
              </div>
            ))}
          </section>
        </div>
      </div>

      <section className="block" style={{ marginTop: 12 }}>
        <div className="block-h"><h3>Ocorrências do dia</h3></div>
        <p className={d.observacoes ? 'texto-dia' : 't-muted'}>{d.observacoes || 'Nenhuma ocorrência registrada.'}</p>
      </section>

      <div className="sec"><h2>Frentes de serviço</h2><span className="t-muted">{plural(d.frentes.length, 'preenchida', 'preenchidas')}</span></div>
      {d.frentes.length === 0 && <p className="note">Nenhuma frente preenchida neste dia.</p>}
      <div className="list">
        {d.frentes.map((f) => (
          <section className={`block frente-dia${f.situacao === 'Parada' ? ' alert' : ''}`} key={f.id}>
            <div className="item-top">
              <div><h3 style={{ fontSize: 18 }}>{f.nome}</h3><div className="meta">{f.etapa} · {rotuloExecutor(f)}</div></div>
              <Pill cor={COR_FRENTE_DIA[f.situacao]}>{f.situacao}</Pill>
            </div>
            {f.motivo_parada && <div className="t-bad" style={{ fontWeight: 600, marginTop: 10 }}>Motivo: {f.motivo_parada}</div>}
            {f.descricao && <p className="texto-dia" style={{ marginTop: 10 }}>{f.descricao}</p>}
            {f.equipe.length > 0 && <div className="meta" style={{ marginTop: 10 }}>Equipe: {f.equipe.join(', ')}</div>}
            {f.fotos.length > 0 && (
              <div className="fotos-dia">
                {f.fotos.map((ft) => (
                  <figure key={ft.id}><img src={ft.url ?? ft.caminho} alt={ft.legenda || 'Foto da frente'} />{ft.legenda && <figcaption>{ft.legenda}</figcaption>}</figure>
                ))}
              </div>
            )}
          </section>
        ))}
      </div>

      {d.fotos_soltas.length > 0 && (
        <section className="block" style={{ marginTop: 12 }}>
          <div className="block-h"><h3>Outras fotos do dia</h3><span className="count">{d.fotos_soltas.length}</span></div>
          <div className="fotos-dia">
            {d.fotos_soltas.map((ft) => (
              <figure key={ft.id}><img src={ft.url ?? ft.caminho} alt={ft.legenda || 'Foto do dia'} />{ft.legenda && <figcaption>{ft.legenda}</figcaption>}</figure>
            ))}
          </div>
        </section>
      )}

      <div className="cta nao-imprimir">
        <button className="btn btn-ghost btn-full" onClick={() => window.print()}>Imprimir</button>
        {d.data === hoje && <div className="hint" style={{ textAlign: 'center' }}>Para corrigir o diário de hoje, use a aba Hoje.</div>}
      </div>
    </div>
  )
}

export default function Diarios({ irParaHoje }) {
  const lista = useDados(listarDiarios)
  const [aberto, setAberto] = useState(null)
  const hoje = hojeISO()

  function abrir(id) { setAberto(id); window.scrollTo(0, 0) }

  if (aberto) return <div style={{ marginTop: 8 }}><DiaDoDiario id={aberto} voltar={() => { setAberto(null); lista.recarregar() }} /></div>

  if (lista.carregando) return <div style={{ marginTop: 16 }}><Carregando /></div>
  if (lista.erro) return <div style={{ marginTop: 16 }}><ErroCarga erro={lista.erro} tentar={lista.recarregar} /></div>
  if (lista.data.length === 0) {
    return (
      <div style={{ marginTop: 16 }}>
        <Vazio icone="relogio" titulo="Nenhum diário lançado nesta obra ainda."
          texto="O diário de cada dia é lançado na aba Hoje. Depois de lançado, ele aparece aqui."
          acao={<button className="btn btn-primary" onClick={irParaHoje}>Lançar o diário de hoje <Icon nome="arrow" /></button>} />
      </div>
    )
  }

  return (
    <>
      <div className="sec"><h2>Diários</h2><span className="t-muted">{plural(lista.data.length, 'dia', 'dias')}</span></div>
      <div className="list two">{lista.data.map((r) => <CartaoDiario key={r.id} r={r} hoje={hoje} abrir={abrir} />)}</div>
    </>
  )
}
