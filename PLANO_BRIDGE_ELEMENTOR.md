# PLANO DE AÇÃO — Elementor Auto-Styling Bridge

> **Documento para agente de IA.**
> Este documento contém tudo que você precisa para implementar o sistema sem contexto adicional. Leia a seção de contexto por completo antes de escrever qualquer linha de código.

---

## 1. CONTEXTO GERAL

### O que é este projeto

Este repositório contém um plugin para Figma chamado **Figmentor** (Figma to Elementor). O plugin permite que um designer tagueie layers no Figma (marcando-as como `HEADING`, `CONTAINER`, `BUTTON`, etc.) e exporte um arquivo JSON compatível com o Elementor (page builder do WordPress).

### O problema que este plano resolve

O JSON exportado cria a **estrutura** da página corretamente (hierarquia de widgets), mas **não aplica estilos com precisão suficiente** — especialmente espaçamentos internos entre seções e cores via CSS Avançado do Elementor. O objetivo deste plano é criar um sistema que permita a um agente de IA ler o design original no Figma e aplicar as propriedades de estilo diretamente na página já importada no Elementor, via API.

### Fluxo completo do usuário (após este plano ser implementado)

```
1. Designer tagueia layers no Figma com o plugin
2. Plugin exporta o JSON → usuário importa manualmente como template no Elementor
3. Usuário dispara comando para o agente de IA
4. Agente lê o design no Figma via MCP do Figma
5. Agente lê a estrutura atual da página no Elementor via plugin WordPress (REST API)
6. Agente cruza as informações usando o css_id como chave de mapeamento
7. Agente aplica as correções de estilo via REST API
8. Agente limpa o cache do Elementor
```

### O que este plano entrega (3 itens)

- **Item 1** — Modificação no plugin Figma para injetar `css_id` em cada elemento do JSON exportado
- **Item 2** — Plugin WordPress com REST API para ler e escrever dados do Elementor
- **Item 3** — Documento de workflow que descreve como o agente de estilização deve operar

---

## 2. ESTRUTURA ATUAL DO REPOSITÓRIO

```
/
├── src/
│   ├── index.js                  # Entry point do plugin; message handlers (apply-tag, apply-role, export-json)
│   ├── core/
│   │   ├── traverse.js           # Algoritmo de travessia da árvore do Figma
│   │   └── handlers.js           # Handlers de cada tipo de widget (mapContainer, handleManualTag, etc.)
│   ├── styles/
│   │   └── index.js              # Extração de bordas, sombras, cores, tipografia
│   └── utils/
│       ├── colors.js             # figmaColorToRGBA
│       ├── nodes.js              # getLayoutDirection, hasImageFill, getNodeRole, getSafeFontFamily
│       └── typography.js         # mapFontWeight (Thin → 100, Bold → 700, etc.)
├── dist/
│   └── code.js                   # Bundle compilado (gerado por `npm run build`)
├── ui.html                       # Painel UI do plugin no Figma
├── manifest.json                 # Config do plugin Figma
├── package.json                  # Build config (esbuild)
└── ELEMENTOR_WIDGET_MAPPING.md   # Referência oficial de schemas de widgets do Elementor
```

### Como fazer build do plugin

```bash
npm run build
# Gera: dist/code.js (bundle de src/ via esbuild)
```

O `manifest.json` aponta `"main": "dist/code.js"`. Sempre rode `npm run build` após modificar qualquer arquivo em `src/`.

### Como o JSON exportado é estruturado

O plugin exporta um JSON com esta forma raiz:

```json
{
  "version": "0.4",
  "title": "Export V19 Soltos Fix - [Nome do Frame]",
  "type": "container",
  "content": [ /* array de elementos */ ]
}
```

Cada elemento é um de dois tipos:

**Container:**
```json
{
  "elType": "container",
  "settings": {
    "content_width": "boxed",
    "width": { "size": 1140, "unit": "px" },
    "flex_direction": "row",
    "gap": { "column": 20, "row": 20, "unit": "px" },
    "padding": { "top": 40, "right": 0, "bottom": 40, "left": 0, "unit": "px" }
  },
  "elements": [ /* filhos */ ]
}
```

**Widget:**
```json
{
  "elType": "widget",
  "widgetType": "heading",
  "settings": {
    "title": "Texto do heading",
    "title_color": "rgba(30,30,30,1)",
    "typography_font_size": { "size": 48, "unit": "px" },
    "typography_font_weight": "700",
    "typography_font_family": "Montserrat"
  }
}
```

### Como o Elementor armazena dados no WordPress

O Elementor salva os dados de cada página no post meta do WordPress, na chave `_elementor_data`. O valor é uma string JSON (serializada). O post meta `_elementor_edit_mode` deve ser `"builder"` para que o Elementor reconheça a página.

Ao modificar `_elementor_data` via código, é obrigatório limpar o cache do Elementor em seguida — caso contrário a página continua servindo a versão antiga em cache.

---

## 3. REGRAS DE EXECUÇÃO PARA O AGENTE

**Estas regras são obrigatórias. Não as ignore.**

1. **Nunca avance para a próxima fase sem validar a atual.** Cada fase termina com um bloco `VALIDAÇÃO`. Execute-o completamente antes de continuar.
2. **Nunca modifique o código de produção atual** (branch `main`) sem ter certeza de que está na branch correta.
3. **Nunca faça build sem rodar a validação de sintaxe antes.** Um `code.js` corrompido quebra o plugin no Figma.
4. **Nunca modifique `_elementor_data` diretamente no banco de dados.** Use sempre a REST API do plugin WordPress que será construído.
5. **Se um checkpoint falhar, investigue a causa raiz antes de tentar novamente.** Não altere testes para forçar aprovação.
6. **Documente todos os problemas encontrados** em comentários inline ou num arquivo `NOTAS_IMPLEMENTACAO.md` na raiz do repo.

---

## 4. PRÉ-REQUISITO — CRIAÇÃO DA BRANCH

**Objetivo:** Isolar todo o desenvolvimento deste plano do código de produção atual na `main`.

### Execução

```bash
# Verificar branch atual (deve ser main ou similar)
git branch

# Criar e entrar na nova branch
git checkout -b feature/elementor-bridge

# Confirmar
git branch
# Deve mostrar: * feature/elementor-bridge
```

### VALIDAÇÃO DO PRÉ-REQUISITO

- [ ] O comando `git branch` mostra `* feature/elementor-bridge` como branch ativa
- [ ] O comando `git status` mostra `On branch feature/elementor-bridge`
- [ ] Nenhum arquivo foi modificado ainda (working tree clean)

**Não prossiga para o Plano 1 sem que os 3 itens acima estejam marcados.**

---

---

# PLANO 1 — Injeção de `css_id` no Plugin Figma

## Objetivo

Modificar o plugin Figma para que cada elemento gerado no JSON de exportação contenha um campo `css_id` no objeto `settings`. Esse campo será derivado do nome da layer no Figma e servirá como chave de mapeamento entre o design no Figma e os widgets no Elementor.

## Por que isso é necessário

Quando o JSON é importado no Elementor, cada widget recebe um ID interno aleatório (gerado pelo Elementor). O campo `css_id` é um campo do Elementor que pode ser definido manualmente e fica salvo no `settings` do widget. Se o plugin injetar esse campo na exportação, o widget importado terá um identificador estável e legível que o agente de estilização pode usar para localizar exatamente qual widget precisa ser atualizado.

## Como o `css_id` deve ser gerado

O nome da layer no Figma, após o tagueamento, tem o formato `[TAG] Nome Original`. Por exemplo: `[HEADING] Título Principal da Hero`.

A função de sanitização deve:
1. Converter para minúsculas
2. Remover os colchetes e o conteúdo entre eles
3. Fazer trim
4. Substituir espaços por hífens
5. Remover caracteres não alfanuméricos (exceto hífens)
6. Colapsar hífens múltiplos em um único
7. Limitar a 64 caracteres

**Exemplos:**
- `[HEADING] Título Principal da Hero` → `titulo-principal-da-hero`
- `[CONTAINER] Seção de Benefícios` → `secao-de-beneficios`
- `[BUTTON] Quero Começar Agora` → `quero-comecar-agora`
- `[IMAGE-BOX] Card de Serviço 1` → `card-de-servico-1`

> **Atenção:** A sanitização deve tratar caracteres acentuados (ã, é, ç, etc.) convertendo-os para o equivalente sem acento antes de remover não-alfanuméricos. Exemplo: `é` → `e`, `ç` → `c`, `ã` → `a`.

## Fase 1.1 — Análise do código atual

Antes de escrever qualquer código, leia os seguintes arquivos por completo:

- `src/core/handlers.js` — identifique **todas** as funções que retornam objetos com `elType`. São elas:
  - `handleManualTag` — retorna `{ elType: "widget", widgetType: tag, settings }` (linha final ~344)
  - `mapContainer` — retorna `{ elType: "container", settings, elements }` (linha ~413)
  - O branch `container-carousel` dentro de `handleManualTag` — tem seu próprio `return` (linha ~341)
  - `mapText` — busque essa função no arquivo (pode não estar visível nas linhas lidas; procure mais abaixo ou em outro arquivo)
  - `mapImage` — idem

- `src/core/traverse.js` — entenda onde `mapText` e `mapImage` são chamados e o que retornam

> **Importante:** Você deve localizar TODOS os pontos de retorno que produzem um objeto com `elType` antes de implementar. Qualquer ponto de retorno que você perder ficará sem `css_id`.

### VALIDAÇÃO 1.1

- [ ] Você listou todas as funções que retornam objetos `{ elType: ... }` e sabe em qual arquivo cada uma está
- [ ] Você identificou que `node.name` está disponível em todos esses pontos (via o parâmetro `node` passado para cada função)
- [ ] Você não escreveu nenhum código ainda

---

## Fase 1.2 — Implementação da função de sanitização

### 1.2.1 — Criar arquivo utilitário

Crie o arquivo `src/utils/cssId.js` com o seguinte conteúdo:

```javascript
const accentMap = {
  'á':'a','à':'a','ã':'a','â':'a','ä':'a',
  'é':'e','è':'e','ê':'e','ë':'e',
  'í':'i','ì':'i','î':'i','ï':'i',
  'ó':'o','ò':'o','õ':'o','ô':'o','ö':'o',
  'ú':'u','ù':'u','û':'u','ü':'u',
  'ç':'c','ñ':'n',
  'Á':'a','À':'a','Ã':'a','Â':'a','Ä':'a',
  'É':'e','È':'e','Ê':'e','Ë':'e',
  'Í':'i','Ì':'i','Î':'i','Ï':'i',
  'Ó':'o','Ò':'o','Õ':'o','Ô':'o','Ö':'o',
  'Ú':'u','Ù':'u','Û':'u','Ü':'u',
  'Ç':'c','Ñ':'n'
};

export function sanitizeCssId(name) {
  if (!name || typeof name !== 'string') return '';

  let result = name
    .split('')
    .map(char => accentMap[char] || char)
    .join('');

  result = result
    .toLowerCase()
    .replace(/\[.*?\]/g, '')   // remove [TAG] prefix
    .trim()
    .replace(/\s+/g, '-')      // spaces to hyphens
    .replace(/[^a-z0-9-]/g, '') // remove non-alphanumeric
    .replace(/-+/g, '-')       // collapse multiple hyphens
    .replace(/^-+|-+$/g, '')   // trim leading/trailing hyphens
    .substring(0, 64);

  return result;
}
```

### VALIDAÇÃO 1.2.1

Antes de continuar, verifique mentalmente (ou via teste manual) que os exemplos abaixo produzem o resultado esperado:

| Input | Output esperado |
|---|---|
| `[HEADING] Título Principal da Hero` | `titulo-principal-da-hero` |
| `[CONTAINER] Seção de Benefícios` | `secao-de-beneficios` |
| `[BUTTON] Quero Começar Agora!` | `quero-comecar-agora` |
| `[IMAGE-BOX] Card de Serviço 1` | `card-de-servico-1` |
| `Hero Section` (sem tag) | `hero-section` |
| `` (string vazia) | `` (string vazia) |

- [ ] Todos os exemplos acima foram verificados mentalmente e estão corretos
- [ ] O arquivo `src/utils/cssId.js` foi criado

---

## Fase 1.3 — Injeção do `css_id` nos handlers

### Contexto técnico

O campo `css_id` no Elementor é um campo nativo de settings que aparece no painel de edição avançado de cada widget e container. No JSON do Elementor, ele fica dentro do objeto `settings`:

```json
{
  "elType": "widget",
  "widgetType": "heading",
  "settings": {
    "css_id": "titulo-principal-da-hero",
    "title": "Título Principal da Hero",
    ...
  }
}
```

### 1.3.1 — Adicionar import em handlers.js

No topo de `src/core/handlers.js`, adicione o import:

```javascript
import { sanitizeCssId } from '../utils/cssId.js';
```

### 1.3.2 — Injetar em `mapContainer`

Localize a função `mapContainer` em `src/core/handlers.js`. Ela recebe `node` como primeiro parâmetro.

Dentro do objeto `settings` construído na função, **após todas as outras propriedades já existentes serem definidas**, adicione:

```javascript
const cssId = sanitizeCssId(node.name);
if (cssId) settings.css_id = cssId;
```

Faça isso **antes** da linha `return { elType: "container", settings: settings, elements: children }`.

### 1.3.3 — Injetar em `handleManualTag` (widgets)

Localize o final da função `handleManualTag`. Antes da linha de retorno:

```javascript
return { elType: "widget", widgetType: tag, settings: settings };
```

Adicione:

```javascript
const cssId = sanitizeCssId(node.name);
if (cssId) settings.css_id = cssId;
```

### 1.3.4 — Injetar no branch `container-carousel`

Dentro de `handleManualTag`, o branch `container-carousel` tem seu próprio `return`:

```javascript
return { elType: "widget", widgetType: "nested-carousel", settings: settings, elements: elements };
```

Antes desse return, adicione:

```javascript
const cssId = sanitizeCssId(node.name);
if (cssId) settings.css_id = cssId;
```

### 1.3.5 — Injetar em `mapText` e `mapImage`

Localize as funções `mapText` e `mapImage` (verifique se estão em `handlers.js` ou em outro arquivo em `src/`). Aplique o mesmo padrão: antes de cada `return { elType: "widget", ... }`, injete `css_id` em `settings`.

> **Atenção:** `mapText` e `mapImage` também recebem `node` como parâmetro. Verifique que `node.name` existe antes de usar.

### VALIDAÇÃO 1.3

- [ ] O import de `sanitizeCssId` foi adicionado em `handlers.js`
- [ ] `mapContainer` injeta `css_id` antes do return
- [ ] `handleManualTag` (return principal de widget) injeta `css_id`
- [ ] O branch `container-carousel` injeta `css_id`
- [ ] `mapText` injeta `css_id` (se existir como função separada)
- [ ] `mapImage` injeta `css_id` (se existir como função separada)
- [ ] Nenhuma função existente foi alterada além da adição do `css_id`

---

## Fase 1.4 — Build e teste de exportação

### 1.4.1 — Build

```bash
npm run build
```

Verifique que o comando termina sem erros. Se houver erro de sintaxe, corrija antes de prosseguir.

### 1.4.2 — Teste manual no Figma

1. Abra o Figma Desktop
2. Carregue o plugin (via `manifest.json`)
3. Crie um frame simples com 2-3 layers tagueadas (ex: um CONTAINER com um HEADING e um BUTTON dentro)
4. Exporte o JSON
5. Inspecione o JSON gerado e verifique que cada elemento tem `css_id` em `settings`

### VALIDAÇÃO 1.4 — CHECKPOINT 1

Execute este checklist. Se qualquer item falhar, volte à fase correspondente.

- [ ] `npm run build` termina sem erros
- [ ] O JSON exportado contém `"css_id"` em todos os elementos (containers e widgets)
- [ ] Os valores de `css_id` são strings legíveis, sem caracteres especiais, sem espaços
- [ ] Um elemento com nome `[HEADING] Título Principal` gera `css_id: "titulo-principal"`
- [ ] Um elemento sem nome ou com nome vazio gera `css_id` ausente (não quebra a exportação)
- [ ] O plugin no Figma não exibe erros no console após a exportação

**Se todos os itens acima passarem: o Plano 1 está concluído. Faça commit e prossiga para o Plano 2.**

```bash
git add src/utils/cssId.js src/core/handlers.js dist/code.js
git commit -m "feat(plugin): inject css_id into all exported Elementor elements"
```

---

---

# PLANO 2 — Plugin WordPress (REST API para o Elementor)

## Objetivo

Criar um plugin WordPress autônomo que exponha uma REST API para:
1. Ler os dados do Elementor de qualquer página
2. Localizar um widget pelo seu `css_id` e atualizar suas propriedades de estilo
3. Limpar o cache do Elementor após as atualizações

## Contexto técnico do WordPress e Elementor

### Como o Elementor armazena dados

```
Tabela: wp_postmeta
Campos relevantes por page_id:
  - meta_key: _elementor_data      → JSON string com toda a estrutura da página
  - meta_key: _elementor_edit_mode → deve ser "builder"
  - meta_key: _elementor_version   → versão do Elementor usada
```

A estrutura do `_elementor_data` é um **array JSON** de elementos raiz. Cada elemento pode ter filhos em `elements`. A estrutura é recursiva.

### Como ler/escrever via WordPress

```php
// Ler
$raw = get_post_meta($page_id, '_elementor_data', true);
$data = json_decode($raw, true);

// Escrever
update_post_meta($page_id, '_elementor_data', wp_slash(json_encode($data)));

// Limpar cache do Elementor
if (class_exists('\Elementor\Plugin')) {
    \Elementor\Plugin::$instance->files_manager->clear_cache();
}
```

> **Atenção ao `wp_slash`:** O WordPress aplica escaping adicional ao salvar post meta. Sempre use `wp_slash(json_encode($data))` ao escrever, caso contrário as aspas serão corrompidas.

### Autenticação

O plugin usará **WordPress Application Passwords** (nativo desde WP 5.6). O cliente (agente de IA) precisa de:
- URL do WordPress
- Username
- Application Password (gerado em `Usuários > Editar Perfil > Application Passwords`)

Header HTTP: `Authorization: Basic base64(username:app_password)`

## Estrutura de arquivos do plugin WordPress

O plugin deve ser criado dentro do repositório, em um diretório separado:

```
wordpress-plugin/
└── figmentor-bridge/
    ├── figmentor-bridge.php          # Arquivo principal (cabeçalho do plugin + bootstrap)
    └── includes/
        ├── class-rest-api.php        # Registro das rotas REST e controllers
        └── class-elementor-helper.php # Lógica de leitura/escrita/busca no Elementor
```

> Este diretório `wordpress-plugin/` deve ser versionado no repositório. O usuário instalará o plugin manualmente fazendo upload da pasta `figmentor-bridge/` para `wp-content/plugins/`.

## Fase 2.1 — Scaffolding (arquivo principal)

### 2.1.1 — Criar arquivo principal

Crie `wordpress-plugin/figmentor-bridge/figmentor-bridge.php`:

```php
<?php
/**
 * Plugin Name: Figmentor Bridge
 * Plugin URI:  https://github.com/seu-usuario/figmentor
 * Description: REST API para leitura e escrita de dados do Elementor. Usado pelo agente de IA para aplicar estilos automaticamente.
 * Version:     1.0.0
 * Author:      Pedro Gulin
 * License:     Private
 * Requires at least: 5.6
 * Requires PHP: 7.4
 */

if ( ! defined( 'ABSPATH' ) ) {
    exit;
}

define( 'FIGMENTOR_BRIDGE_VERSION', '1.0.0' );
define( 'FIGMENTOR_BRIDGE_DIR', plugin_dir_path( __FILE__ ) );

require_once FIGMENTOR_BRIDGE_DIR . 'includes/class-elementor-helper.php';
require_once FIGMENTOR_BRIDGE_DIR . 'includes/class-rest-api.php';

add_action( 'rest_api_init', function () {
    $api = new Figmentor_Bridge_REST_API();
    $api->register_routes();
} );
```

### VALIDAÇÃO 2.1

- [ ] O arquivo `figmentor-bridge.php` foi criado com o cabeçalho correto
- [ ] O plugin pode ser ativado no painel do WordPress sem erros PHP
- [ ] Após ativação, o plugin aparece em "Plugins Ativos"

---

## Fase 2.2 — Helper do Elementor

Crie `wordpress-plugin/figmentor-bridge/includes/class-elementor-helper.php`:

### Método 1: Ler dados da página

```php
<?php

class Figmentor_Bridge_Elementor_Helper {

    /**
     * Lê e decodifica os dados do Elementor de uma página.
     * Retorna array ou WP_Error.
     */
    public static function get_page_data( $page_id ) {
        if ( ! get_post( $page_id ) ) {
            return new WP_Error( 'not_found', 'Página não encontrada.', [ 'status' => 404 ] );
        }

        $raw = get_post_meta( $page_id, '_elementor_data', true );

        if ( empty( $raw ) ) {
            return new WP_Error( 'no_elementor_data', 'Esta página não tem dados do Elementor. Verifique se foi editada com o Elementor.', [ 'status' => 404 ] );
        }

        $data = json_decode( $raw, true );

        if ( json_last_error() !== JSON_ERROR_NONE ) {
            return new WP_Error( 'invalid_json', 'Os dados do Elementor estão corrompidos.', [ 'status' => 500 ] );
        }

        return $data;
    }

    /**
     * Salva os dados do Elementor de volta para uma página.
     * Retorna true em sucesso ou WP_Error.
     */
    public static function save_page_data( $page_id, $data ) {
        $encoded = wp_slash( json_encode( $data ) );
        $result  = update_post_meta( $page_id, '_elementor_data', $encoded );

        if ( $result === false ) {
            return new WP_Error( 'save_failed', 'Falha ao salvar os dados.', [ 'status' => 500 ] );
        }

        return true;
    }

    /**
     * Busca recursivamente um elemento pelo css_id dentro da árvore do Elementor.
     * Retorna referência ao elemento (como array PHP) ou null.
     */
    public static function find_element_by_css_id( &$elements, $css_id ) {
        if ( ! is_array( $elements ) ) return null;

        foreach ( $elements as &$element ) {
            if ( ! isset( $element['settings'] ) ) continue;

            if (
                isset( $element['settings']['css_id'] ) &&
                $element['settings']['css_id'] === $css_id
            ) {
                return $element;
            }

            // Recursão em filhos (containers têm 'elements')
            if ( ! empty( $element['elements'] ) ) {
                $found = self::find_element_by_css_id( $element['elements'], $css_id );
                if ( $found !== null ) return $found;
            }
        }

        return null;
    }

    /**
     * Atualiza as settings de um elemento encontrado pelo css_id.
     * Retorna true em sucesso, WP_Error se não encontrado.
     */
    public static function update_element_settings( &$elements, $css_id, $new_settings ) {
        if ( ! is_array( $elements ) ) {
            return new WP_Error( 'invalid_structure', 'Estrutura inválida.', [ 'status' => 500 ] );
        }

        foreach ( $elements as &$element ) {
            if ( ! isset( $element['settings'] ) ) continue;

            if (
                isset( $element['settings']['css_id'] ) &&
                $element['settings']['css_id'] === $css_id
            ) {
                // Merge das settings: preserva campos existentes, sobrescreve os enviados
                $element['settings'] = array_merge( $element['settings'], $new_settings );
                return true;
            }

            if ( ! empty( $element['elements'] ) ) {
                $result = self::update_element_settings( $element['elements'], $css_id, $new_settings );
                if ( $result === true ) return true;
            }
        }

        return new WP_Error( 'not_found', "Elemento com css_id '{$css_id}' não encontrado na página.", [ 'status' => 404 ] );
    }

    /**
     * Limpa o cache de arquivos do Elementor.
     */
    public static function clear_cache() {
        if ( class_exists( '\Elementor\Plugin' ) ) {
            \Elementor\Plugin::$instance->files_manager->clear_cache();
            return true;
        }
        return new WP_Error( 'elementor_not_active', 'O Elementor não está ativo.', [ 'status' => 500 ] );
    }
}
```

### VALIDAÇÃO 2.2

- [ ] O arquivo `class-elementor-helper.php` foi criado
- [ ] A função `find_element_by_css_id` usa passagem por referência (`&$elements`) — isso é crítico para a atualização funcionar
- [ ] A função `update_element_settings` usa `array_merge` (merge, não substituição total)
- [ ] A função `save_page_data` usa `wp_slash` — sem isso o JSON será corrompido ao salvar

---

## Fase 2.3 — REST API (rotas e controllers)

Crie `wordpress-plugin/figmentor-bridge/includes/class-rest-api.php`:

```php
<?php

class Figmentor_Bridge_REST_API {

    const NAMESPACE = 'figmentor/v1';

    public function register_routes() {

        // GET /wp-json/figmentor/v1/pages/{page_id}
        register_rest_route( self::NAMESPACE, '/pages/(?P<page_id>\d+)', [
            'methods'             => 'GET',
            'callback'            => [ $this, 'get_page' ],
            'permission_callback' => [ $this, 'check_permission' ],
            'args'                => [
                'page_id' => [
                    'required'          => true,
                    'validate_callback' => fn($v) => is_numeric($v) && $v > 0,
                ],
            ],
        ] );

        // PUT /wp-json/figmentor/v1/pages/{page_id}/widgets/{css_id}
        register_rest_route( self::NAMESPACE, '/pages/(?P<page_id>\d+)/widgets/(?P<css_id>[a-z0-9\-]+)', [
            'methods'             => 'PUT',
            'callback'            => [ $this, 'update_widget' ],
            'permission_callback' => [ $this, 'check_permission' ],
            'args'                => [
                'page_id' => [
                    'required'          => true,
                    'validate_callback' => fn($v) => is_numeric($v) && $v > 0,
                ],
                'css_id' => [
                    'required'          => true,
                    'validate_callback' => fn($v) => preg_match('/^[a-z0-9\-]+$/', $v),
                ],
                'settings' => [
                    'required'          => true,
                    'validate_callback' => fn($v) => is_array($v),
                ],
            ],
        ] );

        // POST /wp-json/figmentor/v1/pages/{page_id}/cache/clear
        register_rest_route( self::NAMESPACE, '/pages/(?P<page_id>\d+)/cache/clear', [
            'methods'             => 'POST',
            'callback'            => [ $this, 'clear_cache' ],
            'permission_callback' => [ $this, 'check_permission' ],
            'args'                => [
                'page_id' => [
                    'required'          => true,
                    'validate_callback' => fn($v) => is_numeric($v) && $v > 0,
                ],
            ],
        ] );
    }

    /**
     * GET /pages/{page_id}
     * Retorna a estrutura completa do Elementor para a página.
     */
    public function get_page( WP_REST_Request $request ) {
        $page_id = (int) $request->get_param( 'page_id' );
        $data    = Figmentor_Bridge_Elementor_Helper::get_page_data( $page_id );

        if ( is_wp_error( $data ) ) {
            return $data;
        }

        return rest_ensure_response( [
            'page_id'  => $page_id,
            'title'    => get_the_title( $page_id ),
            'elements' => $data,
        ] );
    }

    /**
     * PUT /pages/{page_id}/widgets/{css_id}
     * Atualiza as settings de um widget pelo css_id.
     * Body JSON: { "settings": { "padding": {...}, "background_color": "...", ... } }
     */
    public function update_widget( WP_REST_Request $request ) {
        $page_id      = (int) $request->get_param( 'page_id' );
        $css_id       = sanitize_text_field( $request->get_param( 'css_id' ) );
        $new_settings = $request->get_param( 'settings' );

        // Validação extra: settings deve ser array e não vazio
        if ( empty( $new_settings ) || ! is_array( $new_settings ) ) {
            return new WP_Error( 'invalid_settings', 'O campo "settings" é obrigatório e deve ser um objeto.', [ 'status' => 400 ] );
        }

        // Sanitizar: não permitir que css_id seja sobrescrito via settings
        unset( $new_settings['css_id'] );

        $data = Figmentor_Bridge_Elementor_Helper::get_page_data( $page_id );
        if ( is_wp_error( $data ) ) return $data;

        $result = Figmentor_Bridge_Elementor_Helper::update_element_settings( $data, $css_id, $new_settings );
        if ( is_wp_error( $result ) ) return $result;

        $saved = Figmentor_Bridge_Elementor_Helper::save_page_data( $page_id, $data );
        if ( is_wp_error( $saved ) ) return $saved;

        return rest_ensure_response( [
            'success' => true,
            'page_id' => $page_id,
            'css_id'  => $css_id,
            'message' => 'Settings atualizadas com sucesso. Lembre de limpar o cache.',
        ] );
    }

    /**
     * POST /pages/{page_id}/cache/clear
     * Limpa o cache do Elementor para a página.
     */
    public function clear_cache( WP_REST_Request $request ) {
        $result = Figmentor_Bridge_Elementor_Helper::clear_cache();

        if ( is_wp_error( $result ) ) return $result;

        return rest_ensure_response( [
            'success' => true,
            'message' => 'Cache do Elementor limpo com sucesso.',
        ] );
    }

    /**
     * Verifica se o usuário tem permissão para usar a API.
     * Requer autenticação via Application Passwords.
     */
    public function check_permission( WP_REST_Request $request ) {
        return current_user_can( 'edit_pages' );
    }
}
```

### VALIDAÇÃO 2.3

- [ ] As 3 rotas foram registradas corretamente
- [ ] O método `check_permission` usa `current_user_can('edit_pages')` — compatível com Application Passwords
- [ ] O `css_id` é sanitizado antes de usar (`sanitize_text_field`)
- [ ] O `css_id` não pode ser sobrescrito acidentalmente via o body do PUT (linha `unset($new_settings['css_id'])`)
- [ ] A rota do PUT usa regex `[a-z0-9\-]+` no parâmetro `css_id` — apenas caracteres válidos

---

## Fase 2.4 — Testes dos endpoints

### Pré-requisito para os testes

1. O plugin está ativado no WordPress
2. O Elementor está ativo
3. Existe uma página editada com o Elementor com `_elementor_data` preenchido
4. Você criou um Application Password para um usuário com role `editor` ou `administrator`
5. Você tem o `page_id` da página (visível na URL do painel: `wp-admin/post.php?post=42&action=edit`)

### Teste 1 — GET /pages/{page_id}

```bash
curl -s \
  -u "username:app-password" \
  "https://seu-site.com/wp-json/figmentor/v1/pages/42" \
  | python3 -m json.tool | head -50
```

**Resultado esperado:** JSON com `page_id`, `title`, e `elements` (array com a estrutura do Elementor).

**Se retornar 401:** As credenciais estão erradas ou Application Passwords não estão habilitados.
**Se retornar 404 com `no_elementor_data`:** A página não foi editada com o Elementor.

### Teste 2 — PUT /pages/{page_id}/widgets/{css_id}

Primeiro, via GET, encontre um elemento que tenha `css_id` definido (deve ter sido importado via JSON gerado pelo plugin Figma com o Plano 1 implementado). Use o valor desse `css_id` no teste abaixo.

```bash
curl -s -X PUT \
  -u "username:app-password" \
  -H "Content-Type: application/json" \
  -d '{
    "settings": {
      "background_color": "rgba(255, 0, 0, 1)",
      "padding": {
        "top": 50, "right": 20, "bottom": 50, "left": 20, "unit": "px"
      }
    }
  }' \
  "https://seu-site.com/wp-json/figmentor/v1/pages/42/widgets/titulo-principal-da-hero"
```

**Resultado esperado:** `{ "success": true, "css_id": "titulo-principal-da-hero", ... }`

Após o teste, verifique no painel do WordPress (Elementor > abrir a página) se o widget com aquele `css_id` tem o fundo vermelho e o padding correto.

### Teste 3 — POST /cache/clear

```bash
curl -s -X POST \
  -u "username:app-password" \
  "https://seu-site.com/wp-json/figmentor/v1/pages/42/cache/clear"
```

**Resultado esperado:** `{ "success": true, "message": "Cache do Elementor limpo com sucesso." }`

### VALIDAÇÃO 2.4 — CHECKPOINT 2

- [ ] GET retorna a estrutura correta da página com status 200
- [ ] PUT localiza o elemento pelo `css_id` e atualiza as settings
- [ ] A mudança é visível no editor do Elementor após o PUT (sem necessidade de salvar manualmente)
- [ ] POST de limpeza de cache retorna sucesso
- [ ] Requisições sem autenticação retornam 401
- [ ] PUT com `css_id` inexistente retorna 404 com mensagem descritiva
- [ ] PUT sem o campo `settings` retorna 400 com mensagem descritiva

**Se todos os itens passarem: o Plano 2 está concluído. Faça commit.**

```bash
git add wordpress-plugin/
git commit -m "feat(wordpress): add Figmentor Bridge plugin with REST API for Elementor"
```

---

---

# PLANO 3 — Documento de Workflow para o Agente de Estilização

## Objetivo

Criar um documento `WORKFLOW_ESTILIZACAO.md` na raiz do repositório que descreve, de forma completa e executável, como um agente de IA deve operar para aplicar estilos em uma página do Elementor usando o Figma como referência.

Este documento não é para humanos — é para o agente que receberá o comando do usuário e precisará saber exatamente o que fazer, em que ordem, e como tratar erros.

## O que o agente de estilização precisa saber

### 1. Ferramentas disponíveis

- **MCP do Figma** — Para ler nodes, propriedades de design, cores, tipografia, espaçamentos
- **REST API do WordPress (Figmentor Bridge)** — Para ler e escrever dados do Elementor
- **Requisições HTTP** — Para chamar os endpoints do plugin WordPress

### 2. Mapeamento de propriedades Figma → Elementor

Este é o coração do workflow. O agente precisa saber como traduzir cada propriedade lida no Figma para o campo correto no Elementor.

## Fase 3.1 — Construir a tabela de mapeamento

Esta tabela deve constar no documento `WORKFLOW_ESTILIZACAO.md`. Expanda-a conforme necessário ao longo do desenvolvimento.

### Mapeamento: Espaçamento

| Propriedade no Figma | Campo no Elementor settings |
|---|---|
| `paddingTop` | `padding.top` |
| `paddingRight` | `padding.right` |
| `paddingBottom` | `padding.bottom` |
| `paddingLeft` | `padding.left` |
| `itemSpacing` (Auto Layout) | `gap.column` e `gap.row` |

### Mapeamento: Background

| Propriedade no Figma | Campo no Elementor settings |
|---|---|
| Fill SOLID com cor | `background_background: "classic"` + `background_color: "rgba(...)"` |
| Fill gradiente | `background_background: "gradient"` + campos de gradiente |
| Sem fill | Não enviar campo (não limpar o existente) |

### Mapeamento: Tipografia

| Propriedade no Figma | Campo no Elementor settings |
|---|---|
| `fontSize` | `typography_font_size: { size: N, unit: "px" }` |
| `fontName.style` (Bold, Regular, etc.) | `typography_font_weight: "700"` (usar mapeamento) |
| `fontName.family` | `typography_font_family: "Nome Da Fonte"` |
| Cor do texto (fill SOLID) | `title_color` (heading) / `text_color` (text-editor) |

**Mapeamento de font weight:**

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

| Propriedade no Figma | Campo no Elementor settings (container) |
|---|---|
| `cornerRadius` (uniforme) | `border_radius: { top: "Npx", right: "Npx", ... }` |
| `topLeftRadius`, `topRightRadius`, etc. | `border_radius: { top, right, bottom, left, isLinked: false }` |
| `strokes[0].color` + `strokeWeight` | `border_border: "solid"`, `border_width`, `border_color` |

### Mapeamento: Sombras

| Propriedade no Figma | Campo no Elementor settings |
|---|---|
| Effect DROP_SHADOW offset.x | `_box_shadow_box_shadow.horizontal` |
| Effect DROP_SHADOW offset.y | `_box_shadow_box_shadow.vertical` |
| Effect DROP_SHADOW radius | `_box_shadow_box_shadow.blur` |
| Effect DROP_SHADOW spread | `_box_shadow_box_shadow.spread` |
| Effect DROP_SHADOW color | `_box_shadow_box_shadow.color` |
| (presença de shadow) | `_box_shadow_box_shadow_type: "yes"` |

## Fase 3.2 — Escrever o documento `WORKFLOW_ESTILIZACAO.md`

Crie o arquivo `WORKFLOW_ESTILIZACAO.md` na raiz do repositório com o seguinte conteúdo:

---

```markdown
# WORKFLOW: Estilização Automática Figma → Elementor

## Para o agente que receber este documento

Você receberá um comando do usuário solicitando que aplique os estilos de um design do Figma
em uma página do Elementor. Siga este workflow exatamente, na ordem descrita.

## Informações que você precisa do usuário antes de começar

Antes de executar qualquer passo, confirme que você tem:
1. O link ou ID do arquivo Figma com o design
2. O ID da página no WordPress (ex: 42)
3. A URL base do WordPress (ex: https://meusite.com)
4. O username e Application Password para a REST API

Se algum desses estiver faltando, solicite ao usuário antes de prosseguir.

## Passo 1 — Ler a estrutura da página no Elementor

Faça uma requisição GET para:
  GET {wordpress_url}/wp-json/figmentor/v1/pages/{page_id}

Armazene o array `elements` retornado. Você usará ele para identificar quais `css_id`
existem na página e para planejar as atualizações.

Extraia todos os `css_id` presentes na página (navegue recursivamente em `elements`).
Monte uma lista: css_id → tipo de widget (elType + widgetType).

## Passo 2 — Ler o design no Figma

Use o MCP do Figma para ler o design. Para cada node no Figma cujo nome (após sanitização)
corresponder a um css_id da lista do Passo 1, extraia:

- Padding (top, right, bottom, left)
- itemSpacing (gap)
- Fills (cor de background)
- Width e sizing horizontal
- Para nodes TEXT filhos: fontSize, fontName (family + style), fills (cor do texto)
- cornerRadius e variações individuais
- strokes (borda)
- effects (sombras)

## Passo 3 — Montar o payload de atualização

Para cada css_id identificado, monte o objeto `settings` com as propriedades mapeadas
usando a tabela de mapeamento em WORKFLOW_ESTILIZACAO.md.

Regras importantes:
- Só envie campos que você conseguiu ler com certeza do Figma
- Não envie campos com valor null ou undefined
- Não sobrescreva `css_id` (o PUT ignora isso, mas é boa prática não enviar)
- Para cores, converta sempre para rgba() com 4 casas decimais máximo

## Passo 4 — Aplicar as atualizações

Para cada css_id da lista, faça:
  PUT {wordpress_url}/wp-json/figmentor/v1/pages/{page_id}/widgets/{css_id}
  Body: { "settings": { ...propriedades... } }

Se o PUT retornar 404 (css_id não encontrado), registre o erro mas continue com os demais.
Se o PUT retornar 500, pare e reporte o erro ao usuário.

Faça as chamadas em sequência, não em paralelo, para evitar condições de corrida ao
salvar o post meta.

## Passo 5 — Limpar o cache

Após todas as atualizações, faça:
  POST {wordpress_url}/wp-json/figmentor/v1/pages/{page_id}/cache/clear

## Passo 6 — Reportar ao usuário

Informe:
- Quantos widgets foram atualizados com sucesso
- Quais css_ids não foram encontrados na página (se houver)
- Quais erros ocorreram (se houver)
- Que o cache foi limpo e a página está pronta para ser visualizada

## Tratamento de erros comuns

| Erro | Causa | Solução |
|---|---|---|
| 401 nas chamadas | Credenciais incorretas | Verificar username + application password |
| 404 em GET /pages | page_id errado ou página sem Elementor | Confirmar ID com o usuário |
| 404 em PUT /widgets | css_id não existe na página | O JSON foi importado sem o Plano 1 implementado |
| 500 em PUT | Erro ao salvar no WordPress | Verificar logs do WordPress (wp-content/debug.log) |
| Cache não limpo | Elementor não está ativo | Verificar se o Elementor está ativo no WordPress |
```

---

## Fase 3.3 — Validação do Workflow

### Teste de ponta a ponta

Execute um teste completo do fluxo:

1. No Figma: crie um frame com pelo menos um CONTAINER, um HEADING e um BUTTON tagueados
2. Exporte o JSON com o plugin (Plano 1 deve estar implementado — o JSON deve ter `css_id`)
3. Importe o JSON no Elementor como template (Elementor > Templates > Importar)
4. Leia a estrutura via GET para confirmar que os `css_id` estão presentes
5. Leia os valores de design do Figma via MCP
6. Execute 2-3 chamadas PUT com propriedades reais
7. Limpe o cache
8. Visualize a página e confirme que as mudanças foram aplicadas

### VALIDAÇÃO 3.3 — CHECKPOINT 3

- [ ] O arquivo `WORKFLOW_ESTILIZACAO.md` foi criado e está completo
- [ ] A tabela de mapeamento cobre pelo menos: padding, gap, background_color, typography (size/weight/family/color), border_radius, border, box_shadow
- [ ] O teste de ponta a ponta foi executado com sucesso
- [ ] As mudanças aplicadas via PUT são visíveis na página do WordPress sem edição manual
- [ ] O documento de workflow é auto-suficiente (um agente sem contexto adicional consegue seguir)

**Se todos os itens passarem: o Plano 3 está concluído. Faça commit.**

```bash
git add WORKFLOW_ESTILIZACAO.md
git commit -m "docs: add Elementor auto-styling workflow document for AI agent"
```

---

---

## CHECKPOINT FINAL — Validação do sistema completo

Antes de considerar a implementação concluída, execute este checklist final:

### Plugin Figma (Plano 1)
- [ ] `npm run build` roda sem erros
- [ ] JSON exportado contém `css_id` em todos os elementos
- [ ] `css_id` é derivado corretamente do nome da layer (lowercase, sem acentos, sem espaços)

### Plugin WordPress (Plano 2)
- [ ] Plugin ativado no WordPress sem erros
- [ ] GET retorna estrutura do Elementor com status 200
- [ ] PUT atualiza settings por `css_id` com status 200
- [ ] PUT retorna 404 para `css_id` inexistente
- [ ] POST de cache retorna sucesso

### Workflow (Plano 3)
- [ ] Documento `WORKFLOW_ESTILIZACAO.md` criado e completo
- [ ] Teste de ponta a ponta executado com sucesso real (não simulado)

### Git
- [ ] Todos os commits estão na branch `feature/elementor-bridge`
- [ ] A branch `main` não foi modificada
- [ ] Os commits são atômicos e descritivos

### Pull Request
Ao finalizar todos os planos, abra um Pull Request de `feature/elementor-bridge` → `main` com o título:

```
feat: Elementor Auto-Styling Bridge (css_id + WP REST API + workflow)
```

E inclua no corpo do PR um resumo das 3 entregas com links para os arquivos criados.

---

*Documento gerado em: 2026-04-23*
*Versão do plugin Figmentor na data de geração: 1.1.0*
