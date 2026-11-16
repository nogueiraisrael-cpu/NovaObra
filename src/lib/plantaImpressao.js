// Gestão à Vista — a folha impressa, como texto HTML puro (sem window: tests/plantaGeometria.mjs).
// Não redesenha nada: recebe o MESMO <svg> da tela, já serializado, e põe por cima da MESMA
// imagem. O que se vê é o que sai, inclusive as etapas ocultas e o modo por caminhão.

export function escaparHtml(texto) {
  return String(texto ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

// Planta larga sai deitada; alta, em pé. Errar isso é a planta sair num quarto da folha.
export const orientacaoDaFolha = (largura, altura) => (largura >= altura ? 'landscape' : 'portrait')

// legenda = [{ nome, cor, texto }]; svg = o outerHTML do <svg> da tela; imagem = endereço da planta.
export function htmlDaImpressao({ titulo, subtitulo, filtro, legenda = [], svg, imagem, largura, altura }) {
  const orientacao = orientacaoDaFolha(largura, altura)
  const itens = legenda.map((l) => `<li><i style="background:${escaparHtml(l.cor)}"></i>${escaparHtml(l.nome)}${l.texto ? ` <span>${escaparHtml(l.texto)}</span>` : ''}</li>`).join('')
  // A folha útil: A4 menos margem (mm). A planta ocupa o que sobra abaixo do cabeçalho.
  const [w, h] = orientacao === 'landscape' ? [287, 200] : [200, 287]
  // Tamanho exato da planta em mm (cabe na folha sem distorcer), descontado o cabeçalho.
  const escala = Math.min(w / largura, (h - 18) / altura)
  const pw = (largura * escala).toFixed(1)
  const ph = (altura * escala).toFixed(1)
  return `<!doctype html>
<html lang="pt-BR"><head><meta charset="utf-8"><title>${escaparHtml(titulo)}</title>
<style>
@page { size: A4 ${orientacao}; margin: 5mm; }
* { box-sizing: border-box; margin: 0; padding: 0; }
body { font-family: Arial, sans-serif; color: #111; background: #fff; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
.folha { width: ${w}mm; height: ${h}mm; display: flex; flex-direction: column; }
header { display: flex; justify-content: space-between; align-items: flex-start; gap: 4mm; padding-bottom: 2mm; border-bottom: 0.3mm solid #999; }
header b { font-size: 11pt; } header small { display: block; font-size: 8pt; color: #444; margin-top: 0.5mm; }
ul { list-style: none; display: flex; flex-wrap: wrap; justify-content: flex-end; gap: 1mm 3mm; font-size: 8pt; max-width: 55%; }
li { display: flex; align-items: center; gap: 1mm; } li i { width: 3mm; height: 3mm; border-radius: 0.6mm; display: inline-block; } li span { color: #555; }
.area { flex: 1; min-height: 0; display: flex; align-items: center; justify-content: center; padding-top: 2mm; }
.planta { position: relative; width: ${pw}mm; height: ${ph}mm; }
.planta img, .planta svg { position: absolute; inset: 0; width: 100%; height: 100%; }
</style></head>
<body><div class="folha">
<header><div><b>HB ENGENHARIA · ${escaparHtml(titulo)}</b><small>${escaparHtml(subtitulo)}</small><small>${escaparHtml(filtro)}</small></div><ul>${itens}</ul></header>
<div class="area"><div class="planta"><img src="${escaparHtml(imagem)}" alt="">${svg}</div></div>
</div></body></html>`
}
