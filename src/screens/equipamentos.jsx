// Equipamentos (v1.0 simples) — os que estão na obra atual e os do depósito.
// Equipamento em outra obra não aparece aqui (regra multi-obra). Conserto chega na v1.1.
import { useState } from 'react'
import { listarEquipamentos, salvarEquipamento, mandarEquipamentoParaObra, mandarEquipamentoParaDeposito, concluirEquipamento } from '../lib/dados.js'
import { useDados } from '../lib/useDados.js'
import { useObra } from '../lib/ObraContext.jsx'
import { formatarDiaMes } from '../lib/datas.js'
import { Cabecalho, Carregando, ErroCarga, Gaveta, Vazio, useToast } from '../components/index.jsx'

function FormEquipamento({ fechar, salvo }) {
  const { obra } = useObra()
  const [e, setE] = useState({ nome: '', codigo: '', nesta_obra: true })
  const [erro, setErro] = useState(null)
  const [salvando, setSalvando] = useState(false)
  async function salvar() {
    if (salvando) return
    setSalvando(true)
    const { erro: falhou } = await salvarEquipamento(e)
    setSalvando(false)
    if (falhou) return setErro(falhou)
    salvo()
  }
  return (
    <>
      <div className="eyebrow">Novo equipamento</div>
      <h2>Cadastrar equipamento</h2>
      <label className="label" htmlFor="eq-nome">Nome</label>
      <input id="eq-nome" className="field" placeholder="Ex.: Betoneira 400 L" value={e.nome} onChange={(x) => setE({ ...e, nome: x.target.value })} />
      <label className="label" htmlFor="eq-cod">Código / patrimônio</label>
      <input id="eq-cod" className="field" placeholder="Ex.: BT-01" value={e.codigo} onChange={(x) => setE({ ...e, codigo: x.target.value })} />
      <div className="label">Onde está</div>
      <div className="seg two">
        <button className={e.nesta_obra ? 'info' : ''} onClick={() => setE({ ...e, nesta_obra: true })}>{obra.codigo}</button>
        <button className={!e.nesta_obra ? 'info' : ''} onClick={() => setE({ ...e, nesta_obra: false })}>No depósito</button>
      </div>
      {erro && <div className="err">{erro}</div>}
      <div className="sheet-actions">
        <button className="btn btn-ghost" onClick={fechar}>Cancelar</button>
        <button className="btn btn-primary" onClick={salvar} disabled={salvando}>{salvando ? 'Salvando…' : 'Salvar'}</button>
      </div>
    </>
  )
}

function FormConcluir({ e, fechar, concluido }) {
  const [obs, setObs] = useState('')
  const [erro, setErro] = useState(null)
  const [salvando, setSalvando] = useState(false)
  async function concluir() {
    if (salvando) return
    setSalvando(true)
    const { erro: falhou } = await concluirEquipamento(e.id, obs)
    setSalvando(false)
    if (falhou) return setErro(falhou)
    concluido()
  }
  return (
    <>
      <div className="eyebrow">Concluído</div>
      <h2>Concluir o uso de {e.nome}</h2>
      <p className="t-muted">Ele sai desta obra e volta para o depósito. O diário de hoje guarda a observação.</p>
      <label className="label" htmlFor="eq-obs">Observação (opcional)</label>
      <textarea id="eq-obs" className="field" rows={3} placeholder="Ex.: concretagem da laje, finalizado em 13/11"
        value={obs} onChange={(x) => setObs(x.target.value)} />
      {erro && <div className="err">{erro}</div>}
      <div className="sheet-actions">
        <button className="btn btn-ghost" onClick={fechar} disabled={salvando}>Cancelar</button>
        <button className="btn btn-primary" onClick={concluir} disabled={salvando}>{salvando ? 'Concluindo…' : 'Concluir'}</button>
      </div>
    </>
  )
}

function Cartao({ e, acao }) {
  return (
    <div className="item">
      <div className="item-top">
        <div><h3>{e.nome}</h3><div className="meta">{e.codigo ?? 'sem código'} · desde {formatarDiaMes(e.situacao_desde)}</div></div>
      </div>
      <div style={{ marginTop: 12 }}>{acao}</div>
    </div>
  )
}

export default function Equipamentos() {
  const { obra } = useObra()
  const toast = useToast()
  const lista = useDados(listarEquipamentos)
  const [novo, setNovo] = useState(false)
  const [concluir, setConcluir] = useState(null) // o equipamento que pede a observação para concluir o uso
  // Trava os botões enquanto grava: o segundo toque de um clique duplo virava outro pedido,
  // recusado com "está na obra..., mande para o depósito de lá primeiro" (achado de 07/11).
  const [movendo, setMovendo] = useState(false)

  async function mover(acao, msg) {
    if (movendo) return
    setMovendo(true)
    const { erro } = await acao()
    if (erro) toast(erro, 'bad')
    else toast(msg)
    // Só destrava depois de a lista mostrar o equipamento no lugar novo.
    await lista.recarregar()
    setMovendo(false)
  }

  const cabecalho = (
    <Cabecalho eyebrow="Equipamentos" titulo="Equipamentos" sub={`Na obra ${obra.nome} e no depósito`}
      acao={<button className="btn btn-ghost" onClick={() => setNovo(true)}>+ Equipamento</button>} />
  )
  const gaveta = (
    <Gaveta aberta={novo} fechar={() => setNovo(false)} rotulo="Novo equipamento">
      {novo && <FormEquipamento fechar={() => setNovo(false)} salvo={() => { setNovo(false); toast('Equipamento cadastrado'); lista.recarregar() }} />}
    </Gaveta>
  )

  if (lista.carregando) return <>{cabecalho}<Carregando /></>
  if (lista.erro) return <>{cabecalho}<ErroCarga erro={lista.erro} tentar={lista.recarregar} /></>
  const { naObra, noDeposito } = lista.data

  if (!naObra.length && !noDeposito.length) {
    return <>{cabecalho}<Vazio icone="equip" titulo="Nenhum equipamento cadastrado"
      acao={<button className="btn btn-primary" onClick={() => setNovo(true)}>+ Cadastrar o primeiro equipamento</button>} />{gaveta}</>
  }

  return (
    <>
      {cabecalho}
      <div className="sec"><h2>Nesta obra</h2><span className="t-muted" style={{ fontSize: 15 }}>{naObra.length}</span></div>
      {naObra.length
        ? <div className="list two">{naObra.map((e) => (
          <Cartao key={e.id} e={e} acao={(
            <div className="row-wrap">
              <button className="btn btn-ghost" disabled={movendo} onClick={() => mover(() => mandarEquipamentoParaDeposito(e.id), `${e.nome} foi para o depósito`)}>Mandar para o depósito</button>
              <button className="btn btn-ghost" disabled={movendo} onClick={() => setConcluir(e)}>Concluído</button>
            </div>
          )} />
        ))}</div>
        : <Vazio pequeno icone="equip" titulo="Nenhum equipamento nesta obra" texto="Mande um do depósito, aqui embaixo." />}
      <div className="sec"><h2>No depósito</h2><span className="t-muted" style={{ fontSize: 15 }}>{noDeposito.length}</span></div>
      {noDeposito.length
        ? <div className="list two">{noDeposito.map((e) => (
          <Cartao key={e.id} e={e} acao={<button className="btn btn-ghost" disabled={movendo} onClick={() => mover(() => mandarEquipamentoParaObra(e.id), `${e.nome} foi para ${obra.nome}`)}>Mandar para {obra.codigo}</button>} />
        ))}</div>
        : <Vazio pequeno icone="equip" titulo="Depósito vazio" />}
      <div className="note" style={{ marginTop: 20, textAlign: 'left', fontSize: 15 }}>Conserto (oficina, defeito, previsão de retorno) chega na v1.1.</div>
      {gaveta}
      <Gaveta aberta={!!concluir} fechar={() => setConcluir(null)} rotulo="Concluir uso do equipamento">
        {concluir && <FormConcluir e={concluir} fechar={() => setConcluir(null)}
          concluido={() => { toast(`${concluir.nome}: uso concluído, voltou para o depósito`); setConcluir(null); lista.recarregar() }} />}
      </Gaveta>
    </>
  )
}
