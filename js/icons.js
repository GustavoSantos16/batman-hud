/**
 * icons.js — catálogo de ícones Font Awesome sugeridos e validação de classes.
 */

/** Ícones sugeridos no seletor do modal de meta (~30). */
export const ICONES_SUGERIDOS = [
  'fa-dollar-sign', 'fa-piggy-bank', 'fa-wallet', 'fa-chart-line',
  'fa-book', 'fa-graduation-cap', 'fa-language', 'fa-brain',
  'fa-code', 'fa-laptop-code', 'fa-briefcase', 'fa-bullseye',
  'fa-dumbbell', 'fa-person-running', 'fa-bicycle', 'fa-heart-pulse',
  'fa-droplet', 'fa-bed', 'fa-utensils', 'fa-mug-hot',
  'fa-plane', 'fa-mountain-sun', 'fa-camera', 'fa-music',
  'fa-guitar', 'fa-palette', 'fa-film', 'fa-gamepad',
  'fa-house', 'fa-seedling', 'fa-rocket', 'fa-star',
];

/** Ícone usado quando a classe informada não existe. */
export const ICONE_FALLBACK = 'fa-solid fa-circle-question';

/** Ícone padrão de uma meta nova. */
export const ICONE_PADRAO = 'fa-solid fa-bullseye';

/** Estilos aceitos do Font Awesome grátis. */
const ESTILOS = ['fa-solid', 'fa-regular', 'fa-brands'];

/**
 * Normaliza o que o usuário digitou para uma classe completa.
 * Aceita "dollar-sign", "fa-dollar-sign" ou "fa-solid fa-dollar-sign".
 */
export function normalizarIcone(entrada) {
  const bruto = String(entrada ?? '')
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .trim();

  if (!bruto) return ICONE_PADRAO;

  const partes = bruto.split(/\s+/);
  const estilo = partes.find((p) => ESTILOS.includes(p)) || 'fa-solid';
  let nome = partes.find((p) => p.startsWith('fa-') && !ESTILOS.includes(p) && p !== 'fa');

  if (!nome) {
    // Sem prefixo: assume que o usuário digitou só o nome ("dollar-sign").
    const semEstilo = partes.filter((p) => !ESTILOS.includes(p) && p !== 'fa');
    nome = semEstilo.length ? `fa-${semEstilo[semEstilo.length - 1].replace(/^fa-/, '')}` : null;
  }

  if (!nome) return ICONE_PADRAO;
  return `${estilo} ${nome}`;
}

// Cache das validações já feitas (a checagem mexe no layout).
const cacheValidacao = new Map();
let faDisponivel = null;

/** Verifica se a folha do Font Awesome já está aplicada. */
function fontAwesomeCarregado() {
  if (faDisponivel !== null) return faDisponivel;
  faDisponivel = temGlifo('fa-solid fa-star');
  return faDisponivel;
}

/** Testa se a classe produz um glifo (::before com content). */
function temGlifo(classe) {
  const teste = document.createElement('i');
  teste.className = classe;
  teste.setAttribute('aria-hidden', 'true');
  teste.style.cssText = 'position:absolute;left:-9999px;top:0;visibility:hidden;';
  document.body.appendChild(teste);
  const conteudo = window.getComputedStyle(teste, '::before').getPropertyValue('content');
  teste.remove();
  return Boolean(conteudo) && conteudo !== 'none' && conteudo !== 'normal' && conteudo !== '""';
}

/**
 * Diz se uma classe FA existe de verdade.
 * Se o Font Awesome ainda não carregou, assume válida (evita alarme falso).
 */
export function iconeValido(classe) {
  const normalizada = normalizarIcone(classe);
  if (cacheValidacao.has(normalizada)) return cacheValidacao.get(normalizada);
  if (!fontAwesomeCarregado()) return true;

  const valido = temGlifo(normalizada);
  cacheValidacao.set(normalizada, valido);
  return valido;
}

/** Devolve a classe se for válida, senão o fallback. */
export function iconeSeguro(classe) {
  const normalizada = normalizarIcone(classe);
  return iconeValido(normalizada) ? normalizada : ICONE_FALLBACK;
}
