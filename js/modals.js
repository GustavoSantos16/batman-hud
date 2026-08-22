/**
 * modals.js — modais (meta, container, confirmação), toasts e overlay.
 * Todo modal tem role="dialog", aria-modal, focus trap e devolve o foco ao gatilho.
 */

import * as State from './state.js';
import { escapeHTML, clamp, paraInteiro } from './utils.js';
import { ICONES_SUGERIDOS, ICONE_FALLBACK, ICONE_PADRAO, iconeValido, normalizarIcone } from './icons.js';

const SELETOR_FOCAVEL = [
  'a[href]', 'button:not([disabled])', 'input:not([disabled])',
  'select:not([disabled])', 'textarea:not([disabled])', '[tabindex]:not([tabindex="-1"])',
].join(',');

const pilha = [];            // modais abertos, do mais antigo ao mais recente
const camadas = new Set();   // quem está pedindo o overlay ("drawer", "modal")

let elCamada;
let elOverlay;
let elToasts;

/* ------------------------------------------------------------------
   Overlay compartilhado (drawer + modais)
   ------------------------------------------------------------------ */

export function registrarCamada(nome) {
  camadas.add(nome);
  sincronizarOverlay();
}

export function removerCamada(nome) {
  camadas.delete(nome);
  sincronizarOverlay();
}

function sincronizarOverlay() {
  const visivel = camadas.size > 0;
  elOverlay.hidden = !visivel;
  document.body.style.overflow = visivel ? 'hidden' : '';
}

/* ------------------------------------------------------------------
   Toasts
   ------------------------------------------------------------------ */

export function toast(mensagem, tipo = 'info', duracao = 3000) {
  const el = document.createElement('div');
  el.className = `toast toast--${tipo}`;
  el.setAttribute('role', 'status');
  el.textContent = mensagem;
  elToasts.appendChild(el);

  setTimeout(() => {
    el.classList.add('toast--saindo');
    setTimeout(() => el.remove(), 300);
  }, duracao);
}

/* ------------------------------------------------------------------
   Infraestrutura de modal
   ------------------------------------------------------------------ */

function abrirModal({ html, gatilho, aoFechar, focoInicial }) {
  const el = document.createElement('div');
  el.className = 'modal';
  el.innerHTML = html;
  elCamada.appendChild(el);

  const registro = { el, gatilho: gatilho || document.activeElement, aoFechar };
  pilha.push(registro);
  registrarCamada('modal');

  // Clique no fundo do modal (fora da caixa) fecha.
  el.addEventListener('mousedown', (evento) => {
    if (evento.target === el) fecharModal(el);
  });

  // Focus trap.
  el.addEventListener('keydown', (evento) => {
    if (evento.key !== 'Tab') return;
    const focaveis = [...el.querySelectorAll(SELETOR_FOCAVEL)].filter((n) => n.offsetParent !== null);
    if (!focaveis.length) return;

    const primeiro = focaveis[0];
    const ultimo = focaveis[focaveis.length - 1];

    if (evento.shiftKey && document.activeElement === primeiro) {
      evento.preventDefault();
      ultimo.focus();
    } else if (!evento.shiftKey && document.activeElement === ultimo) {
      evento.preventDefault();
      primeiro.focus();
    }
  });

  const alvoFoco = focoInicial ? el.querySelector(focoInicial) : el.querySelector(SELETOR_FOCAVEL);
  alvoFoco?.focus();

  return el;
}

export function fecharModal(el) {
  const indice = pilha.findIndex((r) => r.el === el);
  if (indice === -1) return;

  const [registro] = pilha.splice(indice, 1);
  registro.el.remove();
  if (!pilha.length) removerCamada('modal');

  registro.aoFechar?.();
  if (registro.gatilho && document.contains(registro.gatilho)) registro.gatilho.focus();
}

/** Fecha o modal mais recente. Devolve true se havia algum. */
export function fecharTopo() {
  const topo = pilha[pilha.length - 1];
  if (!topo) return false;
  fecharModal(topo.el);
  return true;
}

export function temModalAberto() {
  return pilha.length > 0;
}

/* ------------------------------------------------------------------
   Confirmação
   ------------------------------------------------------------------ */

export function confirmar({ titulo, mensagem, textoConfirmar = 'Confirmar', gatilho }) {
  return new Promise((resolve) => {
    let respondido = false;

    const el = abrirModal({
      gatilho,
      aoFechar: () => { if (!respondido) resolve(false); },
      focoInicial: '[data-acao="cancelar"]',
      html: `
        <div class="modal__caixa modal--confirmar" role="dialog" aria-modal="true" aria-labelledby="titulo-confirmar">
          <div class="modal__topo">
            <div>
              <h2 class="modal__titulo" id="titulo-confirmar">${escapeHTML(titulo)}</h2>
            </div>
          </div>
          <div class="modal__corpo">
            <p class="modal__texto">${mensagem}</p>
          </div>
          <div class="modal__rodape">
            <button type="button" class="btn btn--secundario" data-acao="cancelar">Voltar</button>
            <button type="button" class="btn btn--perigo" data-acao="confirmar">${escapeHTML(textoConfirmar)}</button>
          </div>
        </div>
      `,
    });

    el.querySelector('[data-acao="cancelar"]').addEventListener('click', () => fecharModal(el));
    el.querySelector('[data-acao="confirmar"]').addEventListener('click', () => {
      respondido = true;
      resolve(true);
      fecharModal(el);
    });
  });
}

/* ------------------------------------------------------------------
   Modal de container
   ------------------------------------------------------------------ */

/**
 * Cria ou renomeia um container.
 * @param {object} opcoes
 * @param {object} [opcoes.container] container existente (modo edição)
 * @param {(container:object)=>void} [opcoes.aoSalvar]
 */
export function abrirModalContainer({ container = null, gatilho, aoSalvar } = {}) {
  const edicao = Boolean(container);

  const el = abrirModal({
    gatilho,
    focoInicial: '#campo-nome-container',
    html: `
      <div class="modal__caixa modal--estreito" role="dialog" aria-modal="true" aria-labelledby="titulo-container-modal">
        <div class="modal__topo">
          <div>
            <h2 class="modal__titulo" id="titulo-container-modal">
              ${edicao ? 'Renomear container' : 'Adicionar novo container'}
            </h2>
            <p class="modal__subtitulo">O container agrupa suas metas. Você pode criar quantos quiser.</p>
          </div>
        </div>
        <form class="modal__corpo" novalidate>
          <div class="campo" data-campo-wrapper="nome">
            <label class="campo__rotulo" for="campo-nome-container">
              Nome do container <span class="obrigatorio">*</span>
            </label>
            <input class="entrada" id="campo-nome-container" name="nome" type="text"
                   placeholder="2026" maxlength="60" value="${escapeHTML(container?.nome || '')}"
                   autocomplete="off">
            <p class="campo__erro" data-erro="nome"></p>
          </div>
        </form>
        <div class="modal__rodape">
          <button type="button" class="btn btn--secundario" data-acao="voltar">Voltar</button>
          <button type="button" class="btn btn--primario" data-acao="salvar">Salvar</button>
        </div>
      </div>
    `,
  });

  const form = el.querySelector('form');
  const campoNome = el.querySelector('#campo-nome-container');

  function salvar() {
    const nome = campoNome.value.trim();
    const wrapper = el.querySelector('[data-campo-wrapper="nome"]');
    const erro = el.querySelector('[data-erro="nome"]');

    if (!nome) {
      wrapper.classList.add('campo--invalido');
      erro.textContent = 'Dê um nome ao container.';
      campoNome.focus();
      return;
    }

    wrapper.classList.remove('campo--invalido');
    erro.textContent = '';

    const salvo = edicao ? State.renomearContainer(container.id, nome) : State.criarContainer(nome);
    toast(edicao ? 'Container renomeado.' : 'Container criado.', 'sucesso');
    fecharModal(el);
    aoSalvar?.(salvo);
  }

  form.addEventListener('submit', (evento) => { evento.preventDefault(); salvar(); });
  campoNome.addEventListener('keydown', (evento) => {
    if (evento.key === 'Enter') { evento.preventDefault(); salvar(); }
  });
  el.querySelector('[data-acao="salvar"]').addEventListener('click', salvar);
  el.querySelector('[data-acao="voltar"]').addEventListener('click', () => fecharModal(el));

  return el;
}

/* ------------------------------------------------------------------
   Modal de meta
   ------------------------------------------------------------------ */

const ROTULOS_TIPO = { contador: 'Contador', percentual: 'Percentual', checklist: 'Checklist' };

/**
 * Cria ou edita uma meta.
 * @param {object} opcoes
 * @param {object} [opcoes.meta] meta existente (modo edição)
 * @param {string} [opcoes.containerId] container pré-selecionado (modo criação)
 */
export function abrirModalMeta({ meta = null, containerId = null, gatilho } = {}) {
  const edicao = Boolean(meta);
  const containerInicial = meta?.containerId || containerId || State.getContainerAtivo()?.id;
  const tipoInicial = meta?.tipo || 'contador';
  const iconeInicial = meta?.icone || ICONE_PADRAO;

  const el = abrirModal({
    gatilho,
    focoInicial: '#campo-titulo',
    html: `
      <div class="modal__caixa" role="dialog" aria-modal="true" aria-labelledby="titulo-meta-modal">
        <div class="modal__topo">
          <div>
            <h2 class="modal__titulo" id="titulo-meta-modal">${edicao ? 'Editar meta' : 'Nova meta'}</h2>
            <p class="modal__subtitulo">
              ${edicao ? 'Ajuste os dados da meta. O progresso continua sendo editado pelo painel.'
                       : 'Descreva a meta e escolha como o progresso vai ser medido.'}
            </p>
          </div>
        </div>

        <form class="modal__corpo" id="form-meta" novalidate>
          <!-- 1. Container -->
          <div class="campo" data-campo-wrapper="container">
            <label class="campo__rotulo" for="campo-container">Container</label>
            <div class="linha-com-botao">
              <select class="selecao" id="campo-container" name="containerId">
                ${State.getContainers().map((c) => `
                  <option value="${escapeHTML(c.id)}" ${c.id === containerInicial ? 'selected' : ''}>
                    ${escapeHTML(c.nome)}
                  </option>`).join('')}
              </select>
              <button type="button" class="btn-icone" data-acao="novo-container" aria-label="Criar novo container">
                <i class="fa-solid fa-plus" aria-hidden="true"></i>
              </button>
            </div>
          </div>

          <!-- 2. Título -->
          <div class="campo" data-campo-wrapper="titulo">
            <label class="campo__rotulo" for="campo-titulo">Título <span class="obrigatorio">*</span></label>
            <input class="entrada" id="campo-titulo" name="titulo" type="text" maxlength="80"
                   placeholder="Ex.: Ler 8 livros" autocomplete="off" value="${escapeHTML(meta?.titulo || '')}">
            <p class="campo__erro" data-erro="titulo"></p>
          </div>

          <!-- 3. Categoria -->
          <div class="campo">
            <label class="campo__rotulo" for="campo-categoria">Categoria</label>
            <input class="entrada" id="campo-categoria" name="categoria" type="text" maxlength="40"
                   placeholder="Ex.: Leitura, Finanças" autocomplete="off" value="${escapeHTML(meta?.categoria || '')}">
          </div>

          <!-- 4. Tipo -->
          <div class="campo">
            <span class="campo__rotulo" id="rotulo-tipo">Tipo de meta</span>
            <div class="segmentado" role="group" aria-labelledby="rotulo-tipo">
              ${Object.entries(ROTULOS_TIPO).map(([valor, rotulo]) => `
                <button type="button" class="segmentado__opcao" data-tipo="${valor}"
                        aria-pressed="${valor === tipoInicial}">${rotulo}</button>`).join('')}
            </div>
          </div>

          <!-- 5. Campos por tipo -->
          <div data-tipo-campos="contador" ${tipoInicial === 'contador' ? '' : 'hidden'}>
            <div class="linha-campos">
              <div class="campo" data-campo-wrapper="valorAtual">
                <label class="campo__rotulo" for="campo-valor-atual">
                  Status atual
                  <span class="dica" title="Quanto você já fez até agora. Ex.: 2 livros lidos." aria-label="Quanto você já fez até agora">i</span>
                </label>
                <input class="entrada" id="campo-valor-atual" name="valorAtual" type="number" min="0" step="1"
                       value="${meta?.valorAtual ?? 0}">
                <p class="campo__erro" data-erro="valorAtual"></p>
              </div>
              <div class="campo" data-campo-wrapper="valorMeta">
                <label class="campo__rotulo" for="campo-valor-meta">
                  Meta
                  <span class="dica" title="O total que você quer alcançar. Ex.: 8 livros." aria-label="O total que você quer alcançar">i</span>
                </label>
                <input class="entrada" id="campo-valor-meta" name="valorMeta" type="number" min="1" step="1"
                       value="${meta?.valorMeta ?? 10}">
                <p class="campo__erro" data-erro="valorMeta"></p>
              </div>
            </div>
          </div>

          <div data-tipo-campos="percentual" ${tipoInicial === 'percentual' ? '' : 'hidden'}>
            <div class="campo">
              <label class="campo__rotulo" for="campo-percentual">Progresso atual (%)</label>
              <input class="entrada" id="campo-percentual" name="percentual" type="number" min="0" max="100" step="1"
                     value="${meta?.percentual ?? 0}">
            </div>
          </div>

          <div data-tipo-campos="checklist" ${tipoInicial === 'checklist' ? '' : 'hidden'}>
            <p class="campo__ajuda">
              As subtarefas são adicionadas no painel de detalhe depois de salvar a meta.
            </p>
          </div>

          <!-- 6. Descrição -->
          <div class="campo">
            <label class="campo__rotulo" for="campo-descricao">Descrição do caso</label>
            <textarea class="area-texto" id="campo-descricao" name="descricao" maxlength="600"
                      placeholder="Contexto, plano de ação, prazos…">${escapeHTML(meta?.descricao || '')}</textarea>
          </div>

          <!-- 7. Mensagem -->
          <div class="campo">
            <label class="campo__rotulo" for="campo-mensagem">Mensagem de progresso</label>
            <input class="entrada" id="campo-mensagem" name="mensagem" type="text" maxlength="40"
                   placeholder='Ex.: "livros lidos"' autocomplete="off" value="${escapeHTML(meta?.mensagem || '')}">
            <p class="campo__ajuda">Aparece ao lado do contador, como em “2/8 livros lidos”.</p>
          </div>

          <!-- 8. Ícone -->
          <div class="campo">
            <label class="campo__rotulo" for="campo-icone">Ícone</label>
            <div class="icone-linha">
              <input class="entrada" id="campo-icone" name="icone" type="text" maxlength="60"
                     placeholder="fa-dollar-sign" autocomplete="off" spellcheck="false"
                     value="${escapeHTML(iconeInicial)}">
              <span class="icone-preview" data-preview aria-hidden="true"><i class="${escapeHTML(iconeInicial)}"></i></span>
            </div>
            <p class="campo__ajuda" data-aviso-icone></p>
            <div class="icone-grade" role="group" aria-label="Ícones sugeridos">
              ${ICONES_SUGERIDOS.map((nome) => `
                <button type="button" class="icone-opcao" data-icone="fa-solid ${nome}"
                        aria-pressed="false" aria-label="${escapeHTML(nome.replace('fa-', ''))}">
                  <i class="fa-solid ${nome}" aria-hidden="true"></i>
                </button>`).join('')}
            </div>
          </div>
        </form>

        <div class="modal__rodape">
          <button type="button" class="btn btn--secundario" data-acao="voltar">Voltar</button>
          <button type="button" class="btn btn--primario" data-acao="salvar">Salvar</button>
        </div>
      </div>
    `,
  });

  /* --- Referências --- */
  const form = el.querySelector('#form-meta');
  const campoTitulo = el.querySelector('#campo-titulo');
  const campoIcone = el.querySelector('#campo-icone');
  const preview = el.querySelector('[data-preview]');
  const avisoIcone = el.querySelector('[data-aviso-icone]');
  const seletorContainer = el.querySelector('#campo-container');

  let tipoAtual = tipoInicial;

  /* --- Tipo segmentado --- */
  function aplicarTipo(tipo) {
    tipoAtual = tipo;
    el.querySelectorAll('.segmentado__opcao').forEach((botao) => {
      botao.setAttribute('aria-pressed', String(botao.dataset.tipo === tipo));
    });
    el.querySelectorAll('[data-tipo-campos]').forEach((bloco) => {
      bloco.hidden = bloco.dataset.tipoCampos !== tipo;
    });
  }

  el.querySelectorAll('.segmentado__opcao').forEach((botao) => {
    botao.addEventListener('click', () => aplicarTipo(botao.dataset.tipo));
  });

  /* --- Ícone: preview ao vivo + grade --- */
  function atualizarPreview() {
    const normalizado = normalizarIcone(campoIcone.value);
    const valido = iconeValido(normalizado);
    preview.innerHTML = `<i class="${escapeHTML(valido ? normalizado : ICONE_FALLBACK)}"></i>`;
    preview.classList.toggle('invalido', !valido);
    avisoIcone.textContent = valido ? '' : 'Não encontramos esse ícone no Font Awesome — usaremos um genérico.';

    el.querySelectorAll('.icone-opcao').forEach((botao) => {
      botao.setAttribute('aria-pressed', String(botao.dataset.icone === normalizado));
    });
  }

  campoIcone.addEventListener('input', atualizarPreview);
  el.querySelectorAll('.icone-opcao').forEach((botao) => {
    botao.addEventListener('click', () => {
      campoIcone.value = botao.dataset.icone;
      atualizarPreview();
    });
  });
  atualizarPreview();

  /* --- Botão "+" de novo container --- */
  el.querySelector('[data-acao="novo-container"]').addEventListener('click', (evento) => {
    abrirModalContainer({
      gatilho: evento.currentTarget,
      aoSalvar: (novo) => {
        // Recria as opções e já seleciona o container recém-criado.
        seletorContainer.innerHTML = State.getContainers()
          .map((c) => `<option value="${escapeHTML(c.id)}" ${c.id === novo.id ? 'selected' : ''}>${escapeHTML(c.nome)}</option>`)
          .join('');
        seletorContainer.value = novo.id;
      },
    });
  });

  /* --- Validação e salvamento --- */
  function marcarErro(nome, mensagem) {
    const wrapper = el.querySelector(`[data-campo-wrapper="${nome}"]`);
    const erro = el.querySelector(`[data-erro="${nome}"]`);
    wrapper?.classList.toggle('campo--invalido', Boolean(mensagem));
    if (erro) erro.textContent = mensagem || '';
  }

  function salvar() {
    const titulo = campoTitulo.value.trim();
    marcarErro('titulo', '');
    marcarErro('valorMeta', '');
    marcarErro('valorAtual', '');

    if (!titulo) {
      marcarErro('titulo', 'O título é obrigatório.');
      campoTitulo.focus();
      return;
    }

    const dados = {
      containerId: seletorContainer.value,
      titulo,
      categoria: el.querySelector('#campo-categoria').value.trim(),
      descricao: el.querySelector('#campo-descricao').value,
      mensagem: el.querySelector('#campo-mensagem').value.trim(),
      icone: normalizarIcone(campoIcone.value),
      tipo: tipoAtual,
    };

    if (tipoAtual === 'contador') {
      const valorMeta = paraInteiro(el.querySelector('#campo-valor-meta').value, 0);
      const valorAtual = paraInteiro(el.querySelector('#campo-valor-atual').value, 0);

      if (valorMeta <= 0) {
        marcarErro('valorMeta', 'A meta precisa ser maior que zero.');
        el.querySelector('#campo-valor-meta').focus();
        return;
      }
      if (valorAtual < 0) {
        marcarErro('valorAtual', 'O status atual não pode ser negativo.');
        el.querySelector('#campo-valor-atual').focus();
        return;
      }
      if (valorAtual > valorMeta) {
        marcarErro('valorAtual', 'O status atual não pode ser maior que a meta.');
        el.querySelector('#campo-valor-atual').focus();
        return;
      }

      dados.valorMeta = valorMeta;
      dados.valorAtual = valorAtual;
    }

    if (tipoAtual === 'percentual') {
      dados.percentual = clamp(paraInteiro(el.querySelector('#campo-percentual').value, 0), 0, 100);
    }

    if (edicao) {
      State.atualizarMeta(meta.id, dados, true);
      toast('Meta atualizada.', 'sucesso');
    } else {
      const criada = State.criarMeta(dados);
      // Se a meta caiu em outro container, leva o usuário até lá.
      if (criada.containerId !== State.getContainerAtivo()?.id) {
        State.definirContainerAtivo(criada.containerId);
      }
      State.selecionarMeta(criada.id);
      toast('Meta criada.', 'sucesso');
    }

    fecharModal(el);
  }

  form.addEventListener('submit', (evento) => { evento.preventDefault(); salvar(); });
  el.querySelector('[data-acao="salvar"]').addEventListener('click', salvar);
  el.querySelector('[data-acao="voltar"]').addEventListener('click', () => fecharModal(el));

  return el;
}

/* ------------------------------------------------------------------
   Inicialização
   ------------------------------------------------------------------ */

export function iniciar() {
  elCamada = document.getElementById('camada-modais');
  elOverlay = document.getElementById('overlay');
  elToasts = document.getElementById('toasts');

  // O clique no overlay só interessa ao drawer: o modal tem o próprio fundo.
  elOverlay.addEventListener('click', () => {
    document.dispatchEvent(new CustomEvent('hud:overlay-click'));
  });
}
