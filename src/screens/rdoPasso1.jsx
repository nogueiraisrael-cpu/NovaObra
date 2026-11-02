// RDO passo 1 — clima, efetivo e equipamentos. Cada toque já salva; não há botão Salvar.
import { useState } from 'react'
import {
  listarEfetivoHoje, marcarEfetivo, listarFuncionariosParaTrazer, trazerFuncionario, devolverFuncionario,
  listarDestinosDeslocamento, listarEquipamentosHoje, marcarEquipamentoDia, listarEquipamentos,
  mandarEquipamentoParaObra, salvarRdo,
} from '../lib/dados.js'
import { useDados } from '../lib/useDados.js'
import { resumoEfetivo } from '../lib/efetivo.js'
import { CLIMAS, SITUACOES_EFETIVO_TOQUE, SITUACOES_EQUIPAMENTO_DIA } from '../lib/listas.js'
import { Carregando, ErroCarga, Gaveta, Icon, Pill, Stats, useToast, ICONE_CLIMA, COR_EFETIVO, COR_EQUIP } from '../components/index.jsx'

function BlocoClima({ rdo, salvar }) {
  const valores = {
    clima_manha: rdo?.clima_manha ?? 'Bom', clima_tarde: rdo?.clima_tarde ?? 'Bom',
    praticavel_manha: rdo?.praticavel_manha ?? true, praticavel_tarde: rdo?.praticavel_tarde ?? true,
  }
  return (
    <section className="block">
      <div className="block-h"><h3>Clima</h3></div>
      {[['manha', 'Manhã'], ['tarde', 'Tarde']].map(([per, rotulo]) => (
        <div key={per}>
          <div className="period">{rotulo}</div>
          <div className="opts">
            {CLIMAS.map((c) => (
              <button key={c} className={`opt${valores[`clima_${per}`] === c ? ' on' : ''}`} onClick={() => salvar({ [`clima_${per}`]: c })}>
                <Icon nome={ICONE_CLIMA[c]} />{c}
              </button>
            ))}
          </div>
          <div className="toggle-row">
            Praticável
            <button className={`switch${valores[`praticavel_${per}`] ? ' on' : ''}`} role="switch" aria-checked={valores[`praticavel_${per}`]}
              aria-label={`Praticável — ${rotulo}`} onClick={() => salvar({ [`praticavel_${per}`]: !valores[`praticavel_${per}`] })} />
          </div>
        </div>
      ))}
    </section>
  )
}

export default function RdoPasso1({ rdo, aoMudarRdo, avancar }) {
  const toast = useToast()
  const efetivo = useDados(listarEfetivoHoje)
  const equips = useDados(listarEquipamentosHoje)
  const [gaveta, setGaveta] = useState(null) // { tipo: 'destino'|'trazer'|'equip', ... }
  const [opcoes, setOpcoes] = useState([])
  const [obs, setObs] = useState(rdo?.observacoes ?? '')

  async function depoisDe(promessa, ...recarregar) {
    const { erro } = await promessa
    if (erro) toast(erro, 'bad')
    await Promise.all(recarregar.map((r) => r.recarregar()))
    aoMudarRdo()
    return !erro
  }

  async function salvarClima(campos) {
    await depoisDe(salvarRdo(campos))
  }

  async function tocarEfetivo(item, situacao) {
    if (situacao === item.situacao) return
    if (situacao === 'Deslocado') {
      const { data } = await listarDestinosDeslocamento()
      if (!data.length) return toast('Não há outra obra em andamento para deslocar.', 'bad')
      setOpcoes(data)
      setGaveta({ tipo: 'destino', item })
      return
    }
    await depoisDe(marcarEfetivo(item.funcionario.id, situacao), efetivo)
  }

  async function escolherDestino(obraDestinoId) {
    const { item } = gaveta
    setGaveta(null)
    await depoisDe(marcarEfetivo(item.funcionario.id, 'Deslocado', obraDestinoId), efetivo)
  }

  async function abrirTrazer() {
    const { data } = await listarFuncionariosParaTrazer()
    setOpcoes(data)
    setGaveta({ tipo: 'trazer' })
  }

  async function trazer(f) {
    setGaveta(null)
    if (await depoisDe(trazerFuncionario(f.id), efetivo)) toast(`${f.nome} entrou no efetivo de hoje`)
  }

  async function abrirEquip() {
    const { data } = await listarEquipamentos()
    setOpcoes(data.noDeposito)
    setGaveta({ tipo: 'equip' })
  }

  async function chegouEquip(e) {
    setGaveta(null)
    if (await depoisDe(mandarEquipamentoParaObra(e.id), equips)) toast(`${e.nome} chegou na obra`)
  }

  if (efetivo.carregando || equips.carregando) return <Carregando />
  if (efetivo.erro || equips.erro) return <ErroCarga erro={efetivo.erro || equips.erro} tentar={() => { efetivo.recarregar(); equips.recarregar() }} />

  const r = resumoEfetivo(efetivo.data)

  return (
    <>
      <Stats itens={[
        { valor: r.presentes, rotulo: `presentes de ${r.total}`, cor: 'accent' },
        { valor: r.faltas, rotulo: 'faltas e atestados', cor: r.faltas ? 'bad' : '' },
        { valor: r.deslocados, rotulo: r.deslocados === 1 ? 'deslocado para outra obra' : 'deslocados para outra obra' },
      ]} />
      <div className="cols" style={{ marginTop: 12 }}>
        <div>
          <BlocoClima rdo={rdo} salvar={salvarClima} />
          <section className="block">
            <div className="block-h"><h3>Equipamentos</h3><span className="count">{equips.data.length} na obra</span></div>
            {equips.data.length === 0 && <p className="t-muted">Nenhum equipamento nesta obra.</p>}
            {equips.data.map((x) => (
              <div className="person" key={x.equipamento.id}>
                <div className="person-top"><b>{x.equipamento.nome}</b><span>{x.equipamento.codigo}</span></div>
                <div className="seg three">
                  {SITUACOES_EQUIPAMENTO_DIA.map((s) => (
                    <button key={s} className={x.situacao === s ? COR_EQUIP[s] : ''}
                      onClick={() => depoisDe(marcarEquipamentoDia(x.equipamento.id, s), equips)}>{s}</button>
                  ))}
                </div>
                {x.situacao !== 'Operando' && (
                  <input className="field" style={{ marginTop: 8 }} aria-label={`Observação — ${x.equipamento.nome}`}
                    placeholder="Observação (opcional)" defaultValue={x.observacao}
                    onBlur={(e) => e.target.value !== x.observacao && depoisDe(marcarEquipamentoDia(x.equipamento.id, x.situacao, e.target.value), equips)} />
                )}
              </div>
            ))}
            <button className="add" onClick={abrirEquip}>+ Equipamento chegou na obra</button>
          </section>
        </div>
        <div>
          <section className="block">
            <div className="block-h"><h3>Efetivo</h3><span className="count"><b>{r.presentes}</b> presentes de {r.total}</span></div>
            {efetivo.data.length === 0 && <p className="t-muted">Nenhum funcionário lotado nesta obra. Cadastre em Pessoas.</p>}
            {efetivo.data.map((item) => (
              <div className="person" key={item.funcionario.id}>
                <div className="person-top">
                  <b>{item.funcionario.nome}</b>
                  <span>{item.funcionario.funcao}</span>
                </div>
                {item.situacao === 'Veio de outra obra' ? (
                  <div className="row-wrap" style={{ justifyContent: 'space-between' }}>
                    <Pill cor="info">Veio de outra obra</Pill>
                    <button className="btn btn-ghost" onClick={() => depoisDe(devolverFuncionario(item.funcionario.id), efetivo)}>Mandar de volta</button>
                  </div>
                ) : (
                  <>
                    <div className="seg">
                      {SITUACOES_EFETIVO_TOQUE.map((s) => (
                        <button key={s} className={item.situacao === s ? COR_EFETIVO[s] : ''} onClick={() => tocarEfetivo(item, s)}>{s}</button>
                      ))}
                    </div>
                    {item.situacao === 'Deslocado' && <div className="dest">→ {item.obra_destino_nome} (só hoje)</div>}
                  </>
                )}
              </div>
            ))}
            <button className="add" onClick={abrirTrazer}>+ Trazer funcionário de outra obra</button>
          </section>
        </div>
      </div>
      <section className="block" style={{ marginTop: 12 }}>
        <div className="block-h"><h3><label htmlFor="ocorr-dia">Ocorrências do dia</label></h3><span className="count">opcional</span></div>
        <textarea id="ocorr-dia" className="field" value={obs} onChange={(e) => setObs(e.target.value)}
          onBlur={() => obs !== (rdo?.observacoes ?? '') && salvarClima({ observacoes: obs })}
          placeholder="Ex.: caminhão de areia chegou às 10h, descarregado no fundo do lote" />
      </section>
      <div className="cta">
        <button className="btn btn-primary" onClick={avancar}>Próximo: frentes de serviço <Icon nome="arrow" /></button>
      </div>

      <Gaveta aberta={gaveta?.tipo === 'destino'} fechar={() => setGaveta(null)} rotulo="Obra de destino">
        <div className="eyebrow">Deslocado só hoje</div>
        <h2>Para qual obra {gaveta?.item?.funcionario.nome} foi?</h2>
        <div className="sub">Amanhã ele volta para a lista desta obra.</div>
        <div className="pick-list" style={{ marginTop: 16 }}>
          {opcoes.map((o) => <button key={o.id} className="pick" onClick={() => escolherDestino(o.id)}><b>{o.nome}</b><Icon nome="chev" style={{ width: 22 }} /></button>)}
        </div>
        <div className="cta"><button className="btn btn-ghost btn-full" onClick={() => setGaveta(null)}>Cancelar</button></div>
      </Gaveta>

      <Gaveta aberta={gaveta?.tipo === 'trazer'} fechar={() => setGaveta(null)} rotulo="Trazer funcionário">
        <div className="eyebrow">Trazer de outra obra</div>
        <h2>Quem veio trabalhar aqui hoje?</h2>
        <div className="sub">Na obra dele, ele fica marcado como Deslocado para esta.</div>
        <div className="pick-list" style={{ marginTop: 16 }}>
          {opcoes.length === 0 && <p className="t-muted">Nenhum funcionário de outra obra disponível.</p>}
          {opcoes.map((f) => (
            <button key={f.id} className="pick" disabled={Boolean(f.presente_em)} onClick={() => trazer(f)}>
              <div><b>{f.nome}</b><span>{f.funcao} · {f.presente_em ? `presente hoje em ${f.presente_em}` : f.lotacao_nome}</span></div>
            </button>
          ))}
        </div>
        <div className="cta"><button className="btn btn-ghost btn-full" onClick={() => setGaveta(null)}>Cancelar</button></div>
      </Gaveta>

      <Gaveta aberta={gaveta?.tipo === 'equip'} fechar={() => setGaveta(null)} rotulo="Equipamento chegou">
        <div className="eyebrow">Equipamentos no depósito</div>
        <h2>Qual equipamento chegou?</h2>
        <div className="pick-list" style={{ marginTop: 16 }}>
          {opcoes.length === 0 && <p className="t-muted">Nenhum equipamento no depósito.</p>}
          {opcoes.map((e) => (
            <button key={e.id} className="pick" onClick={() => chegouEquip(e)}><div><b>{e.nome}</b><span>{e.codigo}</span></div></button>
          ))}
        </div>
        <div className="cta"><button className="btn btn-ghost btn-full" onClick={() => setGaveta(null)}>Cancelar</button></div>
      </Gaveta>
    </>
  )
}
