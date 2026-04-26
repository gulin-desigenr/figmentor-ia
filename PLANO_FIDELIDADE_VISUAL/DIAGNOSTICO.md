# DIAGNÓSTICO — Estado Atual do Sistema

> **Documento de referência.** Consulte sempre que precisar saber o que já existe, o que falta, e de quem é a responsabilidade.
> Não é uma fase de execução — é o mapa base para todas as fases.

---

## 1. O Que o Exportador Já Resolve Hoje

Baseado em leitura direta de `src/core/handlers.js` e `src/styles/index.js`:

### Containers
| Setting Elementor | Como é gerado |
|---|---|
| `flex_direction` | `getLayoutDirection(node)` → lê `layoutMode` (VERTICAL=column, HORIZONTAL=row) |
| `justify_content` | `primaryAxisAlignItems`: MIN→flex-start, CENTER→center, MAX→flex-end, SPACE_BETWEEN→space-between |
| `align_items` | `counterAxisAlignItems`: MIN→flex-start, CENTER→center, MAX→flex-end |
| `align_content` | Derivado de `primaryAxisAlignItems` |
| `flex_wrap` | `"nowrap"` apenas quando `flex_direction === "row"` |
| `content_width` | `isRoot + isForcedFull` → `"boxed"` ou `"full"` |
| `width` | `layoutSizingHorizontal`: FIXED→px, FILL→100%, else→px do node |
| `gap` | `node.itemSpacing` (column e row iguais) |
| `padding` | `node.paddingTop/Right/Bottom/Left` |
| `background_background` + `background_color` | Fill SOLID via `extractBackground` |
| `__globals__.background_color` | `fillStyleId` → lookup no `colorMap` |
| `border_radius` | `node.cornerRadius` uniforme ou misto |
| `border_border`, `border_width`, `border_color` | `node.strokes[0]` tipo SOLID |
| `_box_shadow_box_shadow_type` + `_box_shadow_box_shadow` | `node.effects` tipo DROP_SHADOW |
| `css_id` | `sanitizeCssId(node.name)` |

### Widgets de Texto (heading / text-editor)
| Setting | Status |
|---|---|
| `title` / `editor` | ✅ Extraído de `node.characters` |
| `title_color` / `text_color` | ✅ Extraído de fills SOLID do node |
| `align` | ❌ **HARDCODED `"center"` — bug crítico** |
| `typography_typography: "custom"` | ✅ Sempre injetado |
| `typography_font_size` | ✅ De `node.fontSize` |
| `typography_font_weight` | ✅ De `node.fontName.style` via `mapFontWeight` |
| `typography_font_family` | ✅ De `getSafeFontFamily(node)` |
| `typography_line_height` | ❌ Não extraído |
| `typography_letter_spacing` | ❌ Não extraído |
| `typography_text_transform` | ❌ Não extraído |
| `typography_text_decoration` | ❌ Não extraído |
| `typography_font_style` | ❌ Não extraído |
| `__globals__` de cor e tipografia | ✅ Via `fillStyleId` e `textStyleId` |

### Button
| Setting | Status |
|---|---|
| `text`, `text_color` | ✅ |
| `background_color` | ✅ (move de `_background_color`) |
| `size` | ✅ Inferido de `paddingTop + paddingBottom` |
| `align` | ✅ Lido de `layoutSizingHorizontal` e `primaryAxisAlignItems` |
| `selected_icon`, `icon_align`, `icon_indent` | ✅ Se vector com nome FontAwesome |
| `link` | ✅ De `node.reactions` tipo URL |
| `typography_*` | ✅ Mesma lógica dos outros widgets |
| `border_*`, `box_shadow_*` | ✅ |

### Outros Widgets
| Widget | Status |
|---|---|
| `image` | ✅ `image: {url:"", id:""}` + `_width` + bordas/sombras |
| `image-box` | ✅ Título, descrição, cores, tipografia separadas por `getNodeRole` |
| `icon-box` | ✅ Detecção de vector FontAwesome + título/descrição |
| `icon-list` | ✅ Array `icon_list[]` com texto e ícone |
| `image-carousel` | ✅ Array `carousel[]` + configurações |
| `container-carousel` | ✅ Nested carousel com filhos |

---

## 2. O Que o Exportador NÃO Resolve Hoje

| Propriedade Figma | Setting Elementor | Impacto | Fase |
|---|---|---|---|
| `node.textAlignHorizontal` | `align` (heading/text-editor/image) | **CRÍTICO** — hardcoded "center" | FASE_00 |
| `node.lineHeight` | `typography_line_height: {size, unit}` | Alto | FASE_01 |
| `node.letterSpacing` | `typography_letter_spacing: {size, unit}` | Médio | FASE_01 |
| `node.textCase` | `typography_text_transform` | Baixo-médio | FASE_01 |
| `node.textDecoration` | `typography_text_decoration` | Baixo | FASE_01 |
| `node.fontName.style` (italic) | `typography_font_style: "italic"` | Baixo | FASE_01 |
| `node.layoutSizingVertical` | `min_height: {size, unit}` | Alto | FASE_02 |
| Filho com `layoutSizingHorizontal === FILL` em row | `align_self: stretch` + `width: 100%` | Alto | FASE_02 |
| `node.opacity` | `_opacity` | Baixo-médio | FASE_02 |
| Gradient fills | `background_background: "gradient"` + campos | Médio | Backlog |
| Image fills | `background_image` | Médio | Agente |
| Hover states | `*_hover` keys | Baixo | Agente |
| Responsividade | `*_tablet`, `*_mobile` suffixes | Alto | FASE_05 |
| z-index / posição absoluta | `z_index`, `position` | Médio | Agente + CSS |

---

## 3. O Que o Bridge WordPress Já Faz

| Endpoint | Status |
|---|---|
| `GET /wp-json/figmentor/v1/pages/{id}` | ✅ Retorna `_elementor_data` completo + `nocache_headers()` |
| `PUT /wp-json/figmentor/v1/pages/{id}/widgets/{css_id}` | ✅ `array_merge` de settings |
| `POST /wp-json/figmentor/v1/pages/{id}/cache/clear` | ✅ `files_manager->clear_cache()` |
| Autenticação por `X-Figmentor-Token` | ✅ Com fallback para `current_user_can` |
| `wp_slash` ao salvar | ✅ Evita corrupção de JSON |

### O Que o Bridge NÃO Faz Ainda
- Atualização em lote (N widgets em 1 chamada)
- GET de widget individual por `css_id`
- Listagem de páginas com Elementor ativo
- Endpoint estruturado para breakpoints responsivos
- Validação semântica de settings (só valida formato básico)

---

## 4. Matriz de Responsabilidades

| Recurso | Exportador | Bridge | Agente | CSS Custom |
|---|---|---|---|---|
| Estrutura flex container | **Principal** | Não | Corretivo | Não |
| justify_content / align_items | **Principal** | Não | Verificar apenas | Não |
| Gap / padding | **Principal** | Não | Não | Não |
| Sizing horizontal | **Principal** | Não | Não | Não |
| Sizing vertical / min-height | **Próxima feature** | Não | Não | Não |
| align_self de filho | **Próxima feature** | Não | Não | Não |
| Alinhamento de texto | **Bug a corrigir** | Não | Não | Não |
| Tipografia base | **Principal** | Não | Não | Não |
| Line-height / letter-spacing | **Próxima feature** | Não | Pode complementar | Não |
| Background sólido | **Principal** | Não | Não | Não |
| Background gradiente | **Próxima feature** | Não | Pode aplicar | Não |
| Background imagem | Não | Não | **Principal** | Não |
| Bordas / sombras | **Principal** | Não | Não | Não |
| Opacidade | **Próxima feature** | Não | Pode aplicar | Não |
| Hover states | Não | Não | **Principal** | CSS fallback |
| Responsividade | Não | Endpoint futuro | **Principal** | Não |
| z-index / posicionamento abs. | Não | Não | Pode inferir | **Fallback** |
| CSS customizado como fallback | Não | Aceita `custom_css` | **Decide quando usar** | **Principal** |
| Limpeza de cache | Não | **Principal** | Chama | Não |
| Merge incremental de settings | Não | **Principal** | Chama | Não |
| Global colors / typography | **Principal** (injeta `__globals__`) | Não | Verificar antes de override | Não |

---

## 5. Mapa de Conhecimento — Elementor

### Keys de Naming por Widget (consultar antes de montar payload)

| Widget | Cor do texto | Ativador tipografia | Cor de fundo |
|---|---|---|---|
| `heading` | `title_color` | `typography_typography: "custom"` | N/A (usa container) |
| `text-editor` | `text_color` | `typography_typography: "custom"` | N/A |
| `button` | `text_color` | `typography_typography: "custom"` | `background_color` |
| `image-box` | `title_color` + `description_color` | `title_typography_typography` + `description_typography_typography` | N/A |
| `icon-box` | `title_color` + `description_color` | `title_typography_typography` + `description_typography_typography` | N/A |
| `icon-list` | `text_color` | `text_typography_typography` | N/A |

### Prefixos de Settings Avançadas

| Contexto | Prefixo | Exemplo |
|---|---|---|
| Container | Sem prefixo | `border_radius`, `border_border` |
| Widget genérico | `_` (underscore) | `_border_radius`, `_border_border` |
| Widget `button` | Sem prefixo (nativo) | `border_radius`, `border_border` |
| Widget `image` | `image_` | `image_border_radius`, `image_box_shadow` |

### Regras Críticas do Elementor

1. **`typography_typography: "custom"` é obrigatório** — sem ele, todos os campos `typography_*` são ignorados silenciosamente
2. **`background_background: "classic"` é obrigatório para cor sólida** — sem ele, `background_color` é ignorado
3. **Settings erradas não geram erro** — o Elementor aceita o JSON mas ignora keys desconhecidas (white screen silencioso)
4. **Cache obrigatório após qualquer PUT** — sem `clear_cache()`, a página serve o estado antigo

### Responsividade — Sufixos por Breakpoint

```
typography_font_size              ← desktop (sem sufixo)
typography_font_size_tablet       ← tablet
typography_font_size_mobile       ← mobile
```

Funciona para qualquer setting que o Elementor exponha em modo responsivo.

---

## 6. Riscos de Conflito Exportador × Bridge

| Situação | Risco | Mitigação |
|---|---|---|
| Agente reenvia `justify_content` já correto | Sobrescreve valor correto com valor diferente | Protocolo de verificação pré-edição (FASE_03) |
| Agente envia `background_color` local quando existe `__globals__` | Quebra consistência do global | Agente verifica `__globals__` antes de qualquer override de cor |
| Agente envia `typography_font_size` sem `typography_typography: "custom"` | Setting ignorada silenciosamente | Agente sempre inclui o ativador ao enviar qualquer `typography_*` |
| Novo endpoint de bridge sem usar `save_page_data` | JSON corrompido sem `wp_slash` | Sempre usar `Figmentor_Bridge_Elementor_Helper::save_page_data` |

---

*Este documento é referência estática — atualize se o comportamento do exportador mudar.*
