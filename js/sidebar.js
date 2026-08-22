/**
 * sidebar.js — drawer lateral: troca de container, CRUD de containers,
 * exportação e importação dos dados.
 */

import * as State from './state.js';
import * as Modais from './modals.js';
import * as Store from './store.js';
import { baixarArquivo, escapeHTML, lerArquivoTexto, plural } from './utils.js';

let elDrawer;
let elBotaoMenu;
let elInputImportar;
let aberto = false;

/* ------------------------------------------------------------------
   Render
   ------------------------------------------------------------------ */

export function render() {
  const containers = State.getContainers();
  const ativoId = State.getContainerAtivo()?.id;

  elDrawer.innerHTML = `
    <div class="drawer__topo">
      <span class="drawer__marca">HUD de metas</span>
      <button type="button" class="btn-icone" data-acao="fechar" aria-label="Fechar menu">
        <i class="fa-solid fa-xmark" aria-hidden="true"></i>
      </button>
    </div>

    <div class="drawer__corpo">
      <button type="button" class="btn btn--destaque btn--bloco" data-acao="nova-meta">
        <i class="fa-solid fa-plus" aria-hidden="true"></i> Nova meta
      </button>

      <section class="drawer__secao">
        <h2 class="drawer__titulo">Containers</h2>
        <ul class="containers">
          ${containers.map((container) => {
            const metas = State.metasDoContainer(container.id);
            const progresso = State.progressoContainer(container.id);
            const ativo = container.id === ativoId;
            return `
              <li class="container-item${ativo ? ' ativo' : ''}">
                <button type="button" class="container-item__botao" data-acao="trocar"
                        data-container-id="${escapeHTML(container.id)}"
                        aria-current="${ativo ? 'true' : 'false'}">
                  <span class="container-item__nome">${escapeHTML(container.nome)}</span>
                  <span class="container-item__meta num">${plural(metas.length, 'meta', 'metas')} · ${progresso}%</span>
                </button>
                <button type="button" class="btn-icone" data-acao="renomear"
                        data-container-id="${escapeHTML(container.id)}"
                        aria-label="Renomear ${escapeHTML(container.nome)}">
                  <i class="fa-solid fa-pen" aria-hidden="true"></i>
                </button>
                <button type="button" class="btn-icone btn-icone--perigo" data-acao="excluir"
                        data-container-id="${escapeHTML(container.id)}"
                        aria-label="Excluir ${escapeHTML(container.nome)}"
                        ${containers.length <= 1 ? 'disabled title="É preciso ter pelo menos um container"' : ''}>
                  <i class="fa-solid fa-trash" aria-hidden="true"></i>
                </button>
              </li>
            `;
          }).join('')}
        </ul>
        <button type="button" class="btn btn--bloco" data-acao="novo-container">
          <i class="fa-solid fa-plus" aria-hidden="true"></i> Novo container
        </button>
      </section>
    </div>

    <div class="drawer__rodape">
      <div class="drawer__dados">
        <button type="button" class="btn" data-acao="exportar">
          <i class="fa-solid fa-download" aria-hidden="true"></i> Exportar
        </button>
        <button type="button" class="btn" data-acao="importar">
          <i class="fa-solid fa-upload" aria-hidden="true"></i> Importar
        </button>
      </div>
      <p class="drawer__nota">
        Tudo fica salvo só neste navegador. Exporte de vez em quando para não perder nada.
      </p>
    </div>
  `;
}

/* ------------------------------------------------------------------
   Abrir / fechar
   ------------------------------------------------------------------ */

export function abrir() {
  if (aberto) return;
  aberto = true;
  elDrawer.classList.add('aberto');
  elDrawer.setAttribute('aria-hidden', 'false');
  elDrawer.removeAttribute('inert');
  elBotaoMenu.setAttribute('aria-expanded', 'true');
  Modais.registrarCamada('drawer');
  elDrawer.querySelector('[data-acao="nova-meta"]')?.focus();
}

export function fechar() {
  if (!aberto) return;
  aberto = false;
  elDrawer.classList.remove('aberto');
  elDrawer.setAttribute('aria-hidden', 'true');
  elDrawer.setAttribute('inert', '');
  elBotaoMenu.setAttribute('aria-expanded', 'false');
  Modais.removerCamada('drawer');
  elBotaoMenu.focus();
}

export function alternar() {
  if (aberto) fechar(); else abrir();
}

export function estaAberto() {
  return aberto;
}

/* ------------------------------------------------------------------
   Exportar / importar
   ------------------------------------------------------------------ */

function exportar() {
  const data = new Date().toISOString().slice(0, 10);
  baixarArquivo(`hud-metas-${data}.json`, State.exportarJSON());
  Modais.toast('Dados exportados.', 'sucesso');
}

async function importarArquivo(arquivo) {
  try {
    const texto = await lerArquivoTexto(arquivo);
    const bruto = JSON.parse(texto);

    // Confere se o arquivo é aproveitável antes de perguntar qualquer coisa.
    if (!Store.validarEstado(bruto)) {
      Modais.toast('Arquivo inválido: não parece um backup do HUD de metas.', 'erro', 5000);
      return;
    }

    const ok = await Modais.confirmar({
      titulo: 'Importar dados',
      mensagem: 'Os dados atuais serão <strong>substituídos</strong> pelo conteúdo do arquivo. Exporte antes se quiser guardar o que existe hoje.',
      textoConfirmar: 'Substituir dados',
    });
    if (!ok) return;

    if (State.substituirEstado(bruto)) {
      Modais.toast('Dados importados.', 'sucesso');
    } else {
      Modais.toast('Não foi possível importar esse arquivo.', 'erro');
    }
  } catch (erro) {
    console.warn('[sidebar] falha ao importar:', erro);
    Modais.toast('Não foi possível ler o arquivo.', 'erro');
  }
}

/* ------------------------------------------------------------------
   Eventos
   ------------------------------------------------------------------ */

function ligarEventos() {
  elDrawer.addEventListener('click', async (evento) => {
    const alvo = evento.target.closest('[data-acao]');
    if (!alvo) return;
    const containerId = alvo.dataset.containerId;

    switch (alvo.dataset.acao) {
      case 'fechar':
        fechar();
        break;

      case 'nova-meta':
        fechar();
        Modais.abrirModalMeta({ containerId: State.getContainerAtivo()?.id, gatilho: elBotaoMenu });
        break;

      case 'trocar':
        State.definirContainerAtivo(containerId);
        fechar();
        break;

      case 'novo-container':
        Modais.abrirModalContainer({
          gatilho: alvo,
          aoSalvar: (novo) => State.definirContainerAtivo(novo.id),
        });
        break;

      case 'renomear':
        Modais.abrirModalContainer({ container: State.getContainer(containerId), gatilho: alvo });
        break;

      case 'excluir': {
        const container = State.getContainer(containerId);
        if (!container) return;
        if (State.getContainers().length <= 1) {
          Modais.toast('É preciso manter pelo menos um container.', 'aviso');
          return;
        }

        const quantas = State.metasDoContainer(containerId).length;
        const ok = await Modais.confirmar({
          titulo: 'Excluir container',
          mensagem: quantas
            ? `Excluir <strong>${escapeHTML(container.nome)}</strong> também apaga <strong>${plural(quantas, 'meta', 'metas')}</strong>. Não dá para desfazer.`
            : `O container <strong>${escapeHTML(container.nome)}</strong> será removido. Não dá para desfazer.`,
          textoConfirmar: 'Excluir container',
          gatilho: alvo,
        });

        if (ok && State.excluirContainer(containerId)) {
          Modais.toast('Container excluído.', 'sucesso');
        }
        break;
      }

      case 'exportar':
        exportar();
        break;

      case 'importar':
        elInputImportar.click();
        break;

      default:
        break;
    }
  });

  elInputImportar.addEventListener('change', async () => {
    const arquivo = elInputImportar.files?.[0];
    elInputImportar.value = ''; // permite reimportar o mesmo arquivo
    if (arquivo) await importarArquivo(arquivo);
  });

  // Clique no overlay fecha o drawer (os modais têm o próprio fundo).
  document.addEventListener('hud:overlay-click', () => {
    if (aberto && !Modais.temModalAberto()) fechar();
  });
}

function aoMudarEstado(evento) {
  if (['containers', 'container:trocado', 'meta:criada', 'meta:excluida', 'meta:editada', 'meta:progresso', 'reset'].includes(evento.tipo)) {
    render();
  }
}

export function iniciar() {
  elDrawer = document.getElementById('drawer');
  elBotaoMenu = document.getElementById('btn-menu');
  elInputImportar = document.getElementById('input-importar');

  render();
  ligarEventos();
  State.subscribe(aoMudarEstado);
}
