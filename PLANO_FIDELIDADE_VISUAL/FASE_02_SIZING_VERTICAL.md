# FASE 02 — Sizing Vertical e Align-Self de Filhos

> **Pré-requisito:** FASE_01 aprovada.
> **Estimativa:** 3–5 dias
> **Foco:** `src/core/handlers.js` — função `mapContainer`

---

## Objetivo

Resolver dois problemas que fazem containers ficarem "achatados" ou com filhos que não se distribuem corretamente:

1. **`min_height`** — containers com altura definida no Figma não geram `min_height` no JSON
2. **`align-self` de filhos** — quando um filho tem `layoutSizingHorizontal === FILL` dentro de um row container (ou `layoutSizingVertical === FILL` dentro de column), ele deveria esticar para preencher o espaço

---

## Contexto

### Problema 1 — min_height

O Figma tem `layoutSizingVertical` com três valores:
- `"FIXED"` → o node tem uma altura definida em pixels → `min_height: { size: node.height, unit: "px" }`
- `"HUG"` → o node cresce para abraçar seu conteúdo → **não enviar `min_height`** (Elementor faz isso por padrão)
- `"FILL"` → o node preenche o espaço do pai → comportamento dependente do contexto (ver abaixo)

No Elementor, `min_height` funciona como `min-height` CSS — garante uma altura mínima sem impedir crescimento.

### Problema 2 — align-self de filhos (FILL)

Quando um filho dentro de um **row container** tem `layoutSizingHorizontal === FILL`, ele deve ocupar todo o eixo cruzado (altura). Isso é equivalente a `align-self: stretch` no CSS.

No Elementor, isso é controlado via `_width` nos widgets (para width) ou — em containers filhos — via `width: { size: 100, unit: "%" }`. O `align_self: stretch` específico por filho não é uma setting nativa exposta no Elementor da mesma forma que no CSS puro; o comportamento é controlado pelo `align_items` do pai.

**Situações:**
- Filho com `FILL` horizontal em um **row container** → o pai já deve ter `align_items` que permita o stretch (já exportado). O filho deve ter `width: 100%` ou, se for widget, `_width: { size: 100, unit: "%" }`.
- Filho com `FILL` vertical em um **column container** → em Elementor, a altura de um filho em column não tem controle direto equivalente ao Figma. O `min_height` do filho pode ser a aproximação mais próxima.

### Desafio Arquitetural

Para saber se um filho tem `FILL`, precisamos processar os filhos com conhecimento do contexto do pai (direção do container). Atualmente `mapContainer` já itera os filhos — a mudança é: ao construir cada filho, verificar `child.layoutSizingHorizontal` e `child.layoutSizingVertical` e injetar settings adicionais no objeto filho **antes** de retorná-lo.

---

## Escopo

**O que esta fase cobre:**
- `min_height` para containers com `layoutSizingVertical === "FIXED"`
- `width: 100%` para containers filhos com `layoutSizingHorizontal === "FILL"`
- `_width: 100%` para widgets filhos com `layoutSizingHorizontal === "FILL"`
- `opacity` de node (`node.opacity < 1`) → `_opacity`

**O que esta fase NÃO cobre:**
- Responsividade por breakpoint (→ FASE_05)
- Background gradiente (→ backlog)
- Hover states (→ agente)

---

## Itens de Análise (antes de escrever código)

1. Confirmar que `node.layoutSizingVertical` existe em FrameNodes e GroupNodes — verificar quais tipos de node expõem essa propriedade
2. Confirmar que `node.height` retorna o valor em pixels quando `layoutSizingVertical === "FIXED"`
3. Entender o fluxo atual: `mapContainer` chama `traverseNode` nos filhos → `traverseNode` retorna o objeto filho → `mapContainer` adiciona ao array `children`. A injeção de settings extras nos filhos precisa acontecer **depois** de `traverseNode` retornar, antes de adicionar ao array.
4. Entender como `handleManualTag` retorna containers vs widgets — containers filhos têm `elType: "container"`, widgets têm `elType: "widget"`. O path de injeção de width é diferente para cada tipo.
5. Verificar `_opacity` no Elementor: aceita string ou number? (Testar com `"50"` e `50`)

---

## Tarefas Práticas

### Tarefa 1 — Adicionar `min_height` em `mapContainer`

Em `src/core/handlers.js`, função `mapContainer`, adicionar após a construção do objeto `settings`:

```js
// Sizing vertical
if (node.layoutSizingVertical === "FIXED" && node.height > 0) {
  settings.min_height = { size: Math.round(node.height), unit: "px" };
}
// FILL e HUG não geram min_height — Elementor usa altura auto por padrão
```

### Tarefa 2 — Adicionar `_opacity` em containers e widgets

Em `mapContainer`, após as outras settings:

```js
if (node.opacity !== undefined && node.opacity < 1) {
  settings._opacity = String(Math.round(node.opacity * 100));
}
```

Em `handleManualTag`, antes do `return` final (widgets):

```js
if (node.opacity !== undefined && node.opacity < 1) {
  settings._opacity = String(Math.round(node.opacity * 100));
}
```

### Tarefa 3 — Injetar width em filhos FILL

Em `mapContainer`, ao processar o array de filhos retornados por `traverseNode`, adicionar uma passagem de pós-processamento:

```js
// Após: const res = await traverseNode(child, ...)
// Antes: children.push(res)

if (res && child.layoutSizingHorizontal === "FILL") {
  if (res.elType === "container") {
    // Container filho — sobrescrever width
    res.settings = res.settings || {};
    res.settings.width = { size: 100, unit: "%" };
    res.settings.content_width = "full";
  } else if (res.elType === "widget") {
    // Widget filho — usar _width
    res.settings = res.settings || {};
    res.settings._width = { size: 100, unit: "%" };
  }
}
```

> **Atenção:** Verificar que essa injeção não sobrescreve um `width` já correto que o próprio filho calculou internamente. Usar `Object.assign` ou verificar antes.

### Tarefa 4 — Build

```bash
npm run build
```

---

## Validações

### Validação 1 — min_height

| Cenário Figma | Resultado esperado |
|---|---|
| Frame com `layoutSizingVertical: "FIXED"`, `height: 700` | `min_height: { size: 700, unit: "px" }` |
| Frame com `layoutSizingVertical: "HUG"` | `min_height` ausente |
| Frame com `layoutSizingVertical: "FILL"` | `min_height` ausente (por ora — FILL depende do contexto pai) |

### Validação 2 — align-self (FILL horizontal)

| Cenário Figma | Resultado esperado |
|---|---|
| Container filho com `layoutSizingHorizontal: "FILL"` dentro de row container | `width: { size: 100, unit: "%" }` no filho |
| Widget filho com `layoutSizingHorizontal: "FILL"` dentro de row | `_width: { size: 100, unit: "%" }` no widget |
| Filho com `layoutSizingHorizontal: "FIXED"` | Sem alteração no width do filho |

### Validação 3 — opacity

| Cenário | Resultado esperado |
|---|---|
| Node com `opacity: 0.5` | `_opacity: "50"` |
| Node com `opacity: 1` | `_opacity` ausente |

### Validação 4 — Teste Visual no Elementor

1. Criar hero section com altura fixa de 600px no Figma
2. Exportar → importar → confirmar que o container tem `min_height: 600px`
3. Criar row container com dois filhos, ambos FILL horizontal
4. Confirmar que ambos têm `width: 100%` e que o layout visual é correto

### Validação 5 — Não-regressão

- Containers que antes não tinham `min_height` continuam sem (HUG e sem sizing)
- `width` de containers que eram FIXED continua em px
- Nenhum widget recebeu `_width` incorretamente

---

## Checkpoint de Conclusão

- [ ] `mapContainer` gera `min_height` para containers com `layoutSizingVertical === "FIXED"`
- [ ] Containers HUG e FILL não geram `min_height`
- [ ] Filhos FILL horizontal em row container recebem `width: 100%`
- [ ] Filhos FILL horizontal que são widgets recebem `_width: 100%`
- [ ] `_opacity` gerado corretamente quando `node.opacity < 1`
- [ ] `npm run build` sem erros
- [ ] Teste visual de hero section com altura fixa funciona no Elementor
- [ ] Não-regressão confirmada

**Só avançar para FASE_03/04 após todos os itens acima marcados.**

---

## Riscos Específicos

| Risco | Mitigação |
|---|---|
| `layoutSizingVertical` não existe em todos os tipos de node (ex: GROUP, COMPONENT) | Guard: `if ("layoutSizingVertical" in node && ...)` |
| Injeção de `width: 100%` em container filho que já calculou width corretamente via FIXED | Verificar antes: só injetar se `child.layoutSizingHorizontal === "FILL"` |
| `_opacity` aceita string ou number no Elementor — inconsistência silenciosa | Testar com ambos; usar o que Elementor renderiza corretamente |
| Container raiz (isRoot) não deve ter `min_height` sobrescrevendo o comportamento de seção full | Verificar se o guard `isRoot` já presente em `mapContainer` resolve isso |
| Filho dentro de `container-carousel` — `traverseNode` retorna estrutura diferente | Verificar se a passagem de pós-processamento é executada também nesses paths |

---

## O Que NÃO Fazer Nesta Fase

- Não adicionar responsividade — `min_height_tablet`, `min_height_mobile` são escopo de FASE_05
- Não mexer em `extractTextStyle` (já foi FASE_01)
- Não mexer em backgrounds gradiente (backlog)
- Não atualizar WORKFLOW_ESTILIZACAO.md (→ FASE_03)
- Não alterar o plugin WordPress (→ FASE_04)
