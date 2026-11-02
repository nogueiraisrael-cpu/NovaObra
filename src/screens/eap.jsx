// EAP — a árvore de atividades da obra, com código automático (1, 1.1, 1.2.1).
// É a base do Planejamento: as outras sub-abas leem estas mesmas atividades.
// Atividade não se apaga: se arquiva, e volta pela lista "Arquivadas".
// O cronograma também pode entrar por planilha (importarCronograma.jsx).
import { useState } from 'react'
import { salvarAtividade, moverAtividade, arquivarAtividade } from '../lib/dados.js'
import { montarEap, listarArquivadas, maesPossiveis, validarAtividade, diasUteis, trocaDeOrdem, descreverCalendario, idsParaArquivar, idsParaDesarquivar } from '../lib/planejamento.js'
import { comAtividade, comOrdens, comArquivadas } from '../lib/planejamentoLocal.js'
import { hojeISO, formatarDiaMes, formatarData } from '../lib/datas.js'
import { ErroCampo, Gaveta, Icon, Pill, Vazio } from '../components/index.jsx'
import PlanilhaCronograma from './importarCronograma.jsx'

const dias = (n) => `${n} ${n === 1 ? 'dia útil' : 'dias úteis'}`
const periodo = (x) => `${formatarDiaMes(x.inicio)} → ${formatarDiaMes(x.fim)}`

// ---------- criar e editar ----------
function FormAtividade({ lista, calendario, atividade, paiInicial, fechar, salvar }) {
  const hoje = hojeISO()
  const [f, setF] = useState(atividade
    ? { id: atividade.id, titulo: atividade.titulo, data_inicio: atividade.data_inicio, data_fim: atividade.data_fim, pai_id: atividade.pai_id ?? '' }
    : { titulo: '', data_inicio: hoje, data_fim: hoje, pai_id: paiInicial ?? '' })
  const [tocados, setTocados] = useState({})
  const [tentou, setTentou] = useState(false)
  const erros = validarAtividade(f)
  const mostrar = (campo) => (tentou || tocados[campo]) && erros[campo]
  const tocar = (campo) => setTocados((t) => ({ ...t, [campo]: true }))
  const maes = maesPossiveis(lista, atividade?.id ?? null)
  const grupo = atividade && montarEap(lista).find((x) => x.id === atividade.id)?.grupo

  function enviar() {
    setTentou(true)
    if (Object.keys(erros).length) return
    salvar(f)
  }

  return (
    <>
      <div className="eyebrow">{atividade ? 'Editar atividade' : paiInicial ? 'Nova subatividade' : 'Nova atividade'}</div>
      <h2>{atividade ? atividade.titulo : 'Atividade da EAP'}</h2>
      <label className="label" htmlFor="at-titulo">Nome da atividade</label>
      <input id="at-titulo" className="field" placeholder="Ex.: Reboco interno" value={f.titulo}
        onChange={(e) => setF({ ...f, titulo: e.target.value })} onBlur={() => tocar('titulo')} />
      <ErroCampo erro={mostrar('titulo')} />
      <label className="label" htmlFor="at-pai">Fica dentro de</label>
      <select id="at-pai" className="field" value={f.pai_id} onChange={(e) => setF({ ...f, pai_id: e.target.value })}>
        <option value="">Nenhuma (atividade principal)</option>
        {maes.map((m) => <option key={m.id} value={m.id}>{'  '.repeat(m.nivel)}{m.codigo} {m.titulo}</option>)}
      </select>
      <div className="form-2">
        <div>
          <label className="label" htmlFor="at-ini">Início</label>
          <input id="at-ini" type="date" className="field" value={f.data_inicio}
            onChange={(e) => { setF({ ...f, data_inicio: e.target.value }); tocar('data_inicio') }} />
          <ErroCampo erro={mostrar('data_inicio')} />
        </div>
        <div>
          <label className="label" htmlFor="at-fim">Fim</label>
          <input id="at-fim" type="date" className="field" min={f.data_inicio || undefined} value={f.data_fim}
            onChange={(e) => { setF({ ...f, data_fim: e.target.value }); tocar('data_fim') }} />
          <ErroCampo erro={mostrar('data_fim')} />
        </div>
      </div>
      {!erros.data_inicio && !erros.data_fim && <div className="hint">{dias(diasUteis(f.data_inicio, f.data_fim, calendario))} ({descreverCalendario(calendario)}).</div>}
      {grupo && <div className="hint">Esta atividade tem subatividades: na EAP, o período dela vem das subatividades.</div>}
      <div className="sheet-actions">
        <button className="btn btn-ghost" onClick={fechar}>Cancelar</button>
        <button className="btn btn-primary" onClick={enviar}>{atividade ? 'Salvar' : 'Criar atividade'}</button>
      </div>
    </>
  )
}

// ---------- detalhes: editar, subatividade, subir/descer e arquivar ----------
function Detalhes({ linha, lista, calendario, ocupado, editar, nova, mover, arquivar, fechar }) {
  const [confirmar, setConfirmar] = useState(false)
  const filhas = montarEap(lista).filter((x) => x.codigo.startsWith(`${linha.codigo}.`)).length
  return (
    <>
      <div className="eyebrow">{linha.codigo} · {linha.grupo ? 'Grupo' : 'Atividade'}</div>
      <h2>{linha.titulo}</h2>
      <div className="sub">{formatarData(linha.inicio)} → {formatarData(linha.fim)} · {dias(diasUteis(linha.inicio, linha.fim, calendario))}</div>
      {linha.grupo && <div className="hint">Período das {filhas} subatividades.</div>}
      <div className="eap-acoes">
        <button className="btn btn-ghost" disabled={ocupado} onClick={editar}>Editar</button>
        <button className="btn btn-ghost" disabled={ocupado} onClick={nova}>+ Subatividade</button>
        <button className="btn btn-ghost" disabled={ocupado || !trocaDeOrdem(lista, linha.id, -1)} onClick={() => mover(-1)}>↑ Subir</button>
        <button className="btn btn-ghost" disabled={ocupado || !trocaDeOrdem(lista, linha.id, 1)} onClick={() => mover(1)}>↓ Descer</button>
      </div>
      {confirmar
        ? (
          <>
            <div className="banner warn">
              Arquivar {linha.codigo} {linha.titulo}{filhas ? ` e as ${filhas} subatividades dela` : ''}? Ela sai da EAP e das outras abas,
              mas não se apaga: volta pela lista Arquivadas.
            </div>
            <div className="sheet-actions">
              <button className="btn btn-ghost" onClick={() => setConfirmar(false)}>Não</button>
              <button className="btn btn-danger" disabled={ocupado} onClick={arquivar}>Sim, arquivar</button>
            </div>
          </>
        )
        : (
          <div className="sheet-actions">
            <button className="btn btn-danger" disabled={ocupado} onClick={() => setConfirmar(true)}>Arquivar</button>
            <button className="btn btn-ghost" onClick={fechar}>Fechar</button>
          </div>
        )}
    </>
  )
}

export default function Eap({ lista, calendario, gravar, ocupado, atualizar }) {
  // {tipo:'nova', pai} | {tipo:'editar', id} | {tipo:'detalhes', id}
  const [gaveta, setGaveta] = useState(null)
  const [verArquivadas, setVerArquivadas] = useState(false)
  const eap = montarEap(lista)
  const arquivadas = listarArquivadas(lista)
  const aberta = gaveta?.id ? eap.find((x) => x.id === gaveta.id) : null

  function salvar(f) {
    setGaveta(null)
    gravar(() => salvarAtividade(f), { mudar: (d) => comAtividade(d, f), sucesso: f.id ? 'Atividade salva' : 'Atividade criada', falhou: 'Não foi salva' })
  }

  function mover(id, direcao) {
    const troca = trocaDeOrdem(lista, id, direcao)
    gravar(() => moverAtividade(id, direcao), { mudar: troca ? (d) => comOrdens(d, troca) : null, falhou: 'Não mudou de lugar' })
  }

  function arquivar(id, arquivarSim) {
    if (arquivarSim) setGaveta(null)
    const ids = arquivarSim ? idsParaArquivar(lista, id) : idsParaDesarquivar(lista, id)
    gravar(() => arquivarAtividade(id, arquivarSim), {
      mudar: (d) => comArquivadas(d, ids, arquivarSim),
      sucesso: arquivarSim ? 'Atividade arquivada' : 'Atividade de volta na EAP',
      falhou: arquivarSim ? 'Não foi arquivada' : 'Não voltou',
    })
  }

  const gavetas = (
    <>
      <Gaveta aberta={gaveta?.tipo === 'nova' || gaveta?.tipo === 'editar'} fechar={() => setGaveta(null)} rotulo="Atividade">
        {(gaveta?.tipo === 'nova' || (gaveta?.tipo === 'editar' && aberta)) && (
          <FormAtividade lista={lista} calendario={calendario} atividade={gaveta.tipo === 'editar' ? aberta : null} paiInicial={gaveta.pai}
            fechar={() => setGaveta(null)} salvar={salvar} />
        )}
      </Gaveta>
      <Gaveta aberta={gaveta?.tipo === 'detalhes' && Boolean(aberta)} fechar={() => setGaveta(null)} rotulo="Detalhes da atividade">
        {gaveta?.tipo === 'detalhes' && aberta && (
          <Detalhes key={aberta.id} linha={aberta} lista={lista} calendario={calendario} ocupado={ocupado} fechar={() => setGaveta(null)}
            editar={() => setGaveta({ tipo: 'editar', id: aberta.id })} nova={() => setGaveta({ tipo: 'nova', pai: aberta.id })}
            mover={(direcao) => mover(aberta.id, direcao)} arquivar={() => arquivar(aberta.id, true)} />
        )}
      </Gaveta>
    </>
  )

  if (!eap.length && !arquivadas.length) {
    return (
      <>
        <Vazio icone="frente" titulo="A EAP desta obra está vazia"
          texto="Comece pelas etapas grandes (ex.: Demolição, Hidráulica) e depois abra cada uma em subatividades."
          acao={<button className="btn btn-primary" onClick={() => setGaveta({ tipo: 'nova' })}>+ Criar a primeira atividade</button>} />
        <div className="hint" style={{ marginTop: 16 }}>Ou traga o cronograma de uma planilha:</div>
        <PlanilhaCronograma ativas={0} atualizar={atualizar} />
        {gavetas}
      </>
    )
  }

  return (
    <>
      <div className="sec" style={{ marginTop: 8 }}>
        <h2>Estrutura da obra</h2>
        <button className="link" disabled={ocupado} onClick={() => setGaveta({ tipo: 'nova' })}>+ Atividade</button>
      </div>
      <PlanilhaCronograma ativas={eap.length} atualizar={atualizar} />
      {eap.length
        ? (
          <div className="eap">
            {eap.map((x) => (
              <button key={x.id} className={`eap-linha${x.grupo ? ' grupo' : ''}`} style={{ '--nivel': x.nivel }}
                onClick={() => setGaveta({ tipo: 'detalhes', id: x.id })}>
                <span className="eap-cod">{x.codigo}</span>
                <span className="eap-txt">
                  <b>{x.titulo}</b>
                  <span>{periodo(x)} · {dias(diasUteis(x.inicio, x.fim, calendario))}</span>
                </span>
                <Icon nome="chev" />
              </button>
            ))}
          </div>
        )
        : <div className="note">Todas as atividades estão arquivadas. Desarquive uma abaixo ou crie outra.</div>}

      {arquivadas.length > 0 && (
        <>
          <button className="collapsed" onClick={() => setVerArquivadas(!verArquivadas)} aria-expanded={verArquivadas}>
            Arquivadas ({arquivadas.length})<Icon nome={verArquivadas ? 'down' : 'chev'} />
          </button>
          {verArquivadas && (
            <div className="list" style={{ marginTop: 10 }}>
              {arquivadas.map((x) => (
                <div className="item" key={x.id}>
                  <div className="item-top">
                    <div>
                      <h3>{x.titulo}</h3>
                      <div className="meta">{formatarDiaMes(x.data_inicio)} → {formatarDiaMes(x.data_fim)}{x.junto ? ` · com ${x.junto} subatividade${x.junto === 1 ? '' : 's'}` : ''}</div>
                    </div>
                    <Pill>Arquivada</Pill>
                  </div>
                  <button className="btn btn-ghost btn-full" style={{ marginTop: 12 }} disabled={ocupado} onClick={() => arquivar(x.id, false)}>Desarquivar</button>
                </div>
              ))}
            </div>
          )}
        </>
      )}
      {gavetas}
    </>
  )
}
