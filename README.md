# HUD de Metas

Tracker de metas pessoais com a tela principal em formato de **roda de HUD**, inspirada no
seletor de missões dos jogos do Batman (Arkham Knight / Arkham City): fundo preto, linhas
finas em ciano, anéis concêntricos girando devagar e os ícones das metas distribuídos na
borda do círculo com a porcentagem logo ao lado.

HTML, CSS e JavaScript puros — sem framework, sem build, sem backend.

---

## Como rodar localmente

O projeto usa **ES Modules**, e o navegador bloqueia módulos abertos direto do disco
(`file://`). Então é preciso servir a pasta por HTTP. Qualquer servidor estático serve:

```bash
# Opção 1 — Node
npx serve .

# Opção 2 — Python (já vem instalado no macOS e na maioria das distros Linux)
python3 -m http.server 8000

# Opção 3 — VS Code
# instale a extensão "Live Server" e clique em "Go Live"
```

Depois abra `http://localhost:3000` (serve) ou `http://localhost:8000` (Python).

Na primeira visita o app cria dados de exemplo: dois containers, um deles com sete metas
cobrindo os três tipos de progresso.

### Dependências externas

Só duas, ambas via CDN no `<head>` — é preciso estar online na primeira carga:

- **Font Awesome 6 Free** (CSS) — os ícones das metas.
- **Google Fonts** — *Saira Condensed* (display) e *Barlow* (texto).

---

## Estrutura de pastas

```
index.html          → marcação da tela, geometria base do SVG e camadas
README.md
css/
  tokens.css        → variáveis de cor, tipografia, espaçamento, sombras
  base.css          → reset, tipografia base, utilitários, foco visível, toasts
  layout.css        → grid da tela principal, barras, responsividade
  wheel.css         → roda HUD, marcadores, animações dos anéis e boot
  panel.css         → painel de detalhe da meta
  sidebar.css       → drawer de containers
  modal.css         → modais, formulários, seletor de ícone
js/
  main.js           → bootstrap, barra superior, atalhos globais
  store.js          → localStorage: schema, validação, migração, seed
  state.js          → estado em memória + pub/sub, mutações, cálculo de progresso
  wheel.js          → render da roda, marcadores, seleção, boot
  panel.js          → render do painel e edição de progresso
  sidebar.js        → containers, exportar/importar
  theme.js          → alternância entre tema escuro e claro
  modals.js         → modal de meta, modal de container, confirmações, toasts
  icons.js          → catálogo de ícones FA e validação de classe
  utils.js          → id, clamp, escape, debounce, trigonometria, download
```

A comunicação entre os módulos é sempre a mesma: quem quer reagir a uma mudança chama
`State.subscribe(fn)` e recebe um evento (`meta:progresso`, `container:trocado`,
`selecao`, `reset`…). Nenhum módulo de tela conversa direto com outro módulo de tela.

---

## Dados no localStorage

Tudo vive numa única chave: **`hud-metas:v1`**. A exceção é o tema (`claro` ou `escuro`),
que fica em **`hud-metas:tema`** e por isso não entra no exportar/importar.

```jsonc
{
  "versao": 1,
  "containerAtivoId": "ctn_ab12",
  "containers": [
    { "id": "ctn_ab12", "nome": "2026 — Metas", "ordem": 0, "criadoEm": "2026-01-04T12:00:00.000Z" }
  ],
  "metas": [
    {
      "id": "meta_9f31",
      "containerId": "ctn_ab12",
      "titulo": "Ler 8 livros",
      "categoria": "Leitura",          // eyebrow acima do título no painel
      "descricao": "Texto livre, várias linhas.",
      "mensagem": "livros lidos",      // aparece ao lado do contador: "2/8 livros lidos"
      "icone": "fa-solid fa-book",
      "tipo": "contador",              // "contador" | "percentual" | "checklist"
      "valorAtual": 2,
      "valorMeta": 8,
      "percentual": 0,                 // usado só quando tipo === "percentual"
      "subtarefas": [                  // usado só quando tipo === "checklist"
        { "id": "st_1", "texto": "Escolher os títulos", "concluida": true }
      ],
      "ordem": 0,
      "criadoEm": "2026-01-04T12:00:00.000Z",
      "atualizadoEm": "2026-01-04T12:00:00.000Z"
    }
  ]
}
```

**Progresso** (`calcularProgresso`, sempre 0–100 arredondado):

| tipo | cálculo |
| --- | --- |
| `contador` | `valorAtual / valorMeta × 100`, com clamp em 0–100 e guarda contra `valorMeta = 0` |
| `percentual` | o próprio campo `percentual` |
| `checklist` | subtarefas concluídas ÷ total (0 se não houver subtarefas) |

O número grande no centro da roda é a **média simples** do progresso das metas do
container ativo.

**Robustez:** ao carregar, o `store.js` valida e saneia o JSON campo a campo. Se estiver
ausente, corrompido ou incompleto, o app recria os dados de exemplo e avisa por um toast.
Toda escrita é síncrona, logo depois de cada mutação.

---

## Atalhos de teclado

| Tecla | Ação |
| --- | --- |
| `←` / `→` | giram a seleção entre as metas do container |
| `Enter` | abre a edição da meta selecionada |
| `N` | abre o modal de nova meta |
| `Esc` | fecha o modal → fecha o drawer → limpa a seleção (nessa ordem) |
| `Tab` | navegação normal; dentro de um modal o foco fica preso até fechar |

Os atalhos ficam desativados enquanto você digita em um campo.

---

## Backup e limpeza dos dados

Como tudo mora no navegador, o drawer (☰) traz duas ações no rodapé:

- **Exportar** — baixa um `hud-metas-AAAA-MM-DD.json` com o estado completo.
- **Importar** — lê um `.json` e **substitui** o estado atual, com confirmação antes.

Para apagar tudo e recomeçar do exemplo inicial, limpe a chave e recarregue:

```js
// no console do navegador (F12)
localStorage.removeItem('hud-metas:v1');
location.reload();
```

Também dá para usar *DevTools → Application → Local Storage* e remover a chave na mão.

---

## Acessibilidade e preferências

- Foco sempre visível (`:focus-visible` com contorno âmbar).
- `aria-label` em todo botão só de ícone, `role="dialog"` + `aria-modal` + focus trap nos
  modais, `aria-live="polite"` nos toasts e nos valores de progresso.
- Marcadores da roda são `<button>` de verdade, alcançáveis por `Tab`.
- Em telas de até 640px os marcadores têm alvo de toque de no mínimo 44px.
- `prefers-reduced-motion: reduce` desliga a rotação dos anéis e a sequência de boot.
- O botão de sol/lua na barra superior alterna entre o tema escuro (padrão) e o claro.

---

## Autocrítica

O que eu mudaria numa segunda passada:

1. **Distribuição no segundo anel.** Hoje as 16 primeiras metas ocupam o anel externo e o
   resto cai num anel interno com espaçamento próprio. Com 17 metas o anel de dentro fica
   com um marcador solitário, o que parece acidental. O certo seria equilibrar os dois
   anéis (ex.: 12 + 5) e considerar rotacionar o anel interno para os ícones não se
   alinharem com os de fora.
2. **Ordenação das metas.** Existe o campo `ordem`, mas não existe interface para mudá-la —
   a posição na roda é a ordem de criação. Arrastar o marcador para reposicionar seria o
   fechamento natural.
3. **Subtarefas no modal.** Ao criar uma meta do tipo checklist você precisa salvar antes
   de adicionar os itens, no painel. Dava para editar a lista já dentro do modal.
4. **Sem desfazer.** Excluir meta ou container só tem a confirmação como rede de proteção.
   Um "desfazer" de alguns segundos dentro do toast custaria pouco e evitaria estrago.
5. **Um só nível de agrupamento.** Containers não têm cor nem ícone próprios, e a
   `categoria` da meta é só texto livre — não filtra nem agrupa nada. Categoria como
   filtro na roda seria útil quando o container passa de dez metas.
6. **Testes.** A validação foi feita com um harness de fumaça rodado em Chrome headless
   (89 checagens de comportamento, do seed ao round-trip de exportação) que não ficou no
   repositório, porque exigiria uma dependência de build que o projeto não quer ter. Um
   `tests.html` com um runner mínimo em JS puro caberia sem quebrar a regra de "sem build".
7. **A roda em telas muito estreitas.** Abaixo de 380px os ícones começam a se aproximar
   demais. Um modo lista alternativo para celular pequeno seria mais honesto do que
   continuar encolhendo o círculo.
