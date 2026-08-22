/**
 * store.js — persistência em localStorage: leitura, escrita, validação e seed.
 * Uma única chave guarda o estado inteiro do aplicativo.
 */

import { agora, gerarId } from './utils.js';

export const CHAVE = 'hud-metas:v1';
export const VERSAO = 1;

export const TIPOS_META = ['contador', 'percentual', 'checklist'];

/** Resultado da última carga (para o main avisar o usuário via toast). */
export const diagnostico = { recuperado: false, motivo: '' };

/* ------------------------------------------------------------------
   Seed — dados de exemplo na primeira visita
   ------------------------------------------------------------------ */
function criarSeed() {
  const dataBase = agora();
  const c1 = gerarId('ctn');
  const c2 = gerarId('ctn');

  const meta = (containerId, ordem, dados) => ({
    id: gerarId('meta'),
    containerId,
    titulo: '',
    categoria: '',
    descricao: '',
    mensagem: '',
    icone: 'fa-solid fa-bullseye',
    tipo: 'percentual',
    valorAtual: 0,
    valorMeta: 1,
    percentual: 0,
    subtarefas: [],
    ordem,
    criadoEm: dataBase,
    atualizadoEm: dataBase,
    ...dados,
  });

  return {
    versao: VERSAO,
    containerAtivoId: c1,
    containers: [
      { id: c1, nome: '2026 — Metas', ordem: 0, criadoEm: dataBase },
      { id: c2, nome: 'Metas do trabalho', ordem: 1, criadoEm: dataBase },
    ],
    metas: [
      meta(c1, 0, {
        titulo: 'Ler 8 livros',
        categoria: 'Leitura',
        descricao: 'Um livro a cada seis semanas, alternando ficção e não-ficção. Registrar as anotações no caderno depois de cada leitura.',
        mensagem: 'livros lidos',
        icone: 'fa-solid fa-book',
        tipo: 'contador',
        valorAtual: 2,
        valorMeta: 8,
      }),
      meta(c1, 1, {
        titulo: 'Reserva de emergência',
        categoria: 'Finanças',
        descricao: 'Guardar seis meses de custo de vida em renda fixa de liquidez diária.',
        mensagem: 'mil reais guardados',
        icone: 'fa-solid fa-piggy-bank',
        tipo: 'contador',
        valorAtual: 14,
        valorMeta: 30,
      }),
      meta(c1, 2, {
        titulo: 'Treinar 3x por semana',
        categoria: 'Saúde',
        descricao: 'Musculação segunda e quinta, corrida no sábado de manhã.',
        mensagem: 'do plano do trimestre',
        icone: 'fa-solid fa-dumbbell',
        tipo: 'percentual',
        percentual: 65,
      }),
      meta(c1, 3, {
        titulo: 'Viagem para o Japão',
        categoria: 'Viagem',
        descricao: 'Duas semanas entre Tóquio, Kyoto e Osaka na primavera.',
        mensagem: '',
        icone: 'fa-solid fa-plane',
        tipo: 'checklist',
        subtarefas: [
          { id: gerarId('st'), texto: 'Renovar o passaporte', concluida: true },
          { id: gerarId('st'), texto: 'Comprar as passagens', concluida: true },
          { id: gerarId('st'), texto: 'Reservar hospedagem', concluida: false },
          { id: gerarId('st'), texto: 'Montar o roteiro dia a dia', concluida: false },
          { id: gerarId('st'), texto: 'Contratar o seguro viagem', concluida: false },
        ],
      }),
      meta(c1, 4, {
        titulo: 'Aprender inglês avançado',
        categoria: 'Idiomas',
        descricao: 'Aulas semanais e trinta minutos de leitura em inglês por dia.',
        mensagem: '',
        icone: 'fa-solid fa-language',
        tipo: 'percentual',
        percentual: 40,
      }),
      meta(c1, 5, {
        titulo: 'Beber 2L de água por dia',
        categoria: 'Saúde',
        descricao: 'Meta diária acompanhada pela garrafa de 500ml: quatro por dia.',
        mensagem: 'copos hoje',
        icone: 'fa-solid fa-droplet',
        tipo: 'contador',
        valorAtual: 3,
        valorMeta: 4,
      }),
      meta(c1, 6, {
        titulo: 'Publicar o portfólio',
        categoria: 'Carreira',
        descricao: 'Site pessoal com três estudos de caso e a página de contato.',
        mensagem: '',
        icone: 'fa-solid fa-code',
        tipo: 'checklist',
        subtarefas: [
          { id: gerarId('st'), texto: 'Escolher os projetos', concluida: true },
          { id: gerarId('st'), texto: 'Escrever os estudos de caso', concluida: false },
          { id: gerarId('st'), texto: 'Registrar o domínio', concluida: true },
          { id: gerarId('st'), texto: 'Publicar', concluida: false },
        ],
      }),
      meta(c2, 0, {
        titulo: 'Certificação de nuvem',
        categoria: 'Formação',
        descricao: 'Estudar duas horas por dia e fazer os simulados no fim de cada módulo.',
        mensagem: 'módulos concluídos',
        icone: 'fa-solid fa-graduation-cap',
        tipo: 'contador',
        valorAtual: 5,
        valorMeta: 12,
      }),
      meta(c2, 1, {
        titulo: 'Reduzir a fila de bugs',
        categoria: 'Engenharia',
        descricao: 'Zerar os bugs abertos há mais de noventa dias.',
        mensagem: '',
        icone: 'fa-solid fa-bug',
        tipo: 'percentual',
        percentual: 25,
      }),
      meta(c2, 2, {
        titulo: 'Onboarding da equipe',
        categoria: 'Gestão',
        descricao: 'Material de integração para quem entra no time.',
        mensagem: '',
        icone: 'fa-solid fa-briefcase',
        tipo: 'checklist',
        subtarefas: [
          { id: gerarId('st'), texto: 'Documentar o setup local', concluida: true },
          { id: gerarId('st'), texto: 'Gravar o tour da arquitetura', concluida: false },
          { id: gerarId('st'), texto: 'Definir o plano de 30 dias', concluida: false },
        ],
      }),
    ],
  };
}

/* ------------------------------------------------------------------
   Validação e saneamento
   ------------------------------------------------------------------ */

function ehObjeto(v) {
  return v !== null && typeof v === 'object' && !Array.isArray(v);
}

function texto(valor, padrao = '') {
  return typeof valor === 'string' ? valor : padrao;
}

function numero(valor, padrao = 0) {
  const n = Number(valor);
  return Number.isFinite(n) ? n : padrao;
}

function sanearContainer(bruto, indice) {
  if (!ehObjeto(bruto)) return null;
  const nome = texto(bruto.nome).trim();
  if (!nome) return null;
  return {
    id: texto(bruto.id) || gerarId('ctn'),
    nome,
    ordem: numero(bruto.ordem, indice),
    criadoEm: texto(bruto.criadoEm) || agora(),
  };
}

function sanearSubtarefa(bruto) {
  if (!ehObjeto(bruto)) return null;
  const texto_ = texto(bruto.texto).trim();
  if (!texto_) return null;
  return {
    id: texto(bruto.id) || gerarId('st'),
    texto: texto_,
    concluida: Boolean(bruto.concluida),
  };
}

function sanearMeta(bruto, indice, idsContainers) {
  if (!ehObjeto(bruto)) return null;
  const titulo = texto(bruto.titulo).trim();
  if (!titulo) return null;

  const containerId = idsContainers.has(bruto.containerId) ? bruto.containerId : null;
  if (!containerId) return null;

  const tipo = TIPOS_META.includes(bruto.tipo) ? bruto.tipo : 'percentual';
  const subtarefas = Array.isArray(bruto.subtarefas)
    ? bruto.subtarefas.map(sanearSubtarefa).filter(Boolean)
    : [];

  return {
    id: texto(bruto.id) || gerarId('meta'),
    containerId,
    titulo,
    categoria: texto(bruto.categoria).trim(),
    descricao: texto(bruto.descricao),
    mensagem: texto(bruto.mensagem).trim(),
    icone: texto(bruto.icone) || 'fa-solid fa-bullseye',
    tipo,
    valorAtual: Math.max(0, Math.round(numero(bruto.valorAtual, 0))),
    valorMeta: Math.max(0, Math.round(numero(bruto.valorMeta, 0))),
    percentual: Math.min(100, Math.max(0, Math.round(numero(bruto.percentual, 0)))),
    subtarefas,
    ordem: numero(bruto.ordem, indice),
    criadoEm: texto(bruto.criadoEm) || agora(),
    atualizadoEm: texto(bruto.atualizadoEm) || agora(),
  };
}

/**
 * Valida e sanea um objeto qualquer no formato do app.
 * Devolve `null` quando o objeto é irrecuperável.
 */
export function validarEstado(bruto) {
  if (!ehObjeto(bruto)) return null;
  if (!Array.isArray(bruto.containers) || !Array.isArray(bruto.metas)) return null;

  const containers = bruto.containers.map(sanearContainer).filter(Boolean);
  if (!containers.length) return null;

  const ids = new Set(containers.map((c) => c.id));
  const metas = bruto.metas.map((m, i) => sanearMeta(m, i, ids)).filter(Boolean);

  const containerAtivoId = ids.has(bruto.containerAtivoId) ? bruto.containerAtivoId : containers[0].id;

  return {
    versao: VERSAO,
    containerAtivoId,
    containers: containers.sort((a, b) => a.ordem - b.ordem),
    metas: metas.sort((a, b) => a.ordem - b.ordem),
  };
}

/**
 * Migra estados de versões anteriores. Hoje só existe a v1, mas o gancho
 * já fica pronto para as próximas.
 */
function migrar(bruto) {
  if (!ehObjeto(bruto)) return bruto;
  if (!bruto.versao || bruto.versao < 1) {
    return { ...bruto, versao: VERSAO };
  }
  return bruto;
}

/* ------------------------------------------------------------------
   API pública
   ------------------------------------------------------------------ */

/** Carrega o estado do localStorage, com fallback para o seed. */
export function carregar() {
  diagnostico.recuperado = false;
  diagnostico.motivo = '';

  let cru = null;
  try {
    cru = window.localStorage.getItem(CHAVE);
  } catch (erro) {
    diagnostico.recuperado = true;
    diagnostico.motivo = 'O navegador bloqueou o armazenamento local. Os dados não serão salvos.';
    return criarSeed();
  }

  if (!cru) {
    const seed = criarSeed();
    salvar(seed);
    return seed;
  }

  let objeto = null;
  try {
    objeto = JSON.parse(cru);
  } catch (erro) {
    diagnostico.recuperado = true;
    diagnostico.motivo = 'Os dados salvos estavam corrompidos. Recriamos o exemplo inicial.';
    const seed = criarSeed();
    salvar(seed);
    return seed;
  }

  const validado = validarEstado(migrar(objeto));
  if (!validado) {
    diagnostico.recuperado = true;
    diagnostico.motivo = 'Os dados salvos estavam incompletos. Recriamos o exemplo inicial.';
    const seed = criarSeed();
    salvar(seed);
    return seed;
  }

  return validado;
}

/** Grava o estado inteiro. Chamado a cada mutação. */
export function salvar(estado) {
  try {
    window.localStorage.setItem(CHAVE, JSON.stringify(estado));
    return true;
  } catch (erro) {
    console.warn('[store] não foi possível salvar:', erro);
    return false;
  }
}

/** Apaga tudo do localStorage. */
export function limpar() {
  try {
    window.localStorage.removeItem(CHAVE);
    return true;
  } catch (erro) {
    return false;
  }
}

/** Estado inicial de exemplo (exposto para o "restaurar exemplo"). */
export function estadoDeExemplo() {
  return criarSeed();
}
