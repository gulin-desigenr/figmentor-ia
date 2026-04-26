# RISCOS — Registro de Riscos e Mitigações

> **Consulte este arquivo sempre que algo inesperado acontecer.**
> Os riscos estão organizados por severidade e por camada do sistema.

---

## Riscos Críticos (podem quebrar a página)

### R01 — `wp_slash` ausente ao salvar `_elementor_data`
**Descrição:** Salvar sem `wp_slash` corrompe as aspas no banco de dados. A página fica com JSON inválido e o Elementor exibe white screen.
**Probabilidade:** Alta se um novo endpoint for criado sem seguir o padrão existente.
**Mitigação:** Sempre usar `Figmentor_Bridge_Elementor_Helper::save_page_data()` — nunca escrever diretamente no post meta.
**Detectar:** Inspecionar o `_elementor_data` no banco após o PUT — se houver `\"` duplos, o wp_slash falhou.

### R02 — Settings com key errada — white screen silencioso
**Descrição:** O Elementor aceita qualquer JSON sem erro. Keys com typo ou naming errado são simplesmente ignoradas. O usuário não sabe que a propriedade não foi aplicada.
**Probabilidade:** Alta — especialmente para keys com prefixo (`_border_radius` vs `border_radius`).
**Mitigação:** Consultar `ELEMENTOR_WIDGET_MAPPING.md` e a tabela de naming do `DIAGNOSTICO.md` antes de montar qualquer payload. Testar visualmente no Elementor após cada mudança.
**Fase relacionada:** Todas.

### R03 — `figma.mixed` não tratado em nodes de texto
**Descrição:** Quando um text node tem propriedades mistas (ex: dois font-sizes diferentes no mesmo node), a API do Figma retorna `figma.mixed`. Acessar `.value` ou `.unit` em `figma.mixed` causa TypeError que quebra o plugin.
**Probabilidade:** Alta — comum em textos com span de estilos diferentes.
**Mitigação:** Guard obrigatório antes de qualquer acesso: `if (node.lineHeight !== figma.mixed && node.lineHeight !== undefined)`. Nunca assumir que uma propriedade é objeto sem verificar.
**Fase relacionada:** FASE_01.

---

## Riscos Altos (afetam fidelidade ou comportamento)

### R04 — Agente sobrescreve o que o exportador já resolveu
**Descrição:** O agente reenvia `justify_content`, `align_items`, `gap`, `padding` que o exportador já havia gerado corretamente. O valor sobrescrito pode ser levemente diferente (arredondamento), tornando o resultado pior.
**Probabilidade:** Alta sem protocolo de verificação.
**Mitigação:** Protocolo de verificação pré-edição (FASE_03): GET antes de qualquer PUT, comparar campo a campo, editar apenas divergências reais.
**Fase relacionada:** FASE_03.

### R05 — `typography_typography: "custom"` ausente
**Descrição:** Qualquer payload de tipografia enviado sem o ativador é silenciosamente ignorado pelo Elementor. Isso inclui `typography_font_size`, `typography_line_height`, etc.
**Probabilidade:** Alta se o agente montar o payload manualmente sem o helper.
**Mitigação:** O helper `applyTypographySettings` (FASE_01) sempre injeta o ativador. O agente deve usar o helper ou sempre incluir `typography_typography: "custom"` manualmente.
**Fase relacionada:** FASE_01, FASE_03.

### R06 — `background_background: "classic"` ausente
**Descrição:** `background_color` é ignorado pelo Elementor sem o campo `background_background: "classic"`.
**Probabilidade:** Média — o agente pode tentar aplicar apenas a cor sem o tipo.
**Mitigação:** Sempre enviar `background_background: "classic"` junto com `background_color`.
**Fase relacionada:** FASE_03.

### R07 — Conflito globals × override local
**Descrição:** O exportador injeta `__globals__.background_color` referenciando uma cor global. O agente envia `background_color` como override local. O override vence e desconecta o elemento do global — na próxima mudança de tema, o elemento fica para trás.
**Probabilidade:** Média.
**Mitigação:** O agente verifica `__globals__` no settings atual antes de qualquer escrita de cor. Se existe global, não escreve override local sem aprovação.
**Fase relacionada:** FASE_03.

### R08 — Race condition em batch update
**Descrição:** Dois processos editando `_elementor_data` simultaneamente (ex: usuário no painel + agente via API) — um sobrescreve o outro.
**Probabilidade:** Baixa em uso normal, mas possível.
**Mitigação:** Documentar para o usuário que não deve editar a página manualmente durante operação do agente. O WordPress não tem transação atômica para post meta.
**Fase relacionada:** FASE_04.

---

## Riscos Médios (afetam qualidade ou eficiência)

### R09 — Cache retornando estado antigo após PUT
**Descrição:** O agente faz PUT e verifica com GET imediato, mas o GET retorna estado anterior porque cache externo (plugin de cache, CDN) está interceptando.
**Probabilidade:** Média em ambientes com plugins de cache.
**Mitigação:** `nocache_headers()` já implementado no GET. Para CDN/cache de plugin, documentar que o usuário deve garantir que o endpoint `/wp-json/figmentor/v1/*` está excluído do cache do servidor.
**Detectar:** `curl -sv ... | grep -i cache-control` — deve mostrar `no-cache, must-revalidate, max-age=0`.

### R10 — Rota `batch` capturada pela rota de css_id
**Descrição:** A rota `PUT /widgets/{css_id}` com regex `[a-z0-9\-]+` pode capturar o literal `batch` como css_id.
**Probabilidade:** Alta se a ordem de registro das rotas estiver errada.
**Mitigação:** Registrar a rota `/widgets/batch` **antes** da rota `/widgets/{css_id}`. O WordPress REST API usa a primeira rota que fizer match.
**Fase relacionada:** FASE_04.

### R11 — Regressão em páginas já importadas
**Descrição:** O exportador evolui (ex: FASE_00 gera `align` correto), mas páginas já importadas não são atualizadas automaticamente.
**Probabilidade:** Sempre que o exportador mudar.
**Mitigação:** Documentar claramente que mudanças no exportador só afetam novas importações. Para páginas existentes, o agente pode aplicar as correções via bridge manualmente.
**Fase relacionada:** Todas as fases do exportador.

### R12 — Nomenclatura diferente de controls entre versões do Elementor
**Descrição:** O Elementor pode mudar nomes de controls entre versões. Uma key válida na versão atual pode ser depreciada ou renomeada em versões futuras.
**Probabilidade:** Baixa no curto prazo, mas real no longo prazo.
**Mitigação:** Manter `ELEMENTOR_WIDGET_MAPPING.md` como source of truth e atualizar sempre que uma key parar de funcionar. Documentar a versão do Elementor na data de validação.

### R13 — `layoutSizingVertical` ausente em alguns tipos de node
**Descrição:** Nem todos os tipos de node Figma expõem `layoutSizingVertical`. Acessar sem guard gera `undefined`.
**Probabilidade:** Média — common em nodes GROUP, COMPONENT, INSTANCE.
**Mitigação:** Guard: `if ("layoutSizingVertical" in node && node.layoutSizingVertical === "FIXED")`.
**Fase relacionada:** FASE_02.

---

## Riscos Baixos (qualidade menor, mas não quebra)

### R14 — Complexidade crescente do exportador sem validação incremental
**Descrição:** Adicionar FASE_00, FASE_01 e FASE_02 ao mesmo tempo sem testar cada uma pode tornar difícil isolar regressões.
**Mitigação:** Executar cada fase sequencialmente com build e teste dedicado. Criar um template de teste fixo no Figma para cada fase.

### R15 — `_opacity` em string vs number
**Descrição:** Não está documentado se o Elementor aceita `_opacity: "50"` (string) ou `_opacity: 50` (number). Um formato silenciosamente ignorado, o outro funciona.
**Mitigação:** Testar ambos no Elementor antes de finalizar FASE_02. Usar o que funciona.

### R16 — Letter-spacing em "em" — interpretação do Elementor
**Descrição:** O Elementor pode interpretar letter-spacing em "em" diferente do que o Figma usa. Um valor de 5% em Figma pode virar 0.05em e parecer quase zero.
**Mitigação:** Validar visualmente com valor de referência conhecido (ex: 5% no Figma → verificar no Elementor se o resultado visual é similar).
**Fase relacionada:** FASE_01.

---

## Tabela de Referência Rápida

| Sintoma | Causa provável | Onde verificar |
|---|---|---|
| Tipografia não aplicada | `typography_typography: "custom"` ausente | Checar payload enviado |
| Cor de fundo não aplicada | `background_background: "classic"` ausente | Checar payload enviado |
| Borda/sombra não aplicada em widget | Usando prefixo de container em vez de widget | Checar `DIAGNOSTICO.md` → tabela de prefixos |
| JSON corrompido após PUT | `wp_slash` ausente | Inspecionar `_elementor_data` no banco |
| GET retorna estado antigo após PUT | Cache externo interceptando | `curl -v ... | grep cache-control` |
| Plugin Figma quebra após build | Erro de sintaxe em `src/` | Verificar console do `npm run build` |
| Propriedade aplicada mas sem efeito visual | Key correta mas valor em formato errado | Testar com valor simples e inspecionar o painel |
| `TypeError: Cannot read property 'unit' of undefined` | `figma.mixed` não tratado | Adicionar guard antes do acesso |
