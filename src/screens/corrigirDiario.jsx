// Corrigir um diário de dia que já passou (aba Diários). Só a tela: quem confere e decide o
// que muda é planejarCorrecao (src/lib/diarios.js), chamada por corrigirDiario em dados.js.
import { useState } from 'react'
import { corrigirDiario } from '../lib/dados.js'
import { efetivoCorrigivel, presentesNaCorrecao } from '../lib/diarios.js'
import { formatarDataLonga } from '../lib/datas.js'
import { SITUACOES_EFETIVO_CORRIGIVEIS } from '../lib/listas.js'
import { BlocoClima, Icon, Pill, useToast, COR_EFETIVO, COR_FRENTE_DIA } from '../components/index.jsx'

function formularioDe(d) {
  return {
    clima_manha: d.clima_manha, clima_tarde: d.clima_tarde,
    praticavel_manha: d.praticavel_manha, praticavel_tarde: d.praticavel_tarde,
    observacoes: d.observacoes ?? '',
    efetivo: Object.fromEntries(d.efetivo.map((l) => [l.id, l.situacao])),
    frentes: Object.fromEntries(d.frentes.map((f) => [f.id, { descricao: f.descricao ?? '', equipe: f.equipe_ids }])),
  }
}

export default function CorrigirDiario({ d, cancelar, salvo }) {
  const toast = useToast()
  const [f, setF] = useState(() => formularioDe(d))
  const [salvando, setSalvando] = useState(false)
  const [erro, setErro] = useState(null)

  const presentes = presentesNaCorrecao(d.efetivo, f.efetivo)
  const mudarFrente = (id, campos) => setF({ ...f, frentes: { ...f.frentes, [id]: { ...f.frentes[id], ...campos } } })
  function alternarEquipe(frenteId, funcionarioId) {
    const atual = f.frentes[frenteId].equipe
    mudarFrente(frenteId, { equipe: atual.includes(funcionarioId) ? atual.filter((x) => x !== funcionarioId) : [...atual, funcionarioId] })
  }

  async function salvar() {
    if (salvando) return
    setSalvando(true)
    setErro(null)
    const r = await corrigirDiario(d.id, f)
    setSalvando(false)
    if (r.erro) return setErro(r.erro)
    toast('Diário corrigido')
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
      {d.frentes.length === 0 && <p className="note">Nenhuma frente preenchida neste dia.</p>}
      <div className="list">
        {d.frentes.map((fr) => (
          <section className="block" key={fr.id}>
            <div className="item-top">
              <div><h3 style={{ fontSize: 18 }}>{fr.nome}</h3><div className="meta">{fr.etapa}</div></div>
              <Pill cor={COR_FRENTE_DIA[fr.situacao]}>{fr.situacao}</Pill>
            </div>
            <label className="label" htmlFor={`cd-${fr.id}`}>O que foi feito</label>
            <textarea id={`cd-${fr.id}`} className="field" style={{ minHeight: 76 }} value={f.frentes[fr.id].descricao}
              onChange={(e) => mudarFrente(fr.id, { descricao: e.target.value })} />
            <div className="label">Equipe</div>
            {presentes.length === 0 ? <p className="t-muted">Ninguém presente neste dia.</p> : (
              <div className="chips">
                {presentes.map((l) => (
                  <button key={l.funcionario_id} className={`chip${f.frentes[fr.id].equipe.includes(l.funcionario_id) ? ' on' : ''}`}
                    onClick={() => alternarEquipe(fr.id, l.funcionario_id)}>{l.nome}</button>
                ))}
              </div>
            )}
          </section>
        ))}
      </div>
      <p className="hint" style={{ marginTop: 10 }}>A situação de cada frente (Parada, Concluída) não muda por aqui: ela mexe nos dias seguintes.</p>

      {erro && <div className="err">{erro}</div>}
      <div className="cta row-wrap">
        <button className="btn btn-ghost" onClick={cancelar} disabled={salvando}>Cancelar</button>
        <button className="btn btn-primary" style={{ flex: 1 }} onClick={salvar} disabled={salvando}>{salvando ? 'Salvando…' : 'Salvar correção'}</button>
      </div>
    </div>
  )
}
