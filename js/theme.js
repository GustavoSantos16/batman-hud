/**
 * theme.js — alternância entre tema escuro e claro.
 * A preferência fica em chave própria, fora do estado exportado/importado.
 * O script inline no <head> aplica o tema salvo antes da primeira pintura.
 */

const CHAVE_TEMA = 'hud-metas:tema';

let elBotao;

function temaAtual() {
  return document.documentElement.dataset.tema === 'claro' ? 'claro' : 'escuro';
}

function renderBotao() {
  const claro = temaAtual() === 'claro';
  const rotulo = claro ? 'Ativar modo escuro' : 'Ativar modo claro';
  elBotao.setAttribute('aria-label', rotulo);
  elBotao.title = rotulo;
  elBotao.innerHTML = `<i class="fa-solid ${claro ? 'fa-moon' : 'fa-sun'}" aria-hidden="true"></i>`;
}

export function alternar() {
  const tema = temaAtual() === 'claro' ? 'escuro' : 'claro';
  document.documentElement.dataset.tema = tema;
  try {
    window.localStorage.setItem(CHAVE_TEMA, tema);
  } catch (erro) {
    console.warn('[theme] não foi possível salvar:', erro);
  }
  renderBotao();
}

export function iniciar() {
  elBotao = document.getElementById('btn-tema');
  renderBotao();
  elBotao.addEventListener('click', alternar);
}
