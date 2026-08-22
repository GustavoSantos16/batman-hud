/**
 * state.js — estado em memória + pub/sub simples.
 * Toda mutação persiste no localStorage imediatamente e notifica os ouvintes.
 */

import * as Store from './store.js';
import { agora, clamp, gerarId } from './utils.js';

let dados = null;                       // Estado persistido
const ui = { metaSelecionadaId: null }; // Estado só de interface
const ouvintes = new Set();

/* ------------------------------------------------------------------
   Ciclo de vida e pub/sub
   ------------------------------------------------------------------ */

export function iniciar() {
  dados = Store.carregar();
  return dados;
}

export function getDados() {
  return dados;
}

/** Inscreve um ouvinte. Devolve a função para cancelar. */
export function subscribe(ouvinte) {
  ouvintes.add(ouvinte);
  return () => ouvintes.delete(ouvinte);
}

function notificar(evento) {
  ouvintes.forEach((ouvinte) => {
    try {
      ouvinte(evento);
    } catch (erro) {
      console.error('[state] ouvinte falhou:', erro);
    }
  });
}

/** Persiste e notifica. Usado depois de qualquer mutação. */
function commit(evento) {
  Store.salvar(dados);
  notificar(evento);
}

/* ------------------------------------------------------------------
   Leituras
   ------------------------------------------------------------------ */

export function getContainers() {
  return [...dados.containers].sort((a, b) => a.ordem - b.ordem);
}

export function getContainer(id) {
  return dados.containers.find((c) => c.id === id) || null;
}

export function getContainerAtivo() {
  return getContainer(dados.containerAtivoId) || getContainers()[0] || null;
}

export function metasDoContainer(containerId) {
  return dados.metas
    .filter((m) => m.containerId === containerId)
    .sort((a, b) => a.ordem - b.ordem);
}

export function metasVisiveis() {
  const ativo = getContainerAtivo();
  return ativo ? metasDoContainer(ativo.id) : [];
}

export function getMeta(id) {
  return dados.metas.find((m) => m.id === id) || null;
}

export function getMetaSelecionada() {
  return ui.metaSelecionadaId ? getMeta(ui.metaSelecionadaId) : null;
}

/**
 * Progresso de uma meta em 0–100 (arredondado).
 * Função única usada pela roda, pelo painel e pelo núcleo central.
 */
export function calcularProgresso(meta) {
  if (!meta) return 0;

  if (meta.tipo === 'contador') {
    const alvo = Number(meta.valorMeta) || 0;
    if (alvo <= 0) return 0; // guarda contra divisão por zero
    return Math.round(clamp((Number(meta.valorAtual) || 0) / alvo, 0, 1) * 100);
  }

  if (meta.tipo === 'percentual') {
    return Math.round(clamp(Number(meta.percentual) || 0, 0, 100));
  }

  if (meta.tipo === 'checklist') {
    const total = meta.subtarefas?.length || 0;
    if (!total) return 0;
    const feitas = meta.subtarefas.filter((s) => s.concluida).length;
    return Math.round((feitas / total) * 100);
  }

  return 0;
}

/** Média simples do progresso das metas do container. */
export function progressoContainer(containerId) {
  const metas = metasDoContainer(containerId);
  if (!metas.length) return 0;
  const soma = metas.reduce((total, meta) => total + calcularProgresso(meta), 0);
  return Math.round(soma / metas.length);
}

/* ------------------------------------------------------------------
   Seleção (só interface, não persiste)
   ------------------------------------------------------------------ */

export function selecionarMeta(metaId) {
  if (ui.metaSelecionadaId === metaId) return;
  ui.metaSelecionadaId = metaId;
  notificar({ tipo: 'selecao', metaId });
}

export function limparSelecao() {
  if (!ui.metaSelecionadaId) return;
  ui.metaSelecionadaId = null;
  notificar({ tipo: 'selecao', metaId: null });
}

/** Move a seleção n posições na lista do container ativo (para ← e →). */
export function girarSelecao(passo) {
  const metas = metasVisiveis();
  if (!metas.length) return;

  const indiceAtual = metas.findIndex((m) => m.id === ui.metaSelecionadaId);
  const proximo = indiceAtual === -1
    ? (passo > 0 ? 0 : metas.length - 1)
    : (indiceAtual + passo + metas.length) % metas.length;

  selecionarMeta(metas[proximo].id);
}

/* ------------------------------------------------------------------
   Mutações — containers
   ------------------------------------------------------------------ */

export function criarContainer(nome) {
  const container = {
    id: gerarId('ctn'),
    nome: String(nome).trim(),
    ordem: dados.containers.length,
    criadoEm: agora(),
  };
  dados.containers.push(container);
  commit({ tipo: 'containers', containerId: container.id });
  return container;
}

export function renomearContainer(id, nome) {
  const container = getContainer(id);
  if (!container) return null;
  container.nome = String(nome).trim();
  commit({ tipo: 'containers', containerId: id });
  return container;
}

export function excluirContainer(id) {
  if (dados.containers.length <= 1) return false; // nunca deixa ficar sem nenhum

  const removidas = metasDoContainer(id).map((m) => m.id);
  dados.containers = dados.containers.filter((c) => c.id !== id);
  dados.metas = dados.metas.filter((m) => m.containerId !== id);

  if (removidas.includes(ui.metaSelecionadaId)) ui.metaSelecionadaId = null;

  if (dados.containerAtivoId === id) {
    dados.containerAtivoId = getContainers()[0].id;
    commit({ tipo: 'container:trocado', containerId: dados.containerAtivoId });
  } else {
    commit({ tipo: 'containers' });
  }
  return true;
}

export function definirContainerAtivo(id) {
  if (!getContainer(id) || dados.containerAtivoId === id) return;
  dados.containerAtivoId = id;
  ui.metaSelecionadaId = null;
  commit({ tipo: 'container:trocado', containerId: id });
}

/* ------------------------------------------------------------------
   Mutações — metas
   ------------------------------------------------------------------ */

export function criarMeta(entrada) {
  const containerId = getContainer(entrada.containerId) ? entrada.containerId : getContainerAtivo().id;
  const data = agora();

  const meta = {
    id: gerarId('meta'),
    containerId,
    titulo: String(entrada.titulo).trim(),
    categoria: String(entrada.categoria || '').trim(),
    descricao: String(entrada.descricao || ''),
    mensagem: String(entrada.mensagem || '').trim(),
    icone: entrada.icone || 'fa-solid fa-bullseye',
    tipo: entrada.tipo || 'percentual',
    valorAtual: Math.max(0, Math.round(Number(entrada.valorAtual) || 0)),
    valorMeta: Math.max(0, Math.round(Number(entrada.valorMeta) || 0)),
    percentual: clamp(Math.round(Number(entrada.percentual) || 0), 0, 100),
    subtarefas: Array.isArray(entrada.subtarefas) ? entrada.subtarefas : [],
    ordem: metasDoContainer(containerId).length,
    criadoEm: data,
    atualizadoEm: data,
  };

  dados.metas.push(meta);
  commit({ tipo: 'meta:criada', metaId: meta.id, containerId });
  return meta;
}

/**
 * Atualiza campos de uma meta.
 * `estrutural` indica se a mudança exige redesenhar a roda inteira
 * (troca de container, de ícone, exclusão…) em vez de só o marcador.
 */
export function atualizarMeta(id, patch, estrutural = false) {
  const meta = getMeta(id);
  if (!meta) return null;

  const containerAnterior = meta.containerId;
  Object.assign(meta, patch);
  meta.atualizadoEm = agora();

  if (patch.containerId && patch.containerId !== containerAnterior) {
    meta.ordem = metasDoContainer(patch.containerId).length - 1;
  }

  commit({
    tipo: estrutural || patch.containerId !== undefined ? 'meta:editada' : 'meta:progresso',
    metaId: id,
    containerAnterior,
  });
  return meta;
}

export function excluirMeta(id) {
  const meta = getMeta(id);
  if (!meta) return false;

  const containerId = meta.containerId;
  dados.metas = dados.metas.filter((m) => m.id !== id);

  // Reordena o que sobrou para não deixar buracos.
  metasDoContainer(containerId).forEach((m, i) => { m.ordem = i; });

  if (ui.metaSelecionadaId === id) ui.metaSelecionadaId = null;

  commit({ tipo: 'meta:excluida', metaId: id, containerId });
  return true;
}

/* --- Subtarefas (checklist) --- */

export function adicionarSubtarefa(metaId, texto) {
  const meta = getMeta(metaId);
  if (!meta) return null;
  const subtarefa = { id: gerarId('st'), texto: String(texto).trim(), concluida: false };
  meta.subtarefas = [...(meta.subtarefas || []), subtarefa];
  meta.atualizadoEm = agora();
  commit({ tipo: 'meta:progresso', metaId });
  return subtarefa;
}

export function alternarSubtarefa(metaId, subtarefaId) {
  const meta = getMeta(metaId);
  const subtarefa = meta?.subtarefas?.find((s) => s.id === subtarefaId);
  if (!subtarefa) return;
  subtarefa.concluida = !subtarefa.concluida;
  meta.atualizadoEm = agora();
  commit({ tipo: 'meta:progresso', metaId });
}

export function removerSubtarefa(metaId, subtarefaId) {
  const meta = getMeta(metaId);
  if (!meta) return;
  meta.subtarefas = (meta.subtarefas || []).filter((s) => s.id !== subtarefaId);
  meta.atualizadoEm = agora();
  commit({ tipo: 'meta:progresso', metaId });
}

/* ------------------------------------------------------------------
   Importação / exportação
   ------------------------------------------------------------------ */

export function exportarJSON() {
  return JSON.stringify(dados, null, 2);
}

/** Substitui o estado inteiro (importação). Devolve false se o JSON for inválido. */
export function substituirEstado(bruto) {
  const validado = Store.validarEstado(bruto);
  if (!validado) return false;
  dados = validado;
  ui.metaSelecionadaId = null;
  commit({ tipo: 'reset' });
  return true;
}
