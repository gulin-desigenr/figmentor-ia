# FASE 03 — Protocolo de Operação do Agente

> **Pré-requisito:** FASE_00 aprovada (o agente precisa conhecer o estado real do exportador).
> **Pode ser paralela a FASE_02** — não envolve alteração de código do exportador.
> **Estimativa:** 4–6 dias
> **Foco:** Definição de comportamento do agente + atualização de `WORKFLOW_ESTILIZACAO.md`

---

## Objetivo

Definir com precisão o que o agente faz, o que ele não faz, e como ele opera para evitar duplicação ou sobrescrita do trabalho do exportador. O resultado prático é um `WORKFLOW_ESTILIZACAO.md` atualizado que serve como protocolo executável para o agente.

Esta fase não envolve escrita de código — é de definição e documentação.

---

## Contexto

O risco principal hoje é: o agente entra em uma página que já foi importada com o exportador (que já resolveu `justify_content`, `align_items`, `gap`, `padding`, `typography_*` etc.) e sobrescreve esses valores sem verificar se já estão corretos.

O protocolo define que o agente **nunca edita sem verificar primeiro**.

---

## Escopo

**O que esta fase cobre:**
- Protocolo de verificação pré-edição (GET antes de qualquer PUT)
- Tabela completa de naming de keys por widget (expandida com FASE_01)
- Lista de fields que o exportador já resolve e que o agente não deve sobrescrever sem divergência confirmada
- Estratégia global vs override local
- Quando usar `custom_css` como fallback
- Atualização do `WORKFLOW_ESTILIZACAO.md`

**O que esta fase NÃO cobre:**
- Responsividade (→ FASE_05)
- Endpoints de bridge (→ FASE_04)
- Nenhuma alteração no código do exportador ou do bridge

---

## Itens de Análise

1. Ler o `WORKFLOW_ESTILIZACAO.md` atual na íntegra — identificar o que está desatualizado ou faltando
2. Listar todos os campos que o exportador resolve após FASE_00 e FASE_01 — esses são os campos que o agente não deve sobrescrever sem divergência
3. Mapear as keys de naming por widget de forma completa (incluindo os novos campos de FASE_01)
4. Definir o critério de "divergência" — quando o agente considera que um valor já presente está errado e decide sobrescrever

---

## Protocolo de Operação do Agente

### Regra 1 — Sempre GET antes de PUT

O agente **deve** ler o estado atual da página antes de qualquer edição. O fluxo obrigatório é:

```
1. GET /pages/{id}            ← ler estado atual
2. Extrair css_ids e settings ← inventariar o que já existe
3. Ler Figma                  ← obter valores de referência
4. Comparar campo a campo     ← identificar divergências reais
5. PUT apenas nos divergentes ← editar só o necessário
6. POST /cache/clear          ← sempre ao final
```

### Regra 2 — Lista de Fields "Do Not Touch" (sem divergência)

Estes campos foram resolvidos pelo exportador e **não devem ser sobrescritos sem divergência comprovada**:

**Em containers:**
- `flex_direction`, `justify_content`, `align_items`, `align_content`, `flex_wrap`
- `gap`, `padding`, `width`, `content_width`
- `background_background`, `background_color`
- `border_radius`, `border_border`, `border_width`, `border_color`
- `_box_shadow_box_shadow_type`, `_box_shadow_box_shadow`
- `css_id`

**Em widgets de texto (após FASE_00 e FASE_01):**
- `align`, `typography_typography`, `typography_font_size`, `typography_font_weight`
- `typography_font_family`, `typography_line_height`, `typography_letter_spacing`
- `typography_text_transform`, `typography_text_decoration`, `typography_font_style`
- `title_color` (heading), `text_color` (text-editor)

**Em todos:**
- `__globals__` — se já existe, não sobrescrever com override local sem justificativa

### Regra 3 — Critério de Divergência

O agente considera um campo divergente quando:
- O campo está **ausente** no settings atual (o exportador não o gerou)
- O campo existe mas o valor **difere em mais de 2px** (para valores numéricos) ou é de tipo diferente
- O campo existe mas aponta para um global incorreto

O agente **não** considera divergência:
- Diferença de 1–2px em padding/gap (tolerância de arredondamento)
- Diferença na representação de cor (hex vs rgba) — verificar o valor real
- Ausência de um campo que é o default do Elementor (ex: `align: "left"` é o CSS default — não precisa estar no JSON)

### Regra 4 — Globals vs Override Local

Antes de qualquer escrita de cor ou tipografia:
1. Verificar se `__globals__` já existe no settings do elemento
2. Se existe `__globals__.background_color`, **não enviar** `background_color` como override local
3. Se o global está apontando para a cor errada, comunicar ao usuário — não fazer override sem aprovação
4. Globals só são alterados pelo usuário manualmente no painel do Elementor

### Regra 5 — Quando Usar `custom_css`

O agente usa `custom_css` como fallback apenas quando:
- A propriedade desejada não tem key nativa no Elementor (ex: `aspect-ratio`, `filter`, pseudo-elementos)
- A propriedade é nativa mas está em um contexto onde o Elementor não expõe o controle para aquele widget
- Hover states em containers (Elementor não tem hover nativo para containers)

O agente **não** usa `custom_css` quando há uma key nativa disponível — mesmo que seja mais trabalhoso montar o payload correto.

### Regra 6 — Naming de Keys por Widget

O agente deve consultar esta tabela antes de montar qualquer payload:

| Widget | Cor principal | Cor secundária | Ativador tipografia | Prefix typo principal |
|---|---|---|---|---|
| `heading` | `title_color` | — | `typography_typography` | `typography_` |
| `text-editor` | `text_color` | — | `typography_typography` | `typography_` |
| `button` | `text_color` | `background_color` | `typography_typography` | `typography_` |
| `image-box` | `title_color` | `description_color` | `title_typography_typography` | `title_typography_` / `description_typography_` |
| `icon-box` | `title_color` | `description_color` | `title_typography_typography` | `title_typography_` / `description_typography_` |
| `icon-list` | `text_color` | `icon_color` | `text_typography_typography` | `text_typography_` |

**Prefixos de settings avançadas por contexto:**

| Contexto | Borda | Raio | Sombra |
|---|---|---|---|
| Container | `border_border` | `border_radius` | `_box_shadow_box_shadow` |
| Widget genérico | `_border_border` | `_border_radius` | `_box_shadow_box_shadow` |
| Button | `border_border` | `border_radius` | `_box_shadow_box_shadow` |
| Image | `image_border_border` | `image_border_radius` | `image_box_shadow` |

---

## Tarefas Práticas

### Tarefa 1 — Auditar `WORKFLOW_ESTILIZACAO.md` atual

Ler o arquivo e identificar:
- Seções desatualizadas (tabela de mapeamento que não inclui `line_height`, `letter_spacing`, etc.)
- Passos que não incluem o protocolo de verificação pré-edição
- Ausência da tabela de naming por widget
- Ausência da seção "O que NÃO sobrescrever"

### Tarefa 2 — Reescrever `WORKFLOW_ESTILIZACAO.md`

Atualizar o arquivo com:
1. **Protocolo obrigatório** (Regras 1–6 desta fase)
2. **Tabela de mapeamento expandida** — incluindo todos os campos de FASE_00 e FASE_01
3. **Seção "Do Not Touch"** — lista dos campos que o exportador já resolve
4. **Tabela de naming por widget** — para consulta antes de montar payloads
5. **Seção de fallback CSS** — quando e como usar `custom_css`
6. **Tratamento de erros** — atualizar com novos cenários conhecidos

### Tarefa 3 — Testar o Protocolo na Prática

1. Importar uma página com o exportador atualizado (pós FASE_00 e FASE_01)
2. Executar o agente com o novo protocolo
3. Verificar que o agente **não** sobrescreve `justify_content` correto
4. Verificar que o agente **não** envia `title_color` para um `text-editor`
5. Verificar que o agente inclui `typography_typography: "custom"` ao enviar qualquer `typography_*`

---

## Validações

- [ ] `WORKFLOW_ESTILIZACAO.md` contém protocolo de verificação pré-edição (GET antes de PUT)
- [ ] `WORKFLOW_ESTILIZACAO.md` contém tabela completa de mapeamento Figma → Elementor com campos de FASE_01
- [ ] `WORKFLOW_ESTILIZACAO.md` contém seção "Do Not Touch" com lista dos campos do exportador
- [ ] `WORKFLOW_ESTILIZACAO.md` contém tabela de naming por widget (title_color vs text_color etc.)
- [ ] `WORKFLOW_ESTILIZACAO.md` contém protocolo de globals vs override local
- [ ] `WORKFLOW_ESTILIZACAO.md` contém critério para uso de `custom_css`
- [ ] Teste prático: agente não sobrescreve `justify_content` já correto
- [ ] Teste prático: agente inclui ativador `typography_typography: "custom"` ao editar tipografia
- [ ] Teste prático: agente usa `title_color` para heading e `text_color` para text-editor corretamente

---

## Checkpoint de Conclusão

- [ ] `WORKFLOW_ESTILIZACAO.md` completamente reescrito e atualizado
- [ ] Protocolo de verificação pré-edição testado em sessão real
- [ ] Agente demonstra saber o que o exportador já resolveu e não sobrescreve
- [ ] Agente demonstra saber os prefixos corretos por widget
- [ ] Documento é auto-suficiente — um agente sem contexto adicional consegue seguir

**Só avançar para FASE_05 após esta fase e a FASE_04 estarem concluídas.**

---

## Riscos Específicos

| Risco | Mitigação |
|---|---|
| Protocolo documentado mas não seguido na prática | Incluir o protocolo no início do próprio WORKFLOW como "Regras Obrigatórias" com label visual destacado |
| Agente "esquece" a tabela de naming em sessões futuras | Manter a tabela no WORKFLOW — o agente deve consultá-la a cada sessão |
| Critério de divergência muito permissivo (agente não edita quando deveria) | Definir o critério com exemplos concretos e limites numéricos claros |
| Critério de divergência muito restritivo (agente edita demais) | Testar com templates reais e ajustar o critério empiricamente |

---

## O Que NÃO Fazer Nesta Fase

- Não alterar código do exportador (→ já foi feito em FASE_00/01/02)
- Não implementar responsividade (→ FASE_05)
- Não criar novos endpoints no bridge (→ FASE_04)
- Não implementar hover states — documentar apenas que é responsabilidade do agente, sem protocolo detalhado ainda
