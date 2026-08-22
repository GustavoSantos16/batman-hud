/**
 * utils.js — funções utilitárias sem dependências.
 * Padrão de nomes: português.
 */

/** Gera um id curto e legível, ex.: "meta_9f31". */
export function gerarId(prefixo = 'id') {
  const aleatorio = Math.random().toString(36).slice(2, 6);
  const tempo = Date.now().toString(36).slice(-2);
  return `${prefixo}_${aleatorio}${tempo}`;
}

/** Limita um número ao intervalo [min, max]. */
export function clamp(valor, min, max) {
  return Math.min(max, Math.max(min, valor));
}

/** Converte para número inteiro seguro; devolve `padrao` se não der. */
export function paraInteiro(valor, padrao = 0) {
  const n = Number.parseInt(valor, 10);
  return Number.isFinite(n) ? n : padrao;
}

/** Escapa caracteres perigosos antes de injetar em innerHTML. */
export function escapeHTML(valor) {
  return String(valor ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

/** Atrasa a execução até parar de ser chamada por `ms`. */
export function debounce(fn, ms = 200) {
  let temporizador;
  return (...args) => {
    clearTimeout(temporizador);
    temporizador = setTimeout(() => fn(...args), ms);
  };
}

/** Data/hora atual em ISO. */
export function agora() {
  return new Date().toISOString();
}

/** Formata uma data ISO em pt-BR (dd/mm/aaaa). */
export function formatarData(iso) {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleDateString('pt-BR');
}

/** Pluraliza de forma simples: 1 meta / 3 metas. */
export function plural(quantidade, singular, pluralForma) {
  return `${quantidade} ${quantidade === 1 ? singular : pluralForma}`;
}

/** Dispara o download de um arquivo de texto no navegador. */
export function baixarArquivo(nomeArquivo, conteudo, tipo = 'application/json') {
  const blob = new Blob([conteudo], { type: tipo });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = nomeArquivo;
  document.body.appendChild(link);
  link.click();
  link.remove();
  // Libera a URL depois que o navegador processou o clique.
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/** Lê um File como texto (Promise). */
export function lerArquivoTexto(arquivo) {
  return new Promise((resolve, reject) => {
    const leitor = new FileReader();
    leitor.onload = () => resolve(String(leitor.result));
    leitor.onerror = () => reject(new Error('Falha ao ler o arquivo.'));
    leitor.readAsText(arquivo);
  });
}

/** Verdadeiro quando o usuário pediu menos movimento. */
export function movimentoReduzido() {
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

/** Converte um ângulo (graus, 0 = topo) em ponto cartesiano. */
export function pontoPolar(cx, cy, raio, graus) {
  const rad = (graus * Math.PI) / 180;
  return { x: cx + raio * Math.cos(rad), y: cy + raio * Math.sin(rad) };
}

/** Caminho SVG de um arco entre dois ângulos (graus, sentido horário). */
export function caminhoArco(cx, cy, raio, grausInicio, grausFim) {
  const p0 = pontoPolar(cx, cy, raio, grausInicio);
  const p1 = pontoPolar(cx, cy, raio, grausFim);
  const arcoGrande = Math.abs(grausFim - grausInicio) > 180 ? 1 : 0;
  return `M ${p0.x.toFixed(2)} ${p0.y.toFixed(2)} A ${raio} ${raio} 0 ${arcoGrande} 1 ${p1.x.toFixed(2)} ${p1.y.toFixed(2)}`;
}
