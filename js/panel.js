/**
 * panel.js — painel de detalhe da meta ("case file") e edição de progresso.
 */

import * as State from './state.js';
import * as Modais from './modals.js';
import { clamp, escapeHTML, formatarData, paraInteiro } from './utils.js';
import { iconeSeguro } from './icons.js';

const MARCOS = [20, 40, 60, 80, 100];

let elPainel;

/* ------------------------------------------------------------------
   Render
   ------------------------------------------------------------------ */

export function render() {
  const meta = State.getMetaSelecionada();

  if (!meta) {
    elPainel.innerHTML = `
      <div class="painel__vazio">
        <i class="fa-solid fa-crosshairs" aria-hidden="true"></i>
        <p>Selecione uma meta na roda para ver os detalhes.</p>
      </div>
    `;
    return;
  }

  const progresso = State.calcularProgresso(meta);
  const completo = progresso >= 100;

  elPainel.innerHTML = `
    <article class="ficha" data-meta-id="${escapeHTML(meta.id)}">
      <header class="ficha__topo">
        <p class="eyebrow">${meta.categoria ? escapeHTML(meta.categoria) : 'Sem categoria'}</p>
        <div class="ficha__linha-titulo">
          <h2 class="ficha__titulo">
            <i class="${escapeHTML(iconeSeguro(meta.icone))}" aria-hidden="true" style="font-size:0.75em;margin-right:8px;opacity:.7"></i>${escapeHTML(meta.titulo)}
          </h2>
          <div class="ficha__acoes">
            <button type="button" class="btn-icone" data-acao="editar" aria-label="Editar meta">
              <i class="fa-solid fa-pen" aria-hidden="true"></i>
            </button>
            <button type="button" class="btn-icone btn-icone--perigo" data-acao="excluir" aria-label="Excluir meta">
              <i class="fa-solid fa-trash" aria-hidden="true"></i>
            </button>
          </div>
        </div>
        <div class="ficha__divisor"></div>
      </header>

      <div class="progresso">
        <div class="progresso__trilha">
          <div class="progresso__preenchimento${completo ? ' completo' : ''}" data-barra style="width:${progresso}%"></div>
          ${MARCOS.map((m) => `<span class="progresso__marco${progresso >= m ? ' atingido' : ''}" data-marco="${m}" style="left:${m}%"></span>`).join('')}
        </div>
        <p class="progresso__num${completo ? ' completo' : ''}" data-num aria-live="polite" aria-label="Progresso: ${progresso} por cento">
          ${progresso}<sup>%</sup>
        </p>
      </div>

      <section class="bloco">
        <h3 class="bloco__titulo">Descrição do caso</h3>
        <p class="bloco__texto${meta.descricao.trim() ? '' : ' bloco__texto--vazio'}">${
          meta.descricao.trim() ? escapeHTML(meta.descricao) : 'Sem descrição registrada.'
        }</p>
      </section>

      <section class="bloco">
        <h3 class="bloco__titulo">Atualizar progresso</h3>
        ${renderControles(meta)}
      </section>

      <p class="campo__ajuda">
        Criada em ${formatarData(meta.criadoEm)} · Atualizada em ${formatarData(meta.atualizadoEm)}
      </p>
    </article>
  `;
}

function renderControles(meta) {
  if (meta.tipo === 'contador') return renderContador(meta);
  if (meta.tipo === 'percentual') return renderPercentual(meta);
  return renderChecklist(meta);
}

function renderContador(meta) {
  const atual = meta.valorAtual;
  const alvo = meta.valorMeta;
  return `
    <div class="contador">
      <p class="contador__leitura">
        <span class="contador__valor num" data-valor-atual>${atual}<span class="sep">/</span><span class="meta-alvo">${alvo}</span></span>
        ${meta.mensagem ? `<span class="contador__mensagem">${escapeHTML(meta.mensagem)}</span>` : ''}
      </p>
      <div class="contador__controles">
        <button type="button" class="btn-passo" data-acao="menos" data-foco="menos"
                aria-label="Diminuir em 1" ${atual <= 0 ? 'disabled' : ''}>
          <i class="fa-solid fa-minus" aria-hidden="true"></i>
        </button>
        <input type="number" class="campo-numero" data-campo="valor-atual" data-foco="valor"
               value="${atual}" min="0" max="${alvo}" step="1" aria-label="Valor atual">
        <button type="button" class="btn-passo" data-acao="mais" data-foco="mais"
                aria-label="Aumentar em 1" ${alvo > 0 && atual >= alvo ? 'disabled' : ''}>
          <i class="fa-solid fa-plus" aria-hidden="true"></i>
        </button>
      </div>
    </div>
  `;
}

function renderPercentual(meta) {
  const valor = clamp(Math.round(meta.percentual), 0, 100);
  return `
    <div class="percentual">
      <input type="range" data-campo="percentual" data-foco="range"
             min="0" max="100" step="5" value="${valor}" aria-label="Progresso em porcentagem">
      <input type="number" class="campo-numero" data-campo="percentual-numero" data-foco="valor"
             value="${valor}" min="0" max="100" step="1" aria-label="Progresso em porcentagem">
    </div>
  `;
}

function renderChecklist(meta) {
  return `
    <div class="checklist" data-checklist>
      ${renderListaSubtarefas(meta)}
      <div class="checklist__adicionar">
        <input type="text" data-campo="nova-subtarefa" data-foco="nova-subtarefa"
               placeholder="Adicionar subtarefa" aria-label="Nova subtarefa" maxlength="120">
        <button type="button" class="btn" data-acao="adicionar-subtarefa">Adicionar</button>
      </div>
    </div>
  `;
}

function renderListaSubtarefas(meta) {
  const itens = meta.subtarefas || [];
  if (!itens.length) {
    return '<ul data-lista-subtarefas><li class="checklist__vazio">Nenhuma subtarefa ainda.</li></ul>';
  }
  return `
    <ul data-lista-subtarefas>
      ${itens.map((sub) => `
        <li class="subtarefa${sub.concluida ? ' concluida' : ''}">
          <label class="subtarefa__label">
            <input type="checkbox" data-acao="alternar-subtarefa" data-sub-id="${escapeHTML(sub.id)}"
                   data-foco="sub-${escapeHTML(sub.id)}" ${sub.concluida ? 'checked' : ''}>
            <span class="subtarefa__texto">${escapeHTML(sub.texto)}</span>
          </label>
          <button type="button" class="btn-icone btn-icone--perigo" data-acao="remover-subtarefa"
                  data-sub-id="${escapeHTML(sub.id)}" aria-label="Remover subtarefa ${escapeHTML(sub.texto)}">
            <i class="fa-solid fa-xmark" aria-hidden="true"></i>
          </button>
        </li>
      `).join('')}
    </ul>
  `;
}

/* ------------------------------------------------------------------
   Atualização pontual (sem redesenhar o painel inteiro)
   ------------------------------------------------------------------ */

function atualizarLeitura() {
  const meta = State.getMetaSelecionada();
  if (!meta) return;

  const progresso = State.calcularProgresso(meta);
  const completo = progresso >= 100;

  const barra = elPainel.querySelector('[data-barra]');
  if (barra) {
    barra.style.width = `${progresso}%`;
    barra.classList.toggle('completo', completo);
  }

  elPainel.querySelectorAll('[data-marco]').forEach((marco) => {
    marco.classList.toggle('atingido', progresso >= Number(marco.dataset.marco));
  });

  const num = elPainel.querySelector('[data-num]');
  if (num) {
    num.innerHTML = `${progresso}<sup>%</sup>`;
    num.classList.toggle('completo', completo);
    num.setAttribute('aria-label', `Progresso: ${progresso} por cento`);
  }

  if (meta.tipo === 'contador') {
    const leitura = elPainel.querySelector('[data-valor-atual]');
    if (leitura) {
      leitura.innerHTML = `${meta.valorAtual}<span class="sep">/</span><span class="meta-alvo">${meta.valorMeta}</span>`;
    }
    const menos = elPainel.querySelector('[data-acao="menos"]');
    const mais = elPainel.querySelector('[data-acao="mais"]');
    if (menos) menos.disabled = meta.valorAtual <= 0;
    if (mais) mais.disabled = meta.valorMeta > 0 && meta.valorAtual >= meta.valorMeta;

    const campo = elPainel.querySelector('[data-campo="valor-atual"]');
    if (campo && document.activeElement !== campo) campo.value = String(meta.valorAtual);
  }

  if (meta.tipo === 'percentual') {
    const range = elPainel.querySelector('[data-campo="percentual"]');
    const numero = elPainel.querySelector('[data-campo="percentual-numero"]');
    if (range && document.activeElement !== range) range.value = String(meta.percentual);
    if (numero && document.activeElement !== numero) numero.value = String(meta.percentual);
  }

  if (meta.tipo === 'checklist') sincronizarChecklist(meta);
}

/** Redesenha a lista de subtarefas preservando o foco. */
function sincronizarChecklist(meta) {
  const lista = elPainel.querySelector('[data-lista-subtarefas]');
  if (!lista) return;

  const chaveFoco = document.activeElement?.dataset?.foco || null;
  lista.outerHTML = renderListaSubtarefas(meta);

  if (chaveFoco) {
    const alvo = elPainel.querySelector(`[data-foco="${CSS.escape(chaveFoco)}"]`);
    alvo?.focus();
  }
}

/* ------------------------------------------------------------------
   Eventos
   ------------------------------------------------------------------ */

function metaAtual() {
  return State.getMetaSelecionada();
}

function ajustarContador(delta) {
  const meta = metaAtual();
  if (!meta) return;
  const novo = clamp(meta.valorAtual + delta, 0, Math.max(meta.valorMeta, 0));
  if (novo === meta.valorAtual) return;
  State.atualizarMeta(meta.id, { valorAtual: novo });
}

function definirContador(valor) {
  const meta = metaAtual();
  if (!meta) return;
  const novo = clamp(paraInteiro(valor, meta.valorAtual), 0, Math.max(meta.valorMeta, 0));
  State.atualizarMeta(meta.id, { valorAtual: novo });
  atualizarLeitura();
}

function definirPercentual(valor) {
  const meta = metaAtual();
  if (!meta) return;
  const novo = clamp(paraInteiro(valor, meta.percentual), 0, 100);
  if (novo === meta.percentual) return;
  State.atualizarMeta(meta.id, { percentual: novo });
}

function ligarEventos() {
  elPainel.addEventListener('click', async (evento) => {
    const alvo = evento.target.closest('[data-acao]');
    if (!alvo) return;
    const meta = metaAtual();
    if (!meta) return;

    switch (alvo.dataset.acao) {
      case 'editar':
        Modais.abrirModalMeta({ meta, gatilho: alvo });
        break;

      case 'excluir': {
        const ok = await Modais.confirmar({
          titulo: 'Excluir meta',
          mensagem: `A meta <strong>${escapeHTML(meta.titulo)}</strong> será removida permanentemente. Não dá para desfazer.`,
          textoConfirmar: 'Excluir meta',
          gatilho: alvo,
        });
        if (ok) {
          State.excluirMeta(meta.id);
          Modais.toast('Meta excluída.', 'sucesso');
        }
        break;
      }

      case 'menos': ajustarContador(-1); break;
      case 'mais': ajustarContador(1); break;

      case 'adicionar-subtarefa': {
        const campo = elPainel.querySelector('[data-campo="nova-subtarefa"]');
        const texto = campo?.value.trim();
        if (!texto) { campo?.focus(); return; }
        State.adicionarSubtarefa(meta.id, texto);
        campo.value = '';
        campo.focus();
        break;
      }

      case 'remover-subtarefa':
        State.removerSubtarefa(meta.id, alvo.dataset.subId);
        break;

      default: break;
    }
  });

  elPainel.addEventListener('change', (evento) => {
    const meta = metaAtual();
    if (!meta) return;
    const alvo = evento.target;

    if (alvo.dataset.acao === 'alternar-subtarefa') {
      State.alternarSubtarefa(meta.id, alvo.dataset.subId);
      return;
    }
    if (alvo.dataset.campo === 'valor-atual') definirContador(alvo.value);
    if (alvo.dataset.campo === 'percentual-numero') { definirPercentual(alvo.value); atualizarLeitura(); }
  });

  // O range atualiza ao vivo enquanto arrasta.
  elPainel.addEventListener('input', (evento) => {
    if (evento.target.dataset.campo === 'percentual') {
      definirPercentual(evento.target.value);
      const numero = elPainel.querySelector('[data-campo="percentual-numero"]');
      if (numero) numero.value = evento.target.value;
    }
  });

  // Enter no campo de subtarefa adiciona sem precisar do botão.
  elPainel.addEventListener('keydown', (evento) => {
    if (evento.key === 'Enter' && evento.target.dataset.campo === 'nova-subtarefa') {
      evento.preventDefault();
      elPainel.querySelector('[data-acao="adicionar-subtarefa"]')?.click();
    }
  });
}

function aoMudarEstado(evento) {
  const selecionada = State.getMetaSelecionada();

  switch (evento.tipo) {
    case 'meta:progresso':
      if (evento.metaId === selecionada?.id) atualizarLeitura();
      break;
    case 'selecao':
    case 'meta:editada':
    case 'meta:criada':
    case 'meta:excluida':
    case 'container:trocado':
    case 'containers':
    case 'reset':
      render();
      break;
    default:
      break;
  }
}

export function iniciar() {
  elPainel = document.getElementById('painel');
  ligarEventos();
  State.subscribe(aoMudarEstado);
  render();
}
