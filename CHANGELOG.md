# Changelog

Todas as mudanças notáveis do projeto serão documentadas neste arquivo.

O formato é baseado em [Keep a Changelog](https://keepachangelog.com/pt-BR/1.0.0/),
e este projeto segue [Versionamento Semântico](https://semver.org/lang/pt-BR/).

---

## [1.2.0] - 2026-04-25

### Adicionado
- Plugin WordPress `Figmentor Bridge` em `wordpress-plugin/figmentor-bridge/`.
- Página administrativa em `Configurações > Figmentor Bridge` para gerar, regenerar e revogar token de API.
- Autenticação própria via header `X-Figmentor-Token` para os endpoints REST do bridge.
- Endpoint REST para leitura da estrutura Elementor por `page_id`.
- Endpoint REST para atualização de widgets por `css_id`.
- Endpoint REST para limpeza de cache do Elementor.

### Alterado
- `PLANO_BRIDGE_ELEMENTOR.md` foi reestruturado no Plano 2 para refletir autenticação por token, admin page e validações por fase.

### Corrigido
- Mensagens da admin page alinhadas ao comportamento real da autenticação por token.
- Helper do Elementor documentado e ajustado para busca recursiva por referência em `find_element_by_css_id`.
- Mensagem de erro `401` da REST API alinhada ao Plano 2 revisado.
- Documentação operacional atualizada para exigir exclusão de `/wp-json/figmentor/` do cache de plugins/servidor, evitando bypass de autenticação e leituras stale no bridge.

---

## [1.1.0] - 2026-03-28

### Adicionado
- Documentação para exportação WebP e suporte a Font Family.
- Planejamento de automação de assets no PLANO_DE_ACAO.md.

### Corrigido
- Escopo da variável `bgSettings` em `handleManualTag` para evitar erros de referência.

---

## [0.4.0] - 2025-02-15

### Corrigido
- Erro de extração de propriedades mistas (`figma.mixed`) no `cornerRadius` e `strokeWeight`
- Crash ao processar nós com bordas individuais diferentes

---

## [0.3.0] - 2025-02-12

### Adicionado
- Sistema de tagging manual via UI
- Export de JSON com download automático
- Suporte a widgets: `heading`, `text-editor`, `image`, `image-box`, `icon-list`
- Suporte a containers: `container` (boxed 1140px) e `container-full` (100%)
- Detecção automática de layout direction (horizontal/vertical)
- Extração de estilos: background, borders, border-radius, shadows
- Mapeamento de font-weight (Thin a Black)
- Inteligência espacial para detectar direção de layouts sem Auto Layout

---

## [0.1.0] - 2025-02-12

### Adicionado
- Estrutura inicial do plugin
- Manifesto Figma (`manifest.json`)
- Primeiro commit do projeto
