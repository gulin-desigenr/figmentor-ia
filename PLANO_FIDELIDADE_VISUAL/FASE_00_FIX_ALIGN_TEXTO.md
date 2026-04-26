# FASE 00 — Correção Crítica: `align` Hardcoded

> **Pré-requisito:** Nenhum. Esta é a primeira fase a ser executada.
> **Estimativa:** 1–2 dias (análise + implementação + validação)
> **Foco:** Exportador Figmentor — `src/core/handlers.js`

---

## Objetivo

Eliminar o bug em que `settings.align` é hardcoded como `"center"` para todos os widgets de texto, independente do alinhamento real definido no Figma. Este é o bug de maior impacto na fidelidade visual atual — afeta praticamente todo layout de texto.

---

## Contexto

No código atual, em `handlers.js`, todos os handlers que criam widgets de texto iniciam com:

```js
let settings = { align: "center" };
```

E `mapText` (em `handlers.js`) também não lê o alinhamento do node — retorna sempre `"center"`.

O Figma expõe `node.textAlignHorizontal` com os valores `"LEFT"`, `"CENTER"`, `"RIGHT"`, `"JUSTIFIED"`. O mapeamento para o Elementor é direto:

| Figma `textAlignHorizontal` | Elementor `align` |
|---|---|
| `"LEFT"` | `"left"` |
| `"CENTER"` | `"center"` |
| `"RIGHT"` | `"right"` |
| `"JUSTIFIED"` | `"justify"` |

A key `align` existe nos widgets: `heading`, `text-editor`, `image`, `image-box` (título), `icon-box` (título).

---

## Escopo

**O que esta fase cobre:**
- Corrigir `align` em `handleManualTag` para: `heading`, `text-editor`, `image-box`, `icon-box`
- Corrigir `align` em `mapText`
- Corrigir `align` em `mapImage` (alinhamento da imagem dentro do container)

**O que esta fase NÃO cobre:**
- Alinhamento vertical (`align-items` do container pai)
- Line-height, letter-spacing ou qualquer outra propriedade tipográfica (→ FASE_01)
- Sizing de containers (→ FASE_02)

---

## Itens de Análise (fazer antes de escrever código)

1. Abrir `src/core/handlers.js` e localizar **todos** os pontos onde `settings.align` é definido
2. Confirmar que `node.textAlignHorizontal` existe nos seguintes tipos de node da API do Figma:
   - Nodes do tipo `TEXT` → sim, existe
   - Frames/Groups com textos filhos → **não existe** — nesses casos, ler o `textAlignHorizontal` do primeiro node TEXT filho
3. Verificar se `mapImage` deve usar `align` baseado em outra propriedade (posição do image dentro do container pai, ou propriedade própria do node)
4. Verificar o caso `image-box` e `icon-box`: o `align` do widget controla o alinhamento global do bloco, não apenas do texto. Decidir se lê do primeiro texto filho ou do node raiz.

---

## Tarefas Práticas

### Tarefa 1 — Criar helper de alinhamento

Em `src/utils/nodes.js`, adicionar a função:

```js
export function getTextAlign(node) {
  // Para nodes TEXT diretos
  if (node.type === "TEXT" && node.textAlignHorizontal) {
    const map = { LEFT: "left", CENTER: "center", RIGHT: "right", JUSTIFIED: "justify" };
    return map[node.textAlignHorizontal] || "left";
  }
  // Para frames/groups: ler do primeiro filho TEXT encontrado
  if ("findOne" in node) {
    const textChild = node.findOne(n => n.type === "TEXT");
    if (textChild && textChild.textAlignHorizontal) {
      const map = { LEFT: "left", CENTER: "center", RIGHT: "right", JUSTIFIED: "justify" };
      return map[textChild.textAlignHorizontal] || "left";
    }
  }
  return "left"; // fallback seguro — "left" é o default do CSS
}
```

> **Nota:** O fallback é `"left"` (não `"center"`) porque `left` é o comportamento CSS padrão, e enviar `"left"` explicitamente não quebra nada.

### Tarefa 2 — Aplicar em `mapText`

Localizar `mapText` em `handlers.js`. Substituir `align: "center"` por:

```js
align: getTextAlign(node)
```

Adicionar o import de `getTextAlign` no topo do arquivo.

### Tarefa 3 — Aplicar em `handleManualTag` para `heading` e `text-editor`

Nos branches `tag === "heading"` e `tag === "text-editor"`, substituir `settings.align = "center"` (ou remover o hardcode do `let settings = { align: "center" }`) por:

```js
settings.align = getTextAlign(node);
```

### Tarefa 4 — Aplicar em `handleManualTag` para `image-box` e `icon-box`

Nos branches correspondentes, adicionar após as settings de texto:

```js
settings.align = getTextAlign(node);
```

### Tarefa 5 — Aplicar em `mapImage`

Em `mapImage`, substituir `align: "center"` por:

```js
align: "center" // imagens: manter center por padrão — alinhamento é responsabilidade do container pai
```

> **Decisão:** Para `image`, manter `"center"` como default razoável. O posicionamento real de uma imagem é controlado pelo `justify_content` e `align_items` do container pai, não pelo `align` do widget. Não há `textAlignHorizontal` em nodes de imagem.

### Tarefa 6 — Build e validação

```bash
npm run build
```

---

## Validações

### Validação 1 — Testes de Mapping (mental/manual antes do build)

| Cenário Figma | Resultado esperado no JSON |
|---|---|
| Texto com `textAlignHorizontal: "LEFT"` | `"align": "left"` |
| Texto com `textAlignHorizontal: "CENTER"` | `"align": "center"` |
| Texto com `textAlignHorizontal: "RIGHT"` | `"align": "right"` |
| Texto com `textAlignHorizontal: "JUSTIFIED"` | `"align": "justify"` |
| Frame com texto filho LEFT | `"align": "left"` |
| Node sem filhos TEXT | `"align": "left"` (fallback) |

### Validação 2 — Teste Real no Figma

1. Criar frame com 3 textos: um LEFT, um CENTER, um RIGHT
2. Taguear como `[HEADING]`, `[HEADING]`, `[TEXT-EDITOR]`
3. Exportar JSON
4. Inspecionar JSON: verificar que cada elemento tem o `align` correto
5. Importar no Elementor como template
6. Confirmar visualmente que os alinhamentos são aplicados

### Validação 3 — Não-regressão

Exportar um template existente que funcionava antes — confirmar que nenhuma outra propriedade foi alterada.

---

## Checkpoint de Conclusão

- [ ] `getTextAlign` criado em `src/utils/nodes.js` e importado em `handlers.js`
- [ ] `mapText` usa `getTextAlign(node)` — não tem mais `"center"` hardcoded
- [ ] `handleManualTag` para `heading` usa `getTextAlign(node)`
- [ ] `handleManualTag` para `text-editor` usa `getTextAlign(node)`
- [ ] `handleManualTag` para `image-box` usa `getTextAlign(node)`
- [ ] `handleManualTag` para `icon-box` usa `getTextAlign(node)`
- [ ] `mapImage` mantém `"center"` com comentário explicativo
- [ ] `npm run build` sem erros
- [ ] JSON exportado de texto LEFT-aligned contém `"align": "left"`
- [ ] Template importado no Elementor mostra alinhamentos corretos
- [ ] Nenhuma outra propriedade foi alterada (validação de não-regressão)

**Só avançar para FASE_01 após todos os itens acima marcados.**

---

## Riscos Específicos

| Risco | Mitigação |
|---|---|
| `textAlignHorizontal` retornar `figma.mixed` em texto com alinhamentos diferentes no mesmo node | Guard: `if (node.textAlignHorizontal !== figma.mixed)` antes de acessar |
| Frame sem nenhum filho TEXT — `findOne` retorna null | Guard: verificar null antes de acessar `textChild.textAlignHorizontal` |
| `image-box` com múltiplos textos com alinhamentos diferentes | Usar o alinhamento do node raiz (frame principal), não do texto filho |

---

## O Que NÃO Fazer Nesta Fase

- Não alterar `line-height`, `letter-spacing` ou qualquer outra propriedade tipográfica → FASE_01
- Não mexer em `mapContainer` ou sizing → FASE_02
- Não alterar o workflow do agente → FASE_03
- Não mexer no plugin WordPress → FASE_04
