// RDO passo 1 — clima, efetivo e equipamentos. Cada toque já salva; não há botão Salvar.
import { useState } from 'react'
import {
  listarEfetivoHoje, marcarEfetivo, listarFuncionariosParaTrazer, trazerFuncionario, devolverFuncionario,
  listarDestinosDeslocamento, listarEquipamentosHoje, marcarEquipamentoDia, listarEquipamentos,
  mandarEquipamentoParaObra, salvarRdo, salvarEquipamento, tirarEquipamentoDoRdo, concluirEquipamento,
} from '../lib/dados.js'
import { useDados } from '../lib/useDados.js'
import { resumoEfetivo } from '../lib/efetivo.js'
import { SITUACOES_EFETIVO_TOQUE, SITUACOES_EQUIPAMENTO_TOQUE, SITUACAO_EQUIPAMENTO_CONCLUIDO } from '../lib/listas.js'
import { BlocoClima, Carregando, ErroCarga, Gaveta, Icon, Pill, Stats, useToast, COR_EFETIVO, COR_EQUIP } from '../components/index.jsx'

// Antes de abrir o RDO de hoje, o clima aparece no padrão (Bom e praticável).
const climaDoRdo = (rdo) => ({
  clima_manha: rdo?.clima_manha ?? 'Bom', clima_tarde: rdo?.clima_tarde ?? 'Bom',
  praticavel_manha: rdo?.praticavel_manha ?? true, praticavel_tarde: rdo?.praticavel_tarde ?? true,
})

// Equipamento que não está no depósito (nem cadastrado): entra direto nesta obra.
function NovoEquipamento({ salvo }) {
  const [e, setE] = useState({ nome: '', codigo: '' })
  const [erro, setErro] = useState(null)
  const [salvando, setSalvando] = useState(false)
  async function salvar() {
    if (salvando) return
    setSalvando(true)
    const r = await salvarEquipamento({ ...e, nesta_obra: true })
    setSalvando(false)
    if (r.erro) return setErro(r.erro)
    salvo(r.data)
  }
  return (
    <div style={{ marginTop: 20 }}>
      <div className="eyebrow">Não está na lista?</div>
      <label className="label" htmlFor="rdo-eq-nome">Nome do equipamento</label>
      <input id="rdo-eq-nome" className="field" placeholder="Ex.: Vibrador de imersão" value={e.nome} onChange={(x) => setE({ ...e, nome: x.target.value })} />
      <label className="label" htmlFor="rdo-eq-cod">Código / patrimônio (opcional)</label>
      <input id="rdo-eq-cod" className="field" placeholder="Ex.: VB-01" value={e.codigo} onChange={(x) => setE({ ...e, codigo: x.target.value })} />
      {erro && <div className="err">{erro}</div>}
      <button className="btn btn-primary btn-full" style={{ marginTop: 12 }} onClick={salvar} disabled={salvando}>
        {salvando ? 'Salvando…' : 'Cadastrar e pôr nesta obra'}
      </button>
    </div>
  )
}

export default function RdoPasso1({ rdo, aoMudarRdo, avancar }) {
  const toast = useToast()
  const efetivo = useDados(listarEfetivoHoje)
  const equips = useDados(listarEquipamentosHoje)
  const [gaveta, setGaveta] = useState(null) // { tipo: 'destino'|'trazer'|'equip', ... }
  const [opcoes, setOpcoes] = useState([])
  const [obs, setObs] = useState(rdo?.observacoes ?? '')
  const [tirar, setTirar] = useState(null) // id do equipamento que pede confirmação para sair do RDO
  const [tirando, setTirando] = useState(false)
  const [concluir, setConcluir] = useState(null) // { id, obs }: equipamento que pede confirmação para concluir o uso
  const [concluindo, setConcluindo] = useState(false)

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

  async function cadastrouEquip(e) {
    setGaveta(null)
    await equips.recarregar()
    toast(`${e.nome} cadastrado nesta obra`)
  }

  async function tirarEquip(e) {
    if (tirando) return
    setTirando(true)
    if (await depoisDe(tirarEquipamentoDoRdo(e.id), equips)) toast(`${e.nome} saiu do RDO e voltou para o depósito`)
    setTirar(null)
    setTirando(false)
  }

  async function concluirEquip(e) {
    if (concluindo) return
    setConcluindo(true)
    if (await depoisDe(concluirEquipamento(e.id, concluir.obs), equips)) {
      toast(`${e.nome}: uso concluído, voltou para o depósito`)
      setConcluir(null)
    }
    setConcluindo(false)
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
          <BlocoClima valores={climaDoRdo(rdo)} mudar={salvarClima} />
          <section className="block">
            <div className="block-h"><h3>Equipamentos</h3><span className="count">{equips.data.length} na obra</span></div>
            {equips.data.length === 0 && <p className="t-muted">Nenhum equipamento nesta obra.</p>}
            {equips.data.map((x) => (
              <div className="person" key={x.equipamento.id}>
                <div className="person-top"><b>{x.equipamento.nome}</b><span>{x.equipamento.codigo}</span></div>
                <div className="seg">
                  {SITUACOES_EQUIPAMENTO_TOQUE.map((s) => (
                    <button key={s} className={x.situacao === s && concluir?.id !== x.equipamento.id ? COR_EQUIP[s] : ''}
                      onClick={() => { setConcluir(null); depoisDe(marcarEquipamentoDia(x.equipamento.id, s), equips) }}>{s}</button>
                  ))}
                  <button className={concluir?.id === x.equipamento.id ? COR_EQUIP[SITUACAO_EQUIPAMENTO_CONCLUIDO] : ''}
                    onClick={() => setConcluir({ id: x.equipamento.id, obs: '' })}>{SITUACAO_EQUIPAMENTO_CONCLUIDO}</button>
                </div>
                {concluir?.id === x.equipamento.id && (
                  <div className="note" style={{ marginTop: 8, textAlign: 'left' }}>
                    Concluir o uso de {x.equipamento.nome} nesta obra? Ele sai da obra e volta para o depósito. O diário de hoje guarda a observação.
                    <textarea className="field" style={{ marginTop: 8 }} rows={3} aria-label={`Observação da conclusão — ${x.equipamento.nome}`}
                      placeholder="Observação (opcional). Ex.: concretagem da laje, finalizado em 13/11"
                      value={concluir.obs} onChange={(e) => setConcluir({ ...concluir, obs: e.target.value })} />
                    <div className="row-wrap" style={{ marginTop: 8 }}>
                      <button className="btn btn-ghost" onClick={() => setConcluir(null)} disabled={concluindo}>Cancelar</button>
                      <button className="btn btn-primary" onClick={() => concluirEquip(x.equipamento)} disabled={concluindo}>{concluindo ? 'Concluindo…' : 'Concluir'}</button>
                    </div>
                  </div>
                )}
                {x.situacao !== 'Operando' && concluir?.id !== x.equipamento.id && (
                  <input className="field" style={{ marginTop: 8 }} aria-label={`Observação — ${x.equipamento.nome}`}
                    placeholder="Observação (opcional)" defaultValue={x.observacao}
                    onBlur={(e) => e.target.value !== x.observacao && depoisDe(marcarEquipamentoDia(x.equipamento.id, x.situacao, e.target.value), equips)} />
                )}
                {x.chegou_hoje && (tirar === x.equipamento.id ? (
                  <div className="note" style={{ marginTop: 8, textAlign: 'left' }}>
                    Tirar {x.equipamento.nome} do RDO de hoje? Ele volta para o depósito.
                    {rdo?.status === 'Fechado' && ' O diário de hoje já foi fechado: a linha dele sai do diário.'}
                    <div className="row-wrap" style={{ marginTop: 8 }}>
                      <button className="btn btn-ghost" onClick={() => setTirar(null)} disabled={tirando}>Cancelar</button>
                      <button className="btn btn-danger" onClick={() => tirarEquip(x.equipamento)} disabled={tirando}>{tirando ? 'Tirando…' : 'Sim, tirar'}</button>
                    </div>
                  </div>
                ) : (
                  <button className="link-insumo" style={{ marginTop: 8 }} onClick={() => setTirar(x.equipamento.id)}>Lançado por engano? Tirar da obra</button>
                ))}
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
        {gaveta?.tipo === 'equip' && <NovoEquipamento salvo={cadastrouEquip} />}
        <div className="cta"><button className="btn btn-ghost btn-full" onClick={() => setGaveta(null)}>Cancelar</button></div>
      </Gaveta>
    </>
  )
}
