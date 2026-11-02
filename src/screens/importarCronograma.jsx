// Planilha de cronograma na EAP: "Baixar planilha modelo" e "Importar planilha" (.xlsx ou .csv).
// Tudo é lido no próprio aparelho: o arquivo não é enviado a lugar nenhum. O SheetJS só é
// carregado quando a pessoa toca num dos botões. Nada é gravado antes de "Confirmar importação":
// a tela de conferência mostra a árvore que será criada e os problemas, para corrigir ali.
import { useState } from 'react'
import { importarCronograma, IMPORTACAO_MAXIMO } from '../lib/dados.js'
import { conferirImportacao, paraGravar } from '../lib/importacao.js'
import { gerarModelo, lerPlanilha, lerCsv } from '../lib/planilhaCronograma.js'
import { hojeISO, formatarData } from '../lib/datas.js'
import { ErroCampo, Gaveta, Pill, useToast } from '../components/index.jsx'

const TAMANHO_MAXIMO = 5 * 1024 * 1024
const carregarXlsx = () => import('xlsx')

// Uma linha da conferência: o que foi entendido e, se tiver problema (ou a pessoa pedir), os campos para corrigir.
function LinhaConferida({ l, crua, mudar, tirar }) {
  const [abrir, setAbrir] = useState(false)
  const editando = abrir || l.erros.length > 0
  const campo = (nome, rotulo, extra = {}) => (
    <label className="imp-campo">
      <span>{rotulo}</span>
      <input className="field" value={crua[nome] ?? ''} onChange={(e) => mudar(nome, e.target.value)} {...extra} />
    </label>
  )
  return (
    <div className={`imp-linha${l.erros.length ? ' erro' : ''}`} style={{ '--nivel': l.nivel }}>
      <div className="imp-topo">
        <span className="eap-cod">{l.item || '—'}</span>
        <span className="imp-txt">
          <b>{l.titulo || 'Sem nome'}</b>
          <span>{l.inicio && l.fim && l.fim >= l.inicio ? `${formatarData(l.inicio)} → ${formatarData(l.fim)} · ${l.duracao} ${l.duracao === 1 ? 'dia' : 'dias'}` : 'datas com problema'} · linha {l.linha}</span>
        </span>
        {!l.erros.length && <button className="sub-acao" onClick={() => setAbrir(!abrir)}>{abrir ? 'Fechar' : 'Corrigir'}</button>}
      </div>
      {l.erros.map((e) => <div className="err" key={e}>{e}</div>)}
      {editando && (
        <div className="imp-edicao">
          {campo('item', 'ITEM', { inputMode: 'decimal', placeholder: 'Ex.: 2.1' })}
          {campo('titulo', 'Atividade')}
          {campo('inicio', 'Início', { inputMode: 'numeric', placeholder: 'DD/MM/AAAA' })}
          {campo('fim', 'Término', { inputMode: 'numeric', placeholder: 'DD/MM/AAAA' })}
          {campo('duracao', 'Duração (dias)', { inputMode: 'numeric' })}
          <button className="btn btn-ghost" onClick={tirar}>Tirar esta linha</button>
        </div>
      )}
    </div>
  )
}

function Conferencia({ arquivo, cruas, setCruas, ativas, ocupado, cancelar, confirmar }) {
  const [modo, setModo] = useState(ativas ? null : 'adicionar')
  const [tentou, setTentou] = useState(false)
  const conf = conferirImportacao(cruas)
  const comErro = conf.linhas.filter((l) => l.erros.length).length
  const grande = cruas.length > IMPORTACAO_MAXIMO
  const mudar = (linha, nome, valor) => setCruas(cruas.map((c) => (c.linha === linha ? { ...c, [nome]: valor } : c)))

  function enviar() {
    setTentou(true)
    if (conf.erros || grande || !modo || !cruas.length) return
    confirmar(paraGravar(conf), modo)
  }

  return (
    <>
      <div className="eyebrow">Conferir antes de importar</div>
      <h2>{arquivo}</h2>
      <div className="row-wrap" style={{ marginTop: 10, gap: 6 }}>
        <Pill cor="info">{cruas.length} {cruas.length === 1 ? 'atividade' : 'atividades'}</Pill>
        {comErro > 0 ? <Pill cor="bad">{comErro} com problema</Pill> : cruas.length > 0 && <Pill cor="ok">Tudo certo</Pill>}
      </div>
      <div className="hint">Esta é a árvore que vai entrar na EAP, na ordem dos códigos. Nada foi gravado ainda. Corrija aqui o que estiver em vermelho, ou cancele e corrija na planilha.</div>
      {grande && <div className="banner bad">A planilha tem {cruas.length} atividades; o máximo é {IMPORTACAO_MAXIMO} por vez. Divida em duas planilhas.</div>}
      {!cruas.length && <div className="banner warn">Não sobrou nenhuma atividade para importar.</div>}

      <div className="imp-lista">
        {conf.linhas.map((l) => (
          <LinhaConferida key={l.linha} l={l} crua={cruas.find((c) => c.linha === l.linha)}
            mudar={(nome, valor) => mudar(l.linha, nome, valor)} tirar={() => setCruas(cruas.filter((c) => c.linha !== l.linha))} />
        ))}
      </div>

      {ativas > 0 && (
        <>
          <div className="label" id="imp-modo">Esta obra já tem {ativas} {ativas === 1 ? 'atividade' : 'atividades'} na EAP</div>
          <div className="seg two" role="group" aria-labelledby="imp-modo">
            <button className={modo === 'adicionar' ? 'info' : ''} aria-pressed={modo === 'adicionar'} onClick={() => setModo('adicionar')}>Adicionar</button>
            <button className={modo === 'substituir' ? 'warn' : ''} aria-pressed={modo === 'substituir'} onClick={() => setModo('substituir')}>Substituir</button>
          </div>
          {modo === 'adicionar' && <div className="hint">As da planilha entram depois das que já existem.</div>}
          {modo === 'substituir' && <div className="banner warn">As {ativas} atividades atuais vão para Arquivadas (não são apagadas; dá para desarquivar). Ficam só as da planilha.</div>}
          <ErroCampo erro={tentou && !modo && 'Escolha se quer adicionar ou substituir.'} />
        </>
      )}
      {tentou && conf.erros > 0 && <div className="err">Corrija {comErro === 1 ? 'a linha em vermelho' : `as ${comErro} linhas em vermelho`} para importar.</div>}
      <div className="sheet-actions">
        <button className="btn btn-ghost" onClick={cancelar}>Cancelar</button>
        <button className="btn btn-primary" disabled={ocupado} onClick={enviar}>{ocupado ? 'Importando…' : 'Confirmar importação'}</button>
      </div>
    </>
  )
}

export default function PlanilhaCronograma({ ativas, atualizar }) {
  const toast = useToast()
  const [lendo, setLendo] = useState(false)
  const [ocupado, setOcupado] = useState(false)
  const [aberto, setAberto] = useState(null) // { arquivo, cruas }

  async function baixar() {
    setLendo(true)
    try {
      const XLSX = await carregarXlsx()
      XLSX.writeFile(gerarModelo(XLSX, hojeISO()), 'cronograma-modelo.xlsx')
    } catch (e) {
      console.error('[planilha]', e)
      toast('Não foi possível gerar a planilha. Verifique a internet e tente de novo.', 'bad')
    }
    setLendo(false)
  }

  async function escolher(e) {
    const arquivo = e.target.files[0]
    e.target.value = '' // escolher o mesmo arquivo de novo também funciona
    if (!arquivo) return
    const nome = arquivo.name.toLowerCase()
    if (!nome.endsWith('.xlsx') && !nome.endsWith('.csv')) return toast('Use um arquivo .xlsx ou .csv.', 'bad')
    if (arquivo.size > TAMANHO_MAXIMO) return toast('Arquivo grande demais (máximo 5 MB).', 'bad')
    setLendo(true)
    try {
      const cruas = nome.endsWith('.csv')
        ? lerCsv(await arquivo.text())
        : lerPlanilha(await carregarXlsx(), new Uint8Array(await arquivo.arrayBuffer()))
      if (!cruas.length) toast('Não achei nenhuma atividade abaixo do cabeçalho.', 'bad')
      else setAberto({ arquivo: arquivo.name, cruas })
    } catch (erro) {
      // Planilha fora do padrão é erro da planilha, já explicado na tela: não suja o console.
      // Só o inesperado (arquivo corrompido, pacote que não carregou) vai para o console.
      const daPlanilha = erro.message?.startsWith('Não achei') || erro.message?.startsWith('A planilha')
      if (!daPlanilha) console.error('[planilha]', erro)
      toast(daPlanilha ? erro.message : 'Não consegui ler este arquivo. Ele é mesmo uma planilha .xlsx ou .csv?', 'bad')
    }
    setLendo(false)
  }

  async function confirmar(linhas, modo) {
    setOcupado(true)
    const { data, erro } = await importarCronograma(linhas, modo)
    if (erro) {
      setOcupado(false)
      return toast(`Não foi importada: ${erro}`, 'bad')
    }
    await atualizar()
    setOcupado(false)
    setAberto(null)
    toast(`${data.criadas} atividades importadas${data.arquivadas ? `; ${data.arquivadas} foram para Arquivadas` : ''}`)
  }

  return (
    <>
      <div className="imp-botoes">
        <button className="btn btn-ghost" disabled={lendo} onClick={baixar}>Baixar planilha modelo</button>
        <label className={`btn btn-ghost${lendo ? ' desligado' : ''}`}>
          {lendo ? 'Lendo…' : 'Importar planilha'}
          <input type="file" accept=".xlsx,.csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,text/csv" hidden disabled={lendo} onChange={escolher} />
        </label>
      </div>
      <Gaveta aberta={Boolean(aberto)} fechar={() => !ocupado && setAberto(null)} rotulo="Conferir importação">
        {aberto && (
          <Conferencia arquivo={aberto.arquivo} cruas={aberto.cruas} setCruas={(cruas) => setAberto({ ...aberto, cruas })}
            ativas={ativas} ocupado={ocupado} cancelar={() => setAberto(null)} confirmar={confirmar} />
        )}
      </Gaveta>
    </>
  )
}
