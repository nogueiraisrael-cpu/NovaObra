// Corrigir um diário de dia que já passou (aba Diários). Só a tela: quem confere e decide o
// que muda é planejarCorrecao (src/lib/diarios.js), chamada por corrigirDiario em dados.js.
import { useState } from 'react'
import { corrigirDiario, fecharDiaAnterior, opcoesDaCorrecao } from '../lib/dados.js'
import { useDados } from '../lib/useDados.js'
import { efetivoCorrigivel, presentesNaCorrecao } from '../lib/diarios.js'
import { formatarDataLonga } from '../lib/datas.js'
import { SITUACOES_EFETIVO_CORRIGIVEIS, SITUACOES_FRENTE_DIA, MOTIVOS_PARADA, SITUACOES_EQUIPAMENTO_TOQUE, SITUACAO_EQUIPAMENTO_CONCLUIDO } from '../lib/listas.js'
import { BlocoClima, Icon, Pill, useToast, COR_EFETIVO, COR_FRENTE_DIA, COR_EQUIP } from '../components/index.jsx'

function formularioDe(d) {
  return {
    clima_manha: d.clima_manha, clima_tarde: d.clima_tarde,
    praticavel_manha: d.praticavel_manha, praticavel_tarde: d.praticavel_tarde,
    observacoes: d.observacoes ?? '',
    efetivo: Object.fromEntries(d.efetivo.map((l) => [l.id, l.situacao])),
    frentes: Object.fromEntries(d.frentes.map((f) => [f.id, {
      descricao: f.descricao ?? '', equipe: f.equipe_ids, situacao: f.situacao, motivo_parada: f.motivo_parada ?? null,
    }])),
    frentes_novas: [],
    frentes_tiradas: [],
    equipamentos: Object.fromEntries(d.equipamentos.map((e) => [e.id, { situacao: e.situacao, observacao: e.observacao ?? '' }])),
    equipamentos_novos: [],
    equipamentos_tirados: [],
  }
}

// Situação, motivo, texto e equipe de uma frente do dia (lançada ou incluída agora).
function CamposFrente({ id, v, mudar, presentes }) {
  const alternar = (fid) => mudar({ equipe: v.equipe.includes(fid) ? v.equipe.filter((x) => x !== fid) : [...v.equipe, fid] })
  return (
    <>
      <div className="label">Situação neste dia</div>
      <div className="seg three">
        {SITUACOES_FRENTE_DIA.map((s) => (
          <button key={s} className={v.situacao === s ? COR_FRENTE_DIA[s] : ''} onClick={() => mudar({ situacao: s })}>{s}</button>
        ))}
      </div>
      {v.situacao === 'Parada' && (
        <>
          <div className="label">Motivo da parada</div>
          <div className="chips">
            {MOTIVOS_PARADA.map((m) => <button key={m} className={`chip${v.motivo_parada === m ? ' on' : ''}`} onClick={() => mudar({ motivo_parada: m })}>{m}</button>)}
          </div>
          {!v.motivo_parada && <div className="err">Escolha o motivo da parada.</div>}
        </>
      )}
      <label className="label" htmlFor={`cd-${id}`}>O que foi feito</label>
      <textarea id={`cd-${id}`} className="field" style={{ minHeight: 76 }} value={v.descricao} onChange={(e) => mudar({ descricao: e.target.value })} />
      <div className="label">Equipe</div>
      {presentes.length === 0 ? <p className="t-muted">Ninguém presente neste dia.</p> : (
        <div className="chips">
          {presentes.map((l) => (
            <button key={l.funcionario_id} className={`chip${v.equipe.includes(l.funcionario_id) ? ' on' : ''}`}
              onClick={() => alternar(l.funcionario_id)}>{l.nome}{l.funcao && <span className="funcao"> · {l.funcao}</span>}</button>
          ))}
        </div>
      )}
    </>
  )
}

// A situação e a observação de um equipamento do dia (o Concluído só se lê).
function CamposEquipamento({ v, mudar }) {
  return (
    <>
      <div className="seg">
        {SITUACOES_EQUIPAMENTO_TOQUE.map((s) => (
          <button key={s} className={v.situacao === s ? COR_EQUIP[s] : ''} onClick={() => mudar({ situacao: s })}>{s}</button>
        ))}
      </div>
      {v.situacao !== 'Operando' && (
        <input className="field" style={{ marginTop: 6 }} aria-label="Observação do equipamento" placeholder="Observação (ex.: sem areia até as 10h)"
          value={v.observacao} onChange={(e) => mudar({ observacao: e.target.value })} />
      )}
    </>
  )
}

// `podeFechar`: o dia ficou "Não fechado" e a pessoa pode fechar diário.
export default function CorrigirDiario({ d, podeFechar, cancelar, salvo }) {
  const toast = useToast()
  const opcoes = useDados(() => opcoesDaCorrecao(d.id), [d.id])
  const [f, setF] = useState(() => formularioDe(d))
  const [acao, setAcao] = useState(null) // null, 'salvar' ou 'fechar': o que está gravando agora
  const [erro, setErro] = useState(null)

  const presentes = presentesNaCorrecao(d.efetivo, f.efetivo)
  const mudarFrente = (id, campos) => setF({ ...f, frentes: { ...f.frentes, [id]: { ...f.frentes[id], ...campos } } })
  const mudarNova = (i, campos) => setF({ ...f, frentes_novas: f.frentes_novas.map((n, j) => (j === i ? { ...n, ...campos } : n)) })
  const mudarEquip = (id, campos) => setF({ ...f, equipamentos: { ...f.equipamentos, [id]: { ...f.equipamentos[id], ...campos } } })
  const mudarEquipNovo = (i, campos) => setF({ ...f, equipamentos_novos: f.equipamentos_novos.map((n, j) => (j === i ? { ...n, ...campos } : n)) })
  const alternarTirada = (lista, id) => setF({ ...f, [lista]: f[lista].includes(id) ? f[lista].filter((x) => x !== id) : [...f[lista], id] })

  const op = opcoes.data
  const frentesParaIncluir = (op?.frentes ?? []).filter((x) => !f.frentes_novas.some((n) => n.frente_id === x.id))
  const equipsParaIncluir = (op?.equipamentos ?? []).filter((x) => !f.equipamentos_novos.some((n) => n.equipamento_id === x.id))
  const nomeFrente = (id) => op?.frentes.find((x) => x.id === id)
  const nomeEquip = (id) => op?.equipamentos.find((x) => x.id === id)

  // `eFechar`: depois de corrigir, fecha o dia que tinha ficado "Não fechado". Se a correção
  // entrou e o fechamento não, tocar de novo refaz os dois sem estrago.
  async function salvar(eFechar = false) {
    if (acao) return
    setAcao(eFechar ? 'fechar' : 'salvar')
    setErro(null)
    const r = await corrigirDiario(d.id, f)
    if (r.erro) { setAcao(null); return setErro(r.erro) }
    if (eFechar) {
      const fechou = await fecharDiaAnterior(d.id)
      if (fechou.erro) { setAcao(null); return setErro(`A correção foi salva, mas o diário não fechou: ${fechou.erro} Toque de novo para fechar.`) }
    }
    setAcao(null)
    toast(eFechar ? 'Diário corrigido e fechado' : 'Diário corrigido')
    salvo()
  }

  return (
    <div>
      <button className="back" onClick={cancelar}><Icon nome="back" />Voltar sem salvar</button>
      <div className="eyebrow" style={{ marginTop: 6 }}>Corrigir diário</div>
      <h2 className="dia-titulo">{formatarDataLonga(d.data)}</h2>
      <div className="sub">A situação do diário ({d.status === 'Fechado' ? 'fechado' : 'não fechado'}) continua a mesma.</div>

      <div className="cols" style={{ marginTop: 16 }}>
        <div>
          <BlocoClima valores={f} mudar={(campos) => setF({ ...f, ...campos })} />
          <section className="block">
            <div className="block-h"><h3>Ocorrências do dia</h3></div>
            <textarea className="field" aria-label="Ocorrências do dia" style={{ minHeight: 96 }} value={f.observacoes}
              onChange={(e) => setF({ ...f, observacoes: e.target.value })} />
          </section>
          <section className="block">
            <div className="block-h"><h3>Equipamentos</h3></div>
            {d.equipamentos.length === 0 && f.equipamentos_novos.length === 0 && <p className="t-muted">Nenhum equipamento neste dia.</p>}
            {d.equipamentos.map((e) => {
              const tirado = f.equipamentos_tirados.includes(e.id)
              const concluido = e.situacao === SITUACAO_EQUIPAMENTO_CONCLUIDO
              return (
                <div className="person" key={e.id}>
                  <div className="person-top"><b>{e.nome}</b><span>{e.codigo}</span></div>
                  {tirado ? <p className="t-muted">Sai deste diário ao salvar.</p>
                    : concluido ? (
                      <div className="row-wrap"><Pill cor={COR_EQUIP[e.situacao]}>{e.situacao}</Pill>{e.observacao && <span className="meta">{e.observacao}</span>}
                        <span className="meta">O Concluído não se corrige aqui.</span></div>
                    ) : <CamposEquipamento v={f.equipamentos[e.id]} mudar={(c) => mudarEquip(e.id, c)} />}
                  {!concluido && (
                    <button className="btn btn-ghost" style={{ marginTop: 6 }} onClick={() => alternarTirada('equipamentos_tirados', e.id)}>
                      {tirado ? 'Manter no diário' : 'Não estava na obra: tirar'}
                    </button>
                  )}
                </div>
              )
            })}
            {f.equipamentos_novos.map((n, i) => (
              <div className="person" key={n.equipamento_id}>
                <div className="person-top"><b>{nomeEquip(n.equipamento_id)?.nome}</b><span>{nomeEquip(n.equipamento_id)?.codigo}</span></div>
                <CamposEquipamento v={n} mudar={(c) => mudarEquipNovo(i, c)} />
                <button className="btn btn-ghost" style={{ marginTop: 6 }}
                  onClick={() => setF({ ...f, equipamentos_novos: f.equipamentos_novos.filter((_, j) => j !== i) })}>Desfazer</button>
              </div>
            ))}
            {equipsParaIncluir.length > 0 && (
              <select className="field" style={{ marginTop: 8 }} aria-label="Incluir equipamento neste dia" value=""
                onChange={(e) => e.target.value && setF({ ...f, equipamentos_novos: [...f.equipamentos_novos, { equipamento_id: e.target.value, situacao: 'Operando', observacao: '' }] })}>
                <option value="">+ Equipamento que estava na obra neste dia</option>
                {equipsParaIncluir.map((x) => <option key={x.id} value={x.id}>{x.nome}{x.codigo ? ` · ${x.codigo}` : ''}</option>)}
              </select>
            )}
          </section>
        </div>
        <div>
          <section className="block">
            <div className="block-h"><h3>Efetivo</h3><span className="count"><b>{presentes.length}</b> presentes de {d.efetivo.length}</span></div>
            {d.efetivo.length === 0 && <p className="t-muted">Nenhum funcionário registrado neste dia.</p>}
            {d.efetivo.map((l) => (
              <div className="person" key={l.id}>
                <div className="person-top"><b>{l.nome}</b><span>{l.funcao}</span></div>
                {efetivoCorrigivel(l.situacao) ? (
                  <div className="seg three">
                    {SITUACOES_EFETIVO_CORRIGIVEIS.map((s) => (
                      <button key={s} className={f.efetivo[l.id] === s ? COR_EFETIVO[s] : ''} onClick={() => setF({ ...f, efetivo: { ...f.efetivo, [l.id]: s } })}>{s}</button>
                    ))}
                  </div>
                ) : (
                  <div className="row-wrap">
                    <Pill cor={COR_EFETIVO[l.situacao]}>{l.situacao}</Pill>
                    {l.obra_destino_nome && <span className="dest">→ {l.obra_destino_nome}</span>}
                    <span className="meta">Deslocamento entre obras não se corrige aqui.</span>
                  </div>
                )}
              </div>
            ))}
          </section>
        </div>
      </div>

      <div className="sec"><h2>Frentes de serviço</h2></div>
      {d.frentes.length === 0 && f.frentes_novas.length === 0 && <p className="note">Nenhuma frente preenchida neste dia.</p>}
      <div className="list">
        {d.frentes.map((fr) => {
          const tirada = f.frentes_tiradas.includes(fr.id)
          const podeTirar = op?.frentes_que_saem.includes(fr.id)
          return (
            <section className="block" key={fr.id}>
              <div className="item-top">
                <div><h3 style={{ fontSize: 18 }}>{fr.nome}</h3><div className="meta">{fr.etapa}</div></div>
                {!tirada && <Pill cor={COR_FRENTE_DIA[f.frentes[fr.id].situacao]}>{f.frentes[fr.id].situacao}</Pill>}
              </div>
              {tirada ? <p className="t-muted">Sai deste diário ao salvar.</p>
                : <CamposFrente id={fr.id} v={f.frentes[fr.id]} mudar={(c) => mudarFrente(fr.id, c)} presentes={presentes} />}
              {podeTirar && (
                <button className="btn btn-ghost" style={{ marginTop: 8 }} onClick={() => alternarTirada('frentes_tiradas', fr.id)}>
                  {tirada ? 'Manter no diário' : 'Não trabalhou neste dia: tirar do diário'}
                </button>
              )}
            </section>
          )
        })}
        {f.frentes_novas.map((n, i) => (
          <section className="block" key={n.frente_id}>
            <div className="item-top">
              <div><div className="eyebrow">Incluída agora</div><h3 style={{ fontSize: 18 }}>{nomeFrente(n.frente_id)?.nome}</h3><div className="meta">{nomeFrente(n.frente_id)?.etapa}</div></div>
            </div>
            <CamposFrente id={`nova-${n.frente_id}`} v={n} mudar={(c) => mudarNova(i, c)} presentes={presentes} />
            <button className="btn btn-ghost" style={{ marginTop: 8 }}
              onClick={() => setF({ ...f, frentes_novas: f.frentes_novas.filter((_, j) => j !== i) })}>Desfazer</button>
          </section>
        ))}
      </div>
      {frentesParaIncluir.length > 0 && (
        <select className="field" style={{ marginTop: 10 }} aria-label="Incluir frente neste dia" value=""
          onChange={(e) => e.target.value && setF({ ...f, frentes_novas: [...f.frentes_novas, { frente_id: e.target.value, situacao: 'Em execução', motivo_parada: null, descricao: '', equipe: [] }] })}>
          <option value="">+ Frente que trabalhou neste dia</option>
          {frentesParaIncluir.map((x) => <option key={x.id} value={x.id}>{x.nome} · {x.etapa}</option>)}
        </select>
      )}
      {opcoes.erro && <div className="err">Não carregou a lista de frentes e equipamentos para incluir: {opcoes.erro}</div>}
      <p className="hint" style={{ marginTop: 10 }}>
        {d.status === 'Fechado'
          ? 'Mudar a situação de uma frente aqui muda também a lista de frentes da obra, menos onde um diário fechado mais novo já decidiu.'
          : podeFechar ? 'Ao fechar o dia, a situação de cada frente passa para a lista de frentes da obra, menos onde um diário fechado mais novo já decidiu.' : ''}
      </p>

      {erro && <div className="err">{erro}</div>}
      {podeFechar && (
        <button className="btn btn-primary btn-full" style={{ marginTop: 20 }} onClick={() => salvar(true)} disabled={Boolean(acao)}>
          {acao === 'fechar' ? 'Salvando e fechando…' : 'Salvar e fechar o dia'}
        </button>
      )}
      <div className={podeFechar ? 'row-wrap' : 'cta row-wrap'} style={podeFechar ? { marginTop: 10 } : undefined}>
        <button className="btn btn-ghost" onClick={cancelar} disabled={Boolean(acao)}>Cancelar</button>
        <button className={`btn ${podeFechar ? 'btn-ghost' : 'btn-primary'}`} style={{ flex: 1 }} onClick={() => salvar()} disabled={Boolean(acao)}>
          {acao === 'salvar' ? 'Salvando…' : podeFechar ? 'Só salvar, sem fechar' : 'Salvar correção'}
        </button>
      </div>
    </div>
  )
}
