# WORKFLOW: Estilização Automática Figma → Elementor

## Para o agente que receber este documento

Voce recebera um comando do usuario solicitando que aplique os estilos de um design do Figma
em uma pagina do Elementor. Siga este workflow exatamente, na ordem descrita.

## Ferramentas disponiveis

- MCP do Figma para ler nodes, propriedades de design, cores, tipografia e espacamentos
- REST API do WordPress (Figmentor Bridge) para ler e escrever dados do Elementor
- Requisicoes HTTP para chamar os endpoints do plugin WordPress

## Informações que você precisa do usuário antes de começar

Antes de executar qualquer passo, confirme que você tem:
1. O link ou ID do arquivo Figma com o design
2. O ID da pagina no WordPress (ex: 42)
3. A URL base do WordPress (ex: https://meusite.com)
4. O token de API do plugin Figmentor Bridge (gerado em `Configurações > Figmentor Bridge`)

Se algum desses estiver faltando, solicite ao usuário antes de prosseguir.

O token deve ser enviado em todas as requisições via header:

```http
X-Figmentor-Token: <token>
```

## Tabela de mapeamento Figma → Elementor

Use esta tabela para montar o objeto `settings` enviado no `PUT`. Só envie campos que você
conseguiu ler com certeza do Figma e nunca envie valores `null` ou `undefined`.

### Mapeamento: Espacamento

| Propriedade no Figma | Campo no Elementor settings | Formato esperado |
|---|---|---|
| `paddingTop` | `padding.top` | numero |
| `paddingRight` | `padding.right` | numero |
| `paddingBottom` | `padding.bottom` | numero |
| `paddingLeft` | `padding.left` | numero |
| `itemSpacing` (Auto Layout) | `gap.column` e `gap.row` | numero |

Estruturas:

```json
{
  "padding": {
    "top": 40,
    "right": 20,
    "bottom": 40,
    "left": 20,
    "unit": "px"
  },
  "gap": {
    "column": 20,
    "row": 20,
    "unit": "px"
  }
}
```

### Mapeamento: Background

| Propriedade no Figma | Campo no Elementor settings | Regra |
|---|---|---|
| Fill `SOLID` com cor | `background_background: "classic"` + `background_color: "rgba(...)"` | envie os dois campos juntos |
| Fill gradiente | `background_background: "gradient"` + campos de gradiente | so envie se voce conhecer a estrutura exata do widget alvo |
| Sem fill | nao enviar campo | nao limpe o valor existente |

Observacoes:

- Para cores, converta sempre para `rgba()` com no maximo 4 casas decimais.
- Nao envie `background_color` sem `background_background`.

### Mapeamento: Tipografia

| Propriedade no Figma | Campo no Elementor settings | Observacao |
|---|---|---|
| `fontSize` | `typography_font_size: { "size": N, "unit": "px" }` | usado em `heading` e `text-editor` |
| `fontName.style` | `typography_font_weight: "700"` | use a tabela de pesos abaixo |
| `fontName.family` | `typography_font_family: "Nome Da Fonte"` | so envie se o valor existir |
| Cor do texto (fill `SOLID`) | `title_color` | para `heading` |
| Cor do texto (fill `SOLID`) | `text_color` | para `text-editor` |

Ativador obrigatorio para tipografia customizada:

```json
{
  "typography_typography": "custom"
}
```

Estrutura base:

```json
{
  "typography_typography": "custom",
  "typography_font_size": {
    "size": 32,
    "unit": "px"
  },
  "typography_font_weight": "700",
  "typography_font_family": "Montserrat"
}
```

Mapeamento de font weight:

| Figma style | Elementor weight |
|---|---|
| Thin / Hairline | 100 |
| Extra Light | 200 |
| Light | 300 |
| Regular / Normal | 400 |
| Medium | 500 |
| Semi Bold / Demi Bold | 600 |
| Bold | 700 |
| Extra Bold / Ultra Bold | 800 |
| Black / Heavy | 900 |

### Mapeamento: Bordas

| Propriedade no Figma | Campo no Elementor settings | Observacao |
|---|---|---|
| `cornerRadius` (uniforme) | `border_radius` | container e button usam a chave base |
| `topLeftRadius`, `topRightRadius`, `bottomRightRadius`, `bottomLeftRadius` | `border_radius` com `isLinked: false` | use valores por lado |
| `strokes[0].color` + `strokeWeight` | `border_border: "solid"`, `border_width`, `border_color` | so envie para stroke `SOLID` |

Estruturas:

```json
{
  "border_radius": {
    "unit": "px",
    "top": "16",
    "right": "16",
    "bottom": "16",
    "left": "16",
    "isLinked": true
  },
  "border_border": "solid",
  "border_width": {
    "unit": "px",
    "top": "1",
    "right": "1",
    "bottom": "1",
    "left": "1",
    "isLinked": true
  },
  "border_color": "rgba(0,0,0,0.1200)"
}
```

Observacao de escopo:

- Para `image`, use as variantes prefixadas `image_border_radius`, `image_border_border`, `image_border_width` e `image_border_color`.

### Mapeamento: Sombras

| Propriedade no Figma | Campo no Elementor settings | Observacao |
|---|---|---|
| Effect `DROP_SHADOW` offset.x | `_box_shadow_box_shadow.horizontal` | numero |
| Effect `DROP_SHADOW` offset.y | `_box_shadow_box_shadow.vertical` | numero |
| Effect `DROP_SHADOW` radius | `_box_shadow_box_shadow.blur` | numero |
| Effect `DROP_SHADOW` spread | `_box_shadow_box_shadow.spread` | numero |
| Effect `DROP_SHADOW` color | `_box_shadow_box_shadow.color` | `rgba(...)` |
| Presenca de shadow | `_box_shadow_box_shadow_type: "yes"` | necessario para ativar a sombra |

Estrutura:

```json
{
  "_box_shadow_box_shadow_type": "yes",
  "_box_shadow_box_shadow": {
    "horizontal": 0,
    "vertical": 8,
    "blur": 24,
    "spread": 0,
    "color": "rgba(0,0,0,0.1800)",
    "position": "outline"
  }
}
```

Observacao de escopo:

- Para `image`, use `image_box_shadow_type` e `image_box_shadow`.

## Passo 1 — Ler a estrutura da página no Elementor

Faça uma requisição GET para:

`GET {wordpress_url}/wp-json/figmentor/v1/pages/{page_id}`

Armazene o array `elements` retornado. Você usará ele para identificar quais `css_id`
existem na página e para planejar as atualizações.

Extraia todos os `css_id` presentes na página (navegue recursivamente em `elements`).
Monte uma lista: `css_id` → tipo de widget (`elType` + `widgetType`).

## Passo 2 — Ler o design no Figma

Use o MCP do Figma para ler o design. Para cada node no Figma cujo nome (após sanitização)
corresponder a um `css_id` da lista do Passo 1, extraia:

- Padding (`paddingTop`, `paddingRight`, `paddingBottom`, `paddingLeft`)
- `itemSpacing` (gap)
- Fills (cor de background)
- Width e sizing horizontal
- Para nodes `TEXT` filhos: `fontSize`, `fontName` (family + style), fills (cor do texto)
- `cornerRadius` e variações individuais
- `strokes`
- `effects`

Sanitizacao esperada do nome para virar `css_id`:

1. Converter para minusculas
2. Substituir caracteres nao alfanumericos por `-`
3. Fazer trim de `-` nas pontas
4. Colapsar repeticoes de `-`

## Passo 3 — Montar o payload de atualização

Para cada `css_id` identificado, monte o objeto `settings` com as propriedades mapeadas
usando a tabela de mapeamento em `WORKFLOW_ESTILIZACAO.md`.

Regras importantes:

- Só envie campos que você conseguiu ler com certeza do Figma
- Não envie campos com valor `null` ou `undefined`
- Não sobrescreva `css_id` (o PUT ignora isso, mas é boa prática não enviar)
- Para cores, converta sempre para `rgba()` com 4 casas decimais máximo
- Preserve chaves existentes não relacionadas; o endpoint faz merge do `settings` enviado com o `settings` atual

## Passo 4 — Aplicar as atualizações

Para cada `css_id` da lista, faça:

`PUT {wordpress_url}/wp-json/figmentor/v1/pages/{page_id}/widgets/{css_id}`

Body:

```json
{
  "settings": {
    "...": "..."
  }
}
```

Se o `PUT` retornar `404` (`css_id` não encontrado), registre o erro mas continue com os demais.
Se o `PUT` retornar `500`, pare e reporte o erro ao usuário.

Faça as chamadas em sequência, não em paralelo, para evitar condições de corrida ao
salvar o post meta.

Regra operacional complementar:

- Se o `PUT` retornar `400`, revise o payload enviado antes de continuar

## Passo 5 — Limpar o cache

Após todas as atualizações, faça:

`POST {wordpress_url}/wp-json/figmentor/v1/pages/{page_id}/cache/clear`

Observações operacionais:

- O bridge já envia `nocache_headers()` no `GET`, mas isso não substitui a exclusão das rotas `/wp-json/figmentor/` do cache externo
- Se houver LiteSpeed, Cloudflare ou outro cache de borda, as rotas do bridge precisam estar excluídas para o fluxo funcionar de forma confiável

## Passo 6 — Reportar ao usuário

Informe:

- Quantos widgets foram atualizados com sucesso
- Quais `css_id` não foram encontrados na página, se houver
- Quais erros ocorreram, se houver
- Que o cache foi limpo e a página está pronta para ser visualizada

## Tratamento de erros comuns

| Erro | Causa | Solucao |
|---|---|---|
| `401` nas chamadas | Token ausente ou incorreto | Verificar token em `Configurações > Figmentor Bridge`; regenerar se necessário |
| `404` em `GET /pages` | `page_id` errado ou página sem Elementor | Confirmar ID com o usuário |
| `404` em `PUT /widgets` | `css_id` não existe na página | O JSON foi importado sem o Plano 1 implementado |
| `500` em `PUT` | Erro ao salvar no WordPress | Verificar logs do WordPress (`wp-content/debug.log`) |
| Cache não limpo | Elementor não está ativo | Verificar se o Elementor está ativo no WordPress |
