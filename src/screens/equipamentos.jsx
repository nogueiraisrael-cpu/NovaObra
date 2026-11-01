// Equipamentos (v1.0 simples) — os que estão na obra atual e os do depósito.
// Equipamento em outra obra não aparece aqui (regra multi-obra). Conserto chega na v1.1.
import { useState } from 'react'
import { listarEquipamentos, salvarEquipamento, mandarEquipamentoParaObra, mandarEquipamentoParaDeposito } from '../lib/dados.js'
import { useDados } from '../lib/useDados.js'
import { useObra } from '../lib/ObraContext.jsx'
import { formatarDiaMes } from '../lib/datas.js'
import { Cabecalho, Carregando, ErroCarga, Gaveta, Vazio, useToast } from '../components/index.jsx'

function FormEquipamento({ fechar, salvo }) {
  const { obra } = useObra()
  const [e, setE] = useState({ nome: '', codigo: '', nesta_obra: true })
  const [erro, setErro] = useState(null)
  async function salvar() {
    const { erro: falhou } = await salvarEquipamento(e)
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
        <button className="btn btn-primary" onClick={salvar}>Salvar</button>
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

  async function mover(promessa, msg) {
    const { erro } = await promessa
    if (erro) return toast(erro, 'bad')
    toast(msg)
    lista.recarregar()
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
          <Cartao key={e.id} e={e} acao={<button className="btn btn-ghost" onClick={() => mover(mandarEquipamentoParaDeposito(e.id), `${e.nome} foi para o depósito`)}>Mandar para o depósito</button>} />
        ))}</div>
        : <Vazio pequeno icone="equip" titulo="Nenhum equipamento nesta obra" texto="Mande um do depósito, aqui embaixo." />}
      <div className="sec"><h2>No depósito</h2><span className="t-muted" style={{ fontSize: 15 }}>{noDeposito.length}</span></div>
      {noDeposito.length
        ? <div className="list two">{noDeposito.map((e) => (
          <Cartao key={e.id} e={e} acao={<button className="btn btn-ghost" onClick={() => mover(mandarEquipamentoParaObra(e.id), `${e.nome} foi para ${obra.nome}`)}>Mandar para {obra.codigo}</button>} />
        ))}</div>
        : <Vazio pequeno icone="equip" titulo="Depósito vazio" />}
      <div className="note" style={{ marginTop: 20, textAlign: 'left', fontSize: 15 }}>Conserto (oficina, defeito, previsão de retorno) chega na v1.1.</div>
      {gaveta}
    </>
  )
}
