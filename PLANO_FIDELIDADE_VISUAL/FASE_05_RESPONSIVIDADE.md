# FASE 05 — Responsividade por Breakpoint via Agente

> **Pré-requisitos:** FASE_03 e FASE_04 concluídas.
> **Estimativa:** 5–7 dias
> **Foco:** Agente de IA + bridge (novo endpoint de breakpoints)

---

## Objetivo

O agente consegue aplicar overrides responsivos em páginas Elementor, lendo frames de diferentes tamanhos no Figma e aplicando os sufixos `_tablet` e `_mobile` nas settings corretas.

Esta fase não altera o exportador — a responsividade é inferida pelo agente com base em frames Figma separados por breakpoint.

---

## Contexto

### Como o Elementor armazena responsividade

O Elementor usa sufixos nas keys de settings para armazenar overrides por breakpoint:

```json
{
  "typography_font_size": { "size": 48, "unit": "px" },
  "typography_font_size_tablet": { "size": 36, "unit": "px" },
  "typography_font_size_mobile": { "size": 24, "unit": "px" },
  "padding": { "top": 80, "right": 0, "bottom": 80, "left": 0, "unit": "px" },
  "padding_tablet": { "top": 60, "right": 20, "bottom": 60, "left": 20, "unit": "px" },
  "padding_mobile": { "top": 40, "right": 16, "bottom": 40, "left": 16, "unit": "px" }
}
```

Todos os overrides ficam no mesmo objeto `settings` do elemento — não há estrutura separada por breakpoint.

### Convenção de Frames no Figma

Para que o agente consiga cruzar os dados, o designer deve criar frames nomeados com convenção específica:

```
[DESKTOP] Nome da Seção   ← frame principal (sem sufixo de breakpoint)
[TABLET] Nome da Seção    ← mesmo conteúdo adaptado para tablet
[MOBILE] Nome da Seção    ← mesmo conteúdo adaptado para mobile
```

Os `css_id` dos elementos dentro de cada frame devem ser idênticos — é assim que o agente cruza o mesmo elemento nos três breakpoints.

### Breakpoints Padrão do Elementor

| Dispositivo | Breakpoint padrão |
|---|---|
| Desktop | > 1024px (sem sufixo nas settings) |
| Tablet | ≤ 1024px (sufixo `_tablet`) |
| Mobile | ≤ 767px (sufixo `_mobile`) |

---

## Escopo

**O que esta fase cobre:**
- Convenção de naming de frames Figma para breakpoints
- Protocolo do agente para leitura de frames de múltiplos tamanhos
- Novo endpoint no bridge: `PUT /pages/{id}/widgets/{css_id}/breakpoints`
- Quais settings suportam sufixo `_tablet`/`_mobile`
- Validação de cenário real

**O que esta fase NÃO cobre:**
- Breakpoints customizados do Elementor (além de tablet e mobile)
- Responsividade gerada automaticamente pelo exportador (fora do escopo arquitetural)
- Hide/show por device (`hide_desktop`, `hide_tablet`, `hide_mobile`) — será tratado separadamente

---

## Itens de Análise

1. Confirmar quais settings do Elementor suportam sufixo responsivo — nem todas suportam (ex: `css_id` não tem versão `_tablet`)
2. Confirmar se `width_tablet` e `width_mobile` são keys válidas no Elementor para containers
3. Confirmar comportamento do Elementor quando `_tablet` está presente mas `_mobile` não — ele herda do tablet ou do desktop?
4. Definir o comportamento do agente quando um frame TABLET não existe (graceful degradation — pular, não errar)

### Settings que Suportam Sufixo Responsivo (lista base)

| Setting | Desktop | Tablet | Mobile |
|---|---|---|---|
| `typography_font_size` | Sim | `_tablet` | `_mobile` |
| `typography_line_height` | Sim | `_tablet` | `_mobile` |
| `typography_letter_spacing` | Sim | `_tablet` | `_mobile` |
| `padding` | Sim | `_tablet` | `_mobile` |
| `margin` | Sim | `_tablet` | `_mobile` |
| `gap` | Sim | `_tablet` | `_mobile` |
| `width` | Sim | `_tablet` | `_mobile` |
| `min_height` | Sim | `_tablet` | `_mobile` |
| `align` | Sim | `_tablet` | `_mobile` |

**Não suportam sufixo:** `css_id`, `background_background`, `flex_direction`, `justify_content`, `align_items`, `border_border`, `border_width`, `border_color`.

---

## Tarefas Práticas

### Tarefa 1 — Novo Endpoint no Bridge

**Rota:** `PUT /wp-json/figmentor/v1/pages/{page_id}/widgets/{css_id}/breakpoints`

**Body esperado:**
```json
{
  "tablet": {
    "typography_font_size": { "size": 36, "unit": "px" },
    "padding": { "top": 60, "right": 20, "bottom": 60, "left": 20, "unit": "px" }
  },
  "mobile": {
    "typography_font_size": { "size": 24, "unit": "px" },
    "padding": { "top": 40, "right": 16, "bottom": 40, "left": 16, "unit": "px" }
  }
}
```

**Comportamento:**
1. Para cada key em `tablet`: adicionar ao settings do elemento a key com sufixo `_tablet` (ex: `typography_font_size_tablet`)
2. Para cada key em `mobile`: adicionar sufixo `_mobile`
3. Nunca remover ou alterar keys sem sufixo (as de desktop)
4. Salvar e retornar resultado

O bridge aplica os sufixos automaticamente — o agente envia as settings sem sufixo, o bridge sabe que está no contexto de breakpoints.

### Tarefa 2 — Protocolo do Agente para Responsividade

Adicionar ao `WORKFLOW_ESTILIZACAO.md` uma seção de responsividade:

```
## Passo Responsivo (opcional — requer frames de múltiplos tamanhos no Figma)

Pré-condição: o designer criou frames [DESKTOP], [TABLET] e/ou [MOBILE] no Figma
com os mesmos css_ids nos elementos internos.

1. Ler o frame [DESKTOP] — já aplicado no passo principal
2. Ler o frame [TABLET] — extrair apenas as propriedades que diferem do desktop
3. Ler o frame [MOBILE] — extrair apenas as propriedades que diferem do tablet
4. Para cada css_id com diferenças:
   PUT /pages/{id}/widgets/{css_id}/breakpoints
   Body: { "tablet": {...diffs...}, "mobile": {...diffs...} }
5. POST /cache/clear ao final
```

**Regra de diff:** o agente só envia a um breakpoint as settings que **diferem** do breakpoint superior. Se `font-size` é 48px no desktop e 36px no tablet → tablet recebe `typography_font_size: {size: 36}`. Se `font-size` é o mesmo no tablet e mobile → mobile não recebe esse campo (herda do tablet).

### Tarefa 3 — Teste com Frame Real

1. Criar frame DESKTOP com heading 48px, padding 80px
2. Criar frame TABLET (mesmo conteúdo) com heading 36px, padding 60px
3. Criar frame MOBILE com heading 24px, padding 40px
4. Os três frames têm o mesmo `css_id` no heading
5. Importar o DESKTOP no Elementor
6. Agente lê os três frames, calcula diffs, aplica via endpoint de breakpoints
7. Confirmar no painel do Elementor que os overrides responsivos estão corretos

---

## Validações

- [ ] Endpoint `PUT /breakpoints` adiciona sufixos `_tablet` e `_mobile` corretamente
- [ ] Endpoint não modifica settings de desktop (sem sufixo)
- [ ] Agente envia apenas diffs (não repete valores idênticos entre breakpoints)
- [ ] Agente lida com frame TABLET ausente gracefully (pula, não erro)
- [ ] Visual no Elementor em modo responsivo mostra os tamanhos corretos por breakpoint
- [ ] WORKFLOW_ESTILIZACAO.md atualizado com passo de responsividade

---

## Checkpoint de Conclusão

- [ ] Novo endpoint `PUT /breakpoints` implementado e testado
- [ ] Protocolo do agente para responsividade documentado no WORKFLOW
- [ ] Teste completo com 3 frames (desktop/tablet/mobile) executado com sucesso
- [ ] Overrides responsivos visíveis e corretos no Elementor
- [ ] Sem regressão nos endpoints existentes

---

## Riscos Específicos

| Risco | Mitigação |
|---|---|
| css_ids diferentes entre frames DESKTOP e TABLET (designer renomeou layers) | Agente reporta quais css_ids não foram encontrados no TABLET — não assume correspondência |
| Settings que não suportam sufixo responsivo sendo enviadas com sufixo | Bridge deve ter lista de whitelist de settings responsivas e ignorar (ou rejeitar) as demais |
| Herança de breakpoints inesperada — mobile herda de desktop em vez de tablet | Testar o comportamento real do Elementor com e sem override tablet |
| Designer não criou frames por breakpoint — fase não se aplica | Agente verifica presença dos frames antes de tentar aplicar responsividade; informa usuário se não encontrar |

---

## O Que NÃO Fazer Nesta Fase

- Não gerar responsividade automaticamente a partir do exportador (não é possível — Figma não tem breakpoints nativos)
- Não implementar hide/show por device nesta fase
- Não implementar breakpoints customizados do Elementor (widescreen, laptop)
- Não alterar código do exportador
- Não alterar endpoints v1 ou v2 existentes
