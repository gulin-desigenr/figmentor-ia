# FASE 01 — Tipografia Completa no Exportador

> **Pré-requisito:** FASE_00 aprovada.
> **Estimativa:** 3–5 dias (análise de API + implementação + validação)
> **Foco:** `src/styles/index.js` — função `extractTextStyle`

---

## Objetivo

Fazer o exportador produzir um JSON tipograficamente fiel ao design Figma: `line-height`, `letter-spacing`, `text-transform`, `text-decoration` e `font-style` (italic). Todas essas propriedades nascem da mesma função `extractTextStyle` — uma mudança centralizada que beneficia todos os widgets de texto.

---

## Contexto

`extractTextStyle` atualmente retorna: `{ color, size, weight, fontFamily, globalColorId, globalTypoId }`.

Após esta fase, deve retornar também: `{ lineHeight, letterSpacing, textTransform, textDecoration, fontStyle }`.

Todos os handlers que consomem esse objeto precisam mapear os novos campos para as keys corretas do Elementor.

O ativador `typography_typography: "custom"` já está presente em todos os handlers — os novos campos funcionarão sem mudança adicional nos handlers, **exceto** pelo fato de que precisam ser mapeados explicitamente.

---

## Escopo

**O que esta fase cobre:**
- `extractTextStyle` em `src/styles/index.js`
- Mapeamento dos novos campos em todos os handlers que usam `extractTextStyle`
- Widgets afetados: `heading`, `text-editor`, `button`, `image-box`, `icon-box`, `icon-list`, `mapText`

**O que esta fase NÃO cobre:**
- `align` (já corrigido na FASE_00)
- Sizing vertical de containers (→ FASE_02)
- Responsividade por breakpoint (→ FASE_05)

---

## Propriedades da API do Figma

### `node.lineHeight`
```
Tipo: { unit: "AUTO" | "PIXELS" | "PERCENT", value?: number }
Quando unit === "AUTO": não enviar campo (Elementor usa o default do navegador)
Quando unit === "PIXELS": typography_line_height: { size: value, unit: "px" }
Quando unit === "PERCENT": typography_line_height: { size: value, unit: "%" }
Atenção: pode ser figma.mixed em textos com múltiplos estilos
```

### `node.letterSpacing`
```
Tipo: { unit: "PIXELS" | "PERCENT", value: number }
PIXELS → typography_letter_spacing: { size: value, unit: "px" }
PERCENT → typography_letter_spacing: { size: value, unit: "em" }  ← Elementor usa "em" para relativo
Atenção: pode ser figma.mixed
```

### `node.textCase`
```
Valores: "ORIGINAL" | "UPPER" | "LOWER" | "TITLE" | "SMALL_CAPS"
ORIGINAL → não enviar campo
UPPER    → typography_text_transform: "uppercase"
LOWER    → typography_text_transform: "lowercase"
TITLE    → typography_text_transform: "capitalize"
SMALL_CAPS → typography_text_transform: "uppercase" (melhor aproximação)
```

### `node.textDecoration`
```
Valores: "NONE" | "UNDERLINE" | "STRIKETHROUGH"
NONE         → não enviar campo
UNDERLINE    → typography_text_decoration: "underline"
STRIKETHROUGH → typography_text_decoration: "line-through"
```

### `node.fontName.style` (italic)
```
Se o style contém "Italic" → typography_font_style: "italic"
Caso contrário → não enviar campo
Exemplos: "Bold Italic", "Regular Italic", "Light Italic"
```

---

## Tarefas Práticas

### Tarefa 1 — Expandir `extractTextStyle`

Em `src/styles/index.js`, expandir a função para extrair as novas propriedades:

```js
// Dentro de extractTextStyle, após as extrações existentes:

// Line-height
let lineHeight = null;
if (node.lineHeight !== undefined && node.lineHeight !== figma.mixed) {
  if (node.lineHeight.unit !== "AUTO") {
    lineHeight = {
      size: node.lineHeight.value,
      unit: node.lineHeight.unit === "PIXELS" ? "px" : "%"
    };
  }
}

// Letter-spacing
let letterSpacing = null;
if (node.letterSpacing !== undefined && node.letterSpacing !== figma.mixed) {
  if (node.letterSpacing.value !== 0) {
    letterSpacing = {
      size: node.letterSpacing.value,
      unit: node.letterSpacing.unit === "PIXELS" ? "px" : "em"
    };
  }
}

// Text-transform
let textTransform = null;
if (node.textCase !== undefined && node.textCase !== figma.mixed) {
  const caseMap = { UPPER: "uppercase", LOWER: "lowercase", TITLE: "capitalize", SMALL_CAPS: "uppercase" };
  textTransform = caseMap[node.textCase] || null;
}

// Text-decoration
let textDecoration = null;
if (node.textDecoration !== undefined && node.textDecoration !== figma.mixed) {
  const decorMap = { UNDERLINE: "underline", STRIKETHROUGH: "line-through" };
  textDecoration = decorMap[node.textDecoration] || null;
}

// Font-style italic
let fontStyle = null;
if (node.fontName !== undefined && node.fontName !== figma.mixed) {
  if (node.fontName.style.includes("Italic")) {
    fontStyle = "italic";
  }
}

return { color, size, weight, fontFamily, globalColorId, globalTypoId,
         lineHeight, letterSpacing, textTransform, textDecoration, fontStyle };
```

### Tarefa 2 — Criar helper de aplicação de tipografia

Para evitar repetição nos handlers, criar uma função utilitária em `src/utils/typography.js`:

```js
export function applyTypographySettings(settings, style, prefix = "typography") {
  // Ativador — já existente nos handlers, mas garantir aqui também
  settings[`${prefix}_typography`] = "custom";

  if (style.size) settings[`${prefix}_font_size`] = { size: style.size, unit: "px" };
  if (style.weight) settings[`${prefix}_font_weight`] = style.weight;
  if (style.fontFamily) settings[`${prefix}_font_family`] = style.fontFamily;
  if (style.lineHeight) settings[`${prefix}_line_height`] = style.lineHeight;
  if (style.letterSpacing) settings[`${prefix}_letter_spacing`] = style.letterSpacing;
  if (style.textTransform) settings[`${prefix}_text_transform`] = style.textTransform;
  if (style.textDecoration) settings[`${prefix}_text_decoration`] = style.textDecoration;
  if (style.fontStyle) settings[`${prefix}_font_style`] = style.fontStyle;
}
```

> Este helper recebe `prefix` porque `image-box` e `icon-box` usam `title_typography_*` e `description_typography_*` — e o mesmo helper resolve tudo.

### Tarefa 3 — Atualizar handlers para usar o helper

Em `handlers.js`, para cada widget de texto, substituir o bloco manual de settings tipográficas por chamadas ao helper:

**Exemplo para `heading`:**
```js
// Antes:
settings.typography_typography = "custom";
settings.typography_font_size = { size: mainStyle.size, unit: "px" };
settings.typography_font_weight = mainStyle.weight;
if (mainStyle.fontFamily) settings.typography_font_family = mainStyle.fontFamily;

// Depois:
applyTypographySettings(settings, mainStyle, "typography");
```

**Exemplo para `image-box` (título):**
```js
applyTypographySettings(settings, tStyle, "title_typography");
```

Aplicar para todos os widgets: `heading`, `text-editor`, `button`, `image-box` (título e descrição), `icon-box` (título e descrição), `icon-list`, `mapText`.

### Tarefa 4 — Build

```bash
npm run build
```

---

## Validações

### Validação 1 — Casos de API do Figma

| Cenário | Resultado esperado |
|---|---|
| `lineHeight.unit === "AUTO"` | `typography_line_height` ausente no JSON |
| `lineHeight.unit === "PIXELS"`, `value: 24` | `{ size: 24, unit: "px" }` |
| `lineHeight.unit === "PERCENT"`, `value: 150` | `{ size: 150, unit: "%" }` |
| `letterSpacing.unit === "PIXELS"`, `value: 2` | `{ size: 2, unit: "px" }` |
| `letterSpacing.unit === "PERCENT"`, `value: 5` | `{ size: 5, unit: "em" }` |
| `letterSpacing.value === 0` | `typography_letter_spacing` ausente |
| `textCase === "ORIGINAL"` | `typography_text_transform` ausente |
| `textCase === "UPPER"` | `typography_text_transform: "uppercase"` |
| `textDecoration === "NONE"` | `typography_text_decoration` ausente |
| `fontName.style === "Bold Italic"` | `typography_font_style: "italic"` |
| `fontName === figma.mixed` | `typography_font_style` ausente |

### Validação 2 — Teste Real no Figma

1. Criar frame com heading: `Bold Italic`, `font-size: 48px`, `line-height: 1.2 (AUTO/PERCENT)`, `letter-spacing: 2px`, `UPPERCASE`
2. Exportar JSON
3. Inspecionar: verificar presença de `typography_line_height`, `typography_letter_spacing`, `typography_text_transform`, `typography_font_style`
4. Importar no Elementor — confirmar visual

### Validação 3 — Não-regressão

- `typography_font_size`, `typography_font_weight`, `typography_font_family` ainda presentes como antes
- `typography_typography: "custom"` ainda presente em todos os widgets
- `__globals__` de cor e tipografia ainda funcionando

---

## Checkpoint de Conclusão

- [ ] `extractTextStyle` retorna `lineHeight`, `letterSpacing`, `textTransform`, `textDecoration`, `fontStyle`
- [ ] Todos os campos guardam `figma.mixed` antes de acessar
- [ ] Helper `applyTypographySettings` criado em `src/utils/typography.js`
- [ ] Todos os handlers de widget de texto usam o helper (ou mapeiam os novos campos manualmente)
- [ ] `npm run build` sem erros
- [ ] JSON de heading Bold Italic com line-height e uppercase produz todas as keys corretas
- [ ] Elementor renderiza corretamente os novos campos
- [ ] Não-regressão confirmada nos campos existentes

**Só avançar para FASE_02 após todos os itens acima marcados.**

---

## Riscos Específicos

| Risco | Mitigação |
|---|---|
| `lineHeight`, `letterSpacing`, `textCase`, `textDecoration` retornando `figma.mixed` | Guard `!== figma.mixed` antes de cada acesso |
| `typography_letter_spacing` em "em" vs "px" — Elementor pode interpretar diferente | Validar visualmente no Elementor com um valor de referência conhecido |
| Helper `applyTypographySettings` sobrescrevendo ativador em widgets que já o setavam antes | Verificar que o ativador ainda está presente no JSON final |
| `image-box` e `icon-box` com prefixos compostos (`title_typography_*`) — testar que o prefix dinâmico funciona | Teste específico para esses dois widgets |

---

## O Que NÃO Fazer Nesta Fase

- Não mexer em `align` (já foi FASE_00)
- Não mexer em sizing de containers (→ FASE_02)
- Não mexer no WORKFLOW_ESTILIZACAO.md ainda (→ FASE_03)
- Não adicionar responsividade (`_tablet`, `_mobile`) — isso é escopo de FASE_05
- Não extrair line-height de nodes que não sejam TEXT (containers não têm `lineHeight`)
