# FASE 04 — Bridge WordPress v2: Endpoints de Eficiência

> **Pré-requisito:** Nenhuma dependência das fases do exportador — pode ser executada em paralelo com FASE_01/02.
> **Estimativa:** 3–4 dias
> **Foco:** `wordpress-plugin/figmentor-bridge/includes/` — novos endpoints REST

---

## Objetivo

Adicionar três operações ao bridge que aumentam a eficiência sem adicionar lógica de tradução visual:

1. **PUT em lote** — atualizar N widgets em 1 chamada em vez de N chamadas
2. **GET individual de widget** — ler settings de um único elemento sem baixar toda a página
3. **GET de listagem de páginas** — descobrir page_ids com Elementor ativo

Esses endpoints reduzem latência, evitam race conditions e tornam o agente mais eficiente em sessões com múltiplos widgets a atualizar.

---

## Contexto

O bridge atual tem 3 endpoints:
- `GET /pages/{id}` — retorna toda a estrutura da página
- `PUT /pages/{id}/widgets/{css_id}` — atualiza 1 widget
- `POST /pages/{id}/cache/clear` — limpa cache

Em uma sessão real, o agente precisa atualizar entre 5 e 20 widgets por página. Com o endpoint atual, são 5–20 chamadas sequenciais (obrigatoriamente sequenciais para evitar race conditions no `update_post_meta`). O endpoint de lote resolve isso em 1 chamada.

---

## Escopo

**O que esta fase cobre:**
- `PUT /pages/{id}/widgets/batch` — atualização em lote
- `GET /pages/{id}/widgets/{css_id}` — leitura de widget individual
- `GET /pages` — listagem de páginas com Elementor ativo

**O que esta fase NÃO cobre:**
- Lógica de tradução Figma → Elementor (não entra no bridge)
- Validação semântica de settings (o bridge valida formato, não semântica)
- Endpoint de breakpoints responsivos (→ FASE_05)
- Operações estruturais (adicionar/remover widgets) — risco alto, fora do escopo

---

## Itens de Análise (antes de escrever código)

1. Confirmar que `class-elementor-helper.php` já tem `get_page_data`, `save_page_data`, `find_element_by_css_id`, `update_element_settings` — esses são reutilizados pelos novos endpoints
2. Definir o comportamento do batch em caso de erro parcial: **best-effort** (continua mesmo com css_ids não encontrados, retorna relatório) ou **transacional** (falha tudo se qualquer css_id não for encontrado). **Decisão recomendada: best-effort** — mais resiliente para uso do agente
3. Confirmar o schema do payload do batch antes de implementar
4. Verificar performance do GET individual: a busca recursiva por `css_id` em páginas grandes pode ser lenta — medir antes de validar

---

## Especificação dos Novos Endpoints

### Endpoint 1 — PUT /pages/{id}/widgets/batch

**Rota:** `PUT /wp-json/figmentor/v1/pages/{page_id}/widgets/batch`

**Body esperado:**
```json
{
  "widgets": [
    {
      "css_id": "titulo-principal",
      "settings": {
        "title_color": "rgba(30,30,30,1)",
        "typography_font_size": { "size": 48, "unit": "px" }
      }
    },
    {
      "css_id": "secao-beneficios",
      "settings": {
        "background_color": "rgba(245,245,245,1)",
        "padding": { "top": 80, "right": 0, "bottom": 80, "left": 0, "unit": "px" }
      }
    }
  ]
}
```

**Comportamento (best-effort):**
1. Ler `_elementor_data` uma vez
2. Para cada item em `widgets`: localizar por `css_id` e aplicar `array_merge` de settings
3. Se `css_id` não encontrado: registrar no relatório, continuar com os demais
4. Salvar `_elementor_data` **uma vez** ao final (não uma vez por widget)
5. Retornar relatório com: `updated[]`, `not_found[]`, `errors[]`

**Resposta de sucesso:**
```json
{
  "success": true,
  "updated": ["titulo-principal", "secao-beneficios"],
  "not_found": [],
  "errors": []
}
```

**Validações de payload:**
- `widgets` deve ser array não-vazio
- Cada item deve ter `css_id` (string) e `settings` (object)
- `css_id` não pode estar em `settings` (previne sobrescrita acidental)

---

### Endpoint 2 — GET /pages/{id}/widgets/{css_id}

**Rota:** `GET /wp-json/figmentor/v1/pages/{page_id}/widgets/{css_id}`

**Comportamento:**
1. Ler `_elementor_data`
2. Localizar elemento por `css_id` usando `find_element_by_css_id`
3. Retornar apenas o elemento encontrado (não toda a página)

**Resposta:**
```json
{
  "css_id": "titulo-principal",
  "elType": "widget",
  "widgetType": "heading",
  "settings": {
    "title": "Título Principal",
    "title_color": "rgba(30,30,30,1)",
    "typography_font_size": { "size": 48, "unit": "px" }
  }
}
```

**Adicionar `nocache_headers()` aqui também.**

---

### Endpoint 3 — GET /pages

**Rota:** `GET /wp-json/figmentor/v1/pages`

**Comportamento:**
- Buscar posts com `post_status: publish | draft` e `meta_key: _elementor_edit_mode`, `meta_value: builder`
- Retornar apenas `id`, `title`, `status`, `link`
- Limitar a 50 resultados (paginação simples via `page` e `per_page` query params)

**Resposta:**
```json
{
  "pages": [
    { "id": 42, "title": "Home", "status": "publish", "link": "https://site.com" },
    { "id": 58, "title": "Sobre", "status": "publish", "link": "https://site.com/sobre" }
  ],
  "total": 2
}
```

---

## Tarefas Práticas

### Tarefa 1 — Adicionar método `find_element_by_css_id_data` ao Helper

O método atual `find_element_by_css_id` retorna referência (por `&`). Para o GET individual precisamos retornar uma cópia dos dados do elemento (não referência). Adicionar `get_element_by_css_id` que retorna array simples:

```php
public static function get_element_by_css_id( $elements, $css_id ) {
    if ( ! is_array( $elements ) ) return null;
    foreach ( $elements as $element ) {
        if ( isset( $element['settings']['css_id'] ) && $element['settings']['css_id'] === $css_id ) {
            return $element;
        }
        if ( ! empty( $element['elements'] ) ) {
            $found = self::get_element_by_css_id( $element['elements'], $css_id );
            if ( $found !== null ) return $found;
        }
    }
    return null;
}
```

### Tarefa 2 — Registrar as 3 novas rotas em `class-rest-api.php`

Adicionar em `register_routes()`:

```php
// GET /pages
register_rest_route( self::NAMESPACE, '/pages', [ ... ] );

// GET /pages/{id}/widgets/{css_id}
register_rest_route( self::NAMESPACE, '/pages/(?P<page_id>\d+)/widgets/(?P<css_id>[a-z0-9\-]+)', [
    'methods' => 'GET',
    'callback' => [ $this, 'get_widget' ],
    'permission_callback' => [ $this, 'check_permission' ],
    // args: page_id, css_id
] );

// PUT /pages/{id}/widgets/batch
register_rest_route( self::NAMESPACE, '/pages/(?P<page_id>\d+)/widgets/batch', [
    'methods' => 'PUT',
    'callback' => [ $this, 'batch_update_widgets' ],
    'permission_callback' => [ $this, 'check_permission' ],
    // args: page_id, widgets (array)
] );
```

> **Atenção de rota:** A rota `GET /widgets/{css_id}` e a rota `PUT /widgets/{css_id}` existente são ambas `widgets/{css_id}`. A rota `PUT /widgets/batch` usa o literal `batch` — garantir que o regex do PUT existente (`[a-z0-9\-]+`) não captura `batch`. Solução: registrar a rota de batch **antes** da rota de css_id individual, ou usar regex que exclua `batch`.

### Tarefa 3 — Implementar os controllers

Controllers `get_widget`, `batch_update_widgets`, e `list_pages` em `class-rest-api.php`. Ver especificação acima.

### Tarefa 4 — Testes

```bash
# Teste batch
curl -s -X PUT \
  -H "X-Figmentor-Token: $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"widgets": [{"css_id": "titulo-principal", "settings": {"title_color": "rgba(255,0,0,1)"}}, {"css_id": "inexistente", "settings": {}}]}' \
  "$SITE/wp-json/figmentor/v1/pages/$PAGE_ID/widgets/batch"
# Esperado: updated: ["titulo-principal"], not_found: ["inexistente"]

# Teste GET individual
curl -s -H "X-Figmentor-Token: $TOKEN" \
  "$SITE/wp-json/figmentor/v1/pages/$PAGE_ID/widgets/titulo-principal"
# Esperado: objeto com settings do widget

# Teste listagem
curl -s -H "X-Figmentor-Token: $TOKEN" \
  "$SITE/wp-json/figmentor/v1/pages"
# Esperado: array de páginas com Elementor
```

---

## Validações

- [ ] `PUT /widgets/batch` com 2 widgets válidos retorna `updated: [...]` com ambos
- [ ] `PUT /widgets/batch` com 1 css_id inexistente retorna `not_found: [...]` mas atualiza os demais
- [ ] Batch salva `_elementor_data` apenas 1 vez (não N vezes)
- [ ] `GET /widgets/{css_id}` retorna settings do elemento correto
- [ ] `GET /widgets/{css_id}` retorna 404 para css_id inexistente
- [ ] `GET /widgets/{css_id}` inclui `nocache_headers()`
- [ ] `GET /pages` retorna apenas páginas com `_elementor_edit_mode: builder`
- [ ] Rota `batch` não captura o literal "batch" como css_id na rota PUT existente
- [ ] Autenticação funciona em todas as 3 novas rotas

---

## Checkpoint de Conclusão

- [ ] 3 novos endpoints implementados e testados
- [ ] Batch funciona em best-effort (not_found não quebra os demais)
- [ ] Batch salva o post meta apenas uma vez por chamada
- [ ] GET individual funciona com nocache_headers
- [ ] Listagem retorna apenas páginas Elementor
- [ ] Sem regressão nos endpoints v1 existentes

**Só avançar para FASE_05 após FASE_03 e FASE_04 concluídas.**

---

## Riscos Específicos

| Risco | Mitigação |
|---|---|
| Rota `PUT /widgets/batch` colide com `PUT /widgets/{css_id}` quando css_id = "batch" | Registrar rota de batch antes da rota de css_id; ou adicionar exclusão no regex |
| Batch com 50 widgets causa timeout em servidores lentos | Limitar a 30 widgets por chamada; documentar limite |
| `get_element_by_css_id` (cópia) vs `find_element_by_css_id` (referência) — confusão de uso | Nomear claramente e comentar a diferença no código |
| Race condition se alguém editar a página manualmente enquanto o batch processa | Não há transação atômica no WordPress — documentar limitação, pedir ao usuário para não editar durante operação do agente |

---

## O Que NÃO Fazer Nesta Fase

- Não adicionar lógica de mapeamento Figma → Elementor no bridge — o bridge é canal, não tradutor
- Não implementar operações estruturais (adicionar/remover widgets) — risco de corrupção alto
- Não implementar endpoint de breakpoints (→ FASE_05)
- Não alterar o comportamento dos endpoints v1 existentes
