/**
 * main.js — bootstrap do aplicativo, barra superior e atalhos globais.
 */

import * as State from './state.js';
import * as Store from './store.js';
import * as Modais from './modals.js';
import * as Roda from './wheel.js';
import * as Painel from './panel.js';
import * as Menu from './sidebar.js';
import * as Tema from './theme.js';

let elTitulo;
let elBotaoMenu;
let elBotaoNovaMeta;

/* ------------------------------------------------------------------
   Barra superior
   ------------------------------------------------------------------ */

function renderTitulo() {
  const container = State.getContainerAtivo();
  const nome = container?.nome || 'Sem container';
  elTitulo.textContent = nome;
  document.title = `${nome} · HUD de Metas`;
}

/* ------------------------------------------------------------------
   Atalhos de teclado
   ------------------------------------------------------------------ */

/** Verdadeiro quando o usuário está digitando em algum campo. */
function digitando(alvo) {
  if (!alvo) return false;
  const tag = alvo.tagName;
  return tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || alvo.isContentEditable;
}

function ligarAtalhos() {
  document.addEventListener('keydown', (evento) => {
    // Esc tem prioridade: modal → drawer → seleção.
    if (evento.key === 'Escape') {
      if (Modais.fecharTopo()) return;
      if (Menu.estaAberto()) { Menu.fechar(); return; }
      State.limparSelecao();
      return;
    }

    // Os demais atalhos não valem dentro de campos nem com modal aberto.
    if (digitando(evento.target) || Modais.temModalAberto()) return;
    if (evento.ctrlKey || evento.metaKey || evento.altKey) return;

    switch (evento.key) {
      case 'ArrowRight':
        evento.preventDefault();
        State.girarSelecao(1);
        break;

      case 'ArrowLeft':
        evento.preventDefault();
        State.girarSelecao(-1);
        break;

      case 'Enter': {
        const meta = State.getMetaSelecionada();
        if (!meta) return;
        evento.preventDefault();
        Modais.abrirModalMeta({ meta });
        break;
      }

      case 'n':
      case 'N':
        if (Menu.estaAberto()) return;
        evento.preventDefault();
        Modais.abrirModalMeta({ containerId: State.getContainerAtivo()?.id });
        break;

      default:
        break;
    }
  });
}

/* ------------------------------------------------------------------
   Eventos globais da aplicação
   ------------------------------------------------------------------ */

function ligarEventos() {
  elBotaoMenu.addEventListener('click', () => Menu.alternar());

  elBotaoNovaMeta.addEventListener('click', (evento) => {
    Modais.abrirModalMeta({
      containerId: State.getContainerAtivo()?.id,
      gatilho: evento.currentTarget,
    });
  });

  // Disparado pelo botão do estado vazio no centro da roda.
  document.addEventListener('hud:nova-meta', () => {
    Modais.abrirModalMeta({ containerId: State.getContainerAtivo()?.id });
  });

  State.subscribe((evento) => {
    if (['containers', 'container:trocado', 'reset'].includes(evento.tipo)) renderTitulo();
  });
}

/* ------------------------------------------------------------------
   Bootstrap
   ------------------------------------------------------------------ */

function iniciar() {
  elTitulo = document.getElementById('titulo-container');
  elBotaoMenu = document.getElementById('btn-menu');
  elBotaoNovaMeta = document.getElementById('btn-nova-meta');

  // A ordem importa: os modais preparam o overlay usado pelo drawer.
  Modais.iniciar();
  State.iniciar();

  renderTitulo();
  Roda.iniciar();
  Painel.iniciar();
  Menu.iniciar();
  Tema.iniciar();
  ligarEventos();
  ligarAtalhos();

  // Avisa se o estado precisou ser recriado.
  if (Store.diagnostico.recuperado) {
    Modais.toast(Store.diagnostico.motivo, 'aviso', 6000);
  }
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', iniciar);
} else {
  iniciar();
}
