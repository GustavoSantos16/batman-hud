/**
 * wheel.js — desenha a roda do HUD: geometria em SVG, marcadores em HTML,
 * seleção, sequência de boot e atualização de progresso.
 */

import * as State from './state.js';
import { caminhoArco, escapeHTML, movimentoReduzido, pontoPolar } from './utils.js';
import { iconeSeguro } from './icons.js';

/* --- Geometria (unidades do viewBox 0 0 900 900) --- */
const CX = 450;
const CY = 450;
const RAIO_ANEL_1 = 345;
const RAIO_ANEL_2 = 248;
const MAX_POR_ANEL = 16;
const ARCO_GRAUS = 26;
const RAIO_RADIAL_INICIO = 176;

/* --- Elementos --- */
let elRoda;
let elMarcadores;
let elArcos;
let elCentro;
let elTicks;
let elOrbita2;
let elArcoContainer;
let elRadial;
let temporizadorBoot = null;

/** Converte um índice em ângulo (graus), começando no topo (−90°). */
function anguloDe(indice, total) {
  return -90 + (indice * 360) / total;
}

/**
 * Distribui as metas entre os anéis: até 16 no externo, o resto no interno.
 * Devolve [{ meta, raio, angulo, indice }].
 */
function distribuir(metas) {
  const externas = metas.slice(0, MAX_POR_ANEL);
  const internas = metas.slice(MAX_POR_ANEL);

  const posicoes = externas.map((meta, i) => ({
    meta,
    raio: RAIO_ANEL_1,
    angulo: anguloDe(i, externas.length),
    indice: i,
  }));

  internas.forEach((meta, i) => {
    posicoes.push({
      meta,
      raio: RAIO_ANEL_2,
      angulo: anguloDe(i, internas.length),
      indice: MAX_POR_ANEL + i,
    });
  });

  return posicoes;
}

/* ------------------------------------------------------------------
   Geometria decorativa (ticks e hachuras) — desenhada uma vez só
   ------------------------------------------------------------------ */
function desenharTicks() {
  const partes = [];

  // 72 ticks na borda; a cada 6 um tick maior.
  for (let i = 0; i < 72; i += 1) {
    const angulo = anguloDe(i, 72);
    const maior = i % 6 === 0;
    const p0 = pontoPolar(CX, CY, maior ? 404 : 412, angulo);
    const p1 = pontoPolar(CX, CY, 420, angulo);
    partes.push(
      `<line class="${maior ? 'tick--maior' : ''}" x1="${p0.x.toFixed(1)}" y1="${p0.y.toFixed(1)}" x2="${p1.x.toFixed(1)}" y2="${p1.y.toFixed(1)}"></line>`,
    );
  }

  // Hachuras curtas em dois quadrantes, só para dar textura ao HUD.
  for (let i = 0; i < 26; i += 1) {
    const angulo = 118 + i * 1.8;
    const p0 = pontoPolar(CX, CY, 366, angulo);
    const p1 = pontoPolar(CX, CY, 384, angulo);
    partes.push(
      `<line class="hachura" x1="${p0.x.toFixed(1)}" y1="${p0.y.toFixed(1)}" x2="${p1.x.toFixed(1)}" y2="${p1.y.toFixed(1)}"></line>`,
    );
  }
  for (let i = 0; i < 14; i += 1) {
    const angulo = -62 + i * 1.8;
    const p0 = pontoPolar(CX, CY, 366, angulo);
    const p1 = pontoPolar(CX, CY, 378, angulo);
    partes.push(
      `<line class="hachura" x1="${p0.x.toFixed(1)}" y1="${p0.y.toFixed(1)}" x2="${p1.x.toFixed(1)}" y2="${p1.y.toFixed(1)}"></line>`,
    );
  }

  elTicks.innerHTML = partes.join('');
}

/* ------------------------------------------------------------------
   Render
   ------------------------------------------------------------------ */

/** Redesenha marcadores, arcos e núcleo. `comBoot` dispara a animação. */
export function render({ comBoot = false } = {}) {
  const metas = State.metasVisiveis();
  const posicoes = distribuir(metas);

  // SVGElement não tem a propriedade `hidden`; controlamos pelo display.
  elOrbita2.style.display = metas.length > MAX_POR_ANEL ? "" : "none";

  renderArcos(posicoes);
  renderMarcadores(posicoes);
  renderCentro(metas);
  atualizarSelecao();

  if (comBoot) tocarBoot();
}

function renderArcos(posicoes) {
  elArcos.innerHTML = posicoes
    .map(({ meta, raio, angulo, indice }) => {
      const progresso = State.calcularProgresso(meta);
      const d = caminhoArco(CX, CY, raio, angulo - ARCO_GRAUS / 2, angulo + ARCO_GRAUS / 2);
      const classes = ['arco-meta', progresso >= 100 ? 'is-completo' : ''].filter(Boolean).join(' ');
      return `
        <path class="arco-meta__trilho" d="${d}" style="--i:${indice}"></path>
        <path class="${classes}" data-arco-meta="${escapeHTML(meta.id)}" d="${d}"
              pathLength="100" stroke-dasharray="${progresso} 100" style="--i:${indice}"></path>
      `;
    })
    .join('');
}

function renderMarcadores(posicoes) {
  elMarcadores.innerHTML = posicoes
    .map(({ meta, raio, angulo, indice }) => {
      const progresso = State.calcularProgresso(meta);
      const ponto = pontoPolar(CX, CY, raio, angulo);
      const esquerda = ((ponto.x / 900) * 100).toFixed(3);
      const topo = ((ponto.y / 900) * 100).toFixed(3);
      const titulo = escapeHTML(meta.titulo);
      // Vetor unitário apontando para o centro: a porcentagem é deslocada
      // por ele para nunca cruzar o arco, em qualquer posição da roda.
      const rad = (angulo * Math.PI) / 180;
      const ux = (-Math.cos(rad)).toFixed(4);
      const uy = (-Math.sin(rad)).toFixed(4);
      const metadeInferior = Math.sin(rad) > 0.001;

      return `
        <button type="button"
                class="marcador${metadeInferior ? ' marcador--inferior' : ''}${progresso >= 100 ? ' is-completo' : ''}"
                data-meta-id="${escapeHTML(meta.id)}"
                style="left:${esquerda}%;top:${topo}%;--i:${indice};--ux:${ux};--uy:${uy}"
                aria-pressed="false"
                aria-label="${titulo} — ${progresso}% concluído">
          <span class="marcador__icone"><i class="${escapeHTML(iconeSeguro(meta.icone))}" aria-hidden="true"></i></span>
          <span class="marcador__pct" data-pct>${progresso}%</span>
          <span class="marcador__tooltip" aria-hidden="true">${titulo}</span>
        </button>
      `;
    })
    .join('');
}

function renderCentro(metas) {
  const container = State.getContainerAtivo();
  const nome = escapeHTML(container?.nome || '');

  if (!metas.length) {
    elCentro.innerHTML = `
      <p class="centro__vazio">Nenhuma meta<br>neste container</p>
      <button type="button" class="btn btn--destaque" data-acao="primeira-meta">
        <i class="fa-solid fa-plus" aria-hidden="true"></i> Criar primeira meta
      </button>
    `;
    elArcoContainer.setAttribute('stroke-dasharray', '0 100');
    elArcoContainer.classList.remove('completo');
    return;
  }

  const progresso = State.progressoContainer(container.id);
  const completo = progresso >= 100;

  elCentro.innerHTML = `
    <p class="centro__num${completo ? ' completo' : ''}" data-centro-num aria-live="polite">
      ${progresso}<sup>%</sup>
    </p>
    <p class="centro__rotulo">${nome}</p>
    <p class="centro__contagem">${metas.length} ${metas.length === 1 ? 'meta' : 'metas'}</p>
  `;

  elArcoContainer.setAttribute('stroke-dasharray', `${progresso} 100`);
  elArcoContainer.classList.toggle('completo', completo);
}

/** Atualiza só o que muda quando o progresso de uma meta mexe. */
export function atualizarProgressoDaMeta(metaId) {
  const meta = State.getMeta(metaId);
  if (!meta) return;

  const progresso = State.calcularProgresso(meta);
  const completo = progresso >= 100;

  const marcador = elMarcadores.querySelector(`[data-meta-id="${CSS.escape(metaId)}"]`);
  if (marcador) {
    marcador.querySelector('[data-pct]').textContent = `${progresso}%`;
    marcador.classList.toggle('is-completo', completo);
    marcador.setAttribute('aria-label', `${meta.titulo} — ${progresso}% concluído`);
  }

  const arco = elArcos.querySelector(`[data-arco-meta="${CSS.escape(metaId)}"]`);
  if (arco) {
    arco.setAttribute('stroke-dasharray', `${progresso} 100`);
    arco.classList.toggle('is-completo', completo);
  }

  // O núcleo mostra a média do container, então também precisa acompanhar.
  const container = State.getContainerAtivo();
  if (container) {
    const media = State.progressoContainer(container.id);
    const num = elCentro.querySelector('[data-centro-num]');
    if (num) {
      num.innerHTML = `${media}<sup>%</sup>`;
      num.classList.toggle('completo', media >= 100);
    }
    elArcoContainer.setAttribute('stroke-dasharray', `${media} 100`);
    elArcoContainer.classList.toggle('completo', media >= 100);
  }
}

/** Aplica as classes de seleção e desenha a linha radial. */
export function atualizarSelecao() {
  const selecionada = State.getMetaSelecionada();
  const id = selecionada?.id || null;

  elMarcadores.querySelectorAll('.marcador').forEach((botao) => {
    const ativo = botao.dataset.metaId === id;
    botao.classList.toggle('is-selecionado', ativo);
    botao.setAttribute('aria-pressed', String(ativo));
  });

  elArcos.querySelectorAll('.arco-meta').forEach((arco) => {
    arco.classList.toggle('is-selecionado', arco.dataset.arcoMeta === id);
  });

  if (!id) {
    elRadial.setAttribute('d', '');
    return;
  }

  // Linha radial do núcleo até o marcador selecionado.
  const metas = State.metasVisiveis();
  const posicao = distribuir(metas).find((p) => p.meta.id === id);
  if (!posicao) {
    elRadial.setAttribute('d', '');
    return;
  }

  const inicio = pontoPolar(CX, CY, RAIO_RADIAL_INICIO, posicao.angulo);
  const fim = pontoPolar(CX, CY, Math.max(RAIO_RADIAL_INICIO + 8, posicao.raio - 64), posicao.angulo);
  elRadial.setAttribute('d', `M ${inicio.x.toFixed(1)} ${inicio.y.toFixed(1)} L ${fim.x.toFixed(1)} ${fim.y.toFixed(1)}`);
}

/** Sequência de boot: anéis se desenham e marcadores entram em cascata. */
export function tocarBoot() {
  if (movimentoReduzido()) return;

  clearTimeout(temporizadorBoot);
  elRoda.classList.remove('roda--boot');
  // Força o reflow para a animação reiniciar do zero.
  void elRoda.offsetWidth;
  elRoda.classList.add('roda--boot');

  const quantidade = State.metasVisiveis().length;
  const duracao = 1200 + quantidade * 40;
  temporizadorBoot = setTimeout(() => elRoda.classList.remove('roda--boot'), duracao);
}

/* ------------------------------------------------------------------
   Eventos
   ------------------------------------------------------------------ */
function ligarEventos() {
  // Clique num marcador seleciona a meta.
  elMarcadores.addEventListener('click', (evento) => {
    const botao = evento.target.closest('.marcador');
    if (!botao) return;
    State.selecionarMeta(botao.dataset.metaId);
  });

  // Hover destaca também o arco correspondente.
  elMarcadores.addEventListener('pointerover', (evento) => {
    const botao = evento.target.closest('.marcador');
    if (!botao) return;
    const arco = elArcos.querySelector(`[data-arco-meta="${CSS.escape(botao.dataset.metaId)}"]`);
    arco?.classList.add('is-hover');
  });
  elMarcadores.addEventListener('pointerout', (evento) => {
    const botao = evento.target.closest('.marcador');
    if (!botao) return;
    const arco = elArcos.querySelector(`[data-arco-meta="${CSS.escape(botao.dataset.metaId)}"]`);
    arco?.classList.remove('is-hover');
  });

  // Botão do estado vazio.
  elCentro.addEventListener('click', (evento) => {
    if (evento.target.closest('[data-acao="primeira-meta"]')) {
      document.dispatchEvent(new CustomEvent('hud:nova-meta'));
    }
  });
}

/** Reage às mudanças de estado. */
function aoMudarEstado(evento) {
  switch (evento.tipo) {
    case 'selecao':
      atualizarSelecao();
      break;
    case 'meta:progresso':
      atualizarProgressoDaMeta(evento.metaId);
      break;
    case 'container:trocado':
    case 'reset':
      render({ comBoot: true });
      break;
    case 'meta:criada':
    case 'meta:excluida':
    case 'meta:editada':
    case 'containers':
      render();
      break;
    default:
      break;
  }
}

/** Inicializa a roda. */
export function iniciar() {
  elRoda = document.getElementById('roda');
  elMarcadores = document.getElementById('roda-marcadores');
  elArcos = document.getElementById('roda-arcos');
  elCentro = document.getElementById('roda-centro');
  elTicks = document.getElementById('roda-ticks');
  elOrbita2 = document.getElementById('anel-orbita-2');
  elArcoContainer = document.getElementById('arco-container');
  elRadial = document.getElementById('radial-selecao');

  desenharTicks();
  ligarEventos();
  State.subscribe(aoMudarEstado);
  render({ comBoot: true });
}
