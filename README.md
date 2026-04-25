# 🎨 Figmentor — Figma to Elementor

> Plugin Figma que converte seus designs diretamente em JSON compatível com Elementor, preservando layout, estilos, tipografia e estrutura.

![Status](https://img.shields.io/badge/status-MVP%20v0.4-blue)
![Figma](https://img.shields.io/badge/plataforma-Figma-purple)
![Elementor](https://img.shields.io/badge/destino-Elementor-red)

---

## 📋 Sumário

- [O que faz](#-o-que-faz)
- [Como funciona](#-como-funciona)
- [Instalação](#-instalação)
- [Tags Suportadas](#-tags-suportadas)
- [Estrutura do Projeto](#-estrutura-do-projeto)
- [Estrutura do JSON Exportado](#-estrutura-do-json-exportado)
- [Branches](#-branches)
- [Roadmap](#-roadmap)
- [Contribuição](#-contribuição)
- [Licença](#-licença)

---

## ✨ O que faz

O Figmentor permite que você:

1. **Tagueie** elementos no Figma com widgets do Elementor (heading, image, container, etc.)
2. **Exporte** toda a estrutura como um JSON compatível com Elementor
3. **Importe** o JSON diretamente no Elementor para recriar o layout

### O que é preservado na conversão

| Propriedade | Status |
|---|---|
| Layout (direction, gap, padding) | ✅ |
| Cores de fundo | ✅ |
| Tipografia (tamanho, peso, cor) | ✅ |
| Bordas e border-radius | ✅ |
| Sombras (drop shadow) | ✅ |
| Larguras (fixed/fill) | ✅ |
| Imagens (estrutura) | ✅ (URL manual) |

---

## 🔄 Como funciona

```
┌─────────────┐     ┌──────────────┐     ┌───────────────┐
│  Figma       │────▶│  Figmentor   │────▶│  JSON         │
│  Design      │     │  (tagging)   │     │  Elementor    │
└─────────────┘     └──────────────┘     └───────────────┘
```

1. Abra o plugin no Figma
2. Selecione elementos e aplique tags com os botões
3. Selecione o frame principal
4. Clique **"GERAR E BAIXAR JSON"**
5. Importe o `.json` no Elementor

---

## 🚀 Instalação

### Modo Desenvolvimento (Figma Desktop)

1. Clone o repositório:
   ```bash
   git clone https://github.com/gulin-desigenr/plugin-figma-to-elementor.git
   ```
2. Abra o **Figma Desktop**
3. Vá em **Menu → Plugins → Development → Import plugin from manifest...**
4. Selecione o arquivo `manifest.json` deste repositório
5. O plugin aparecerá em **Plugins → Development**

### Operação do Figmentor Bridge no WordPress

Se você estiver usando o plugin WordPress `Figmentor Bridge`, as rotas REST do bridge **não podem ser armazenadas em cache** por plugins como LiteSpeed Cache, WP Rocket, W3 Total Cache ou cache de servidor/CDN.

Adicione uma exclusão de URI no sistema de cache do WordPress/servidor para o prefixo:

```text
/wp-json/figmentor/
```

No LiteSpeed Cache, isso deve ser configurado em:

```text
LiteSpeed Cache > Cache > Excludes > Do Not Cache URIs
```

Sem essa exclusão, o ambiente pode:

- servir `GET /wp-json/figmentor/v1/pages/{id}` com resposta stale
- retornar `200` em `GET` sem token por resposta cacheada
- ignorar a autenticação real do endpoint antes de o PHP executar

Em ambientes com Hostinger/LiteSpeed, essa exclusão é obrigatória para a operação correta do bridge.

---

## 🏷️ Tags Suportadas

### Layout (Estrutura)

| Tag | Descrição | Elementor |
|---|---|---|
| `container` | Seção com largura boxed (1140px) | Container boxed |
| `container-full` | Container filho 100% full-width | Container full |

### Widgets de Conteúdo

| Tag | Descrição | Elementor |
|---|---|---|
| `heading` | Título — texto com fonte ≥32px é auto-detectado | Heading widget |
| `text-editor` | Bloco de texto — texto com fonte <32px é auto-detectado | Text Editor widget |
| `image` | Imagem (detectada por fill type IMAGE) | Image widget |
| `image-box` | Caixa de imagem com título e descrição | Image Box widget |
| `icon-list` | Lista com ícones | Icon List widget |
| `icon-box` | Caixa com ícone | Icon Box widget (⚠️ em desenvolvimento) |

### Dinâmicos

| Tag | Descrição | Status |
|---|---|---|
| `image-carousel` | Carrossel de imagens | ⚠️ Em desenvolvimento |
| `container-carousel` | Carrossel de containers | ⚠️ Em desenvolvimento |

---

## 📁 Estrutura do Projeto

```
plugin-figma-to-elementor/
├── manifest.json        # Manifesto do plugin Figma
├── code.js              # Backend — lógica de traversal e export
├── ui.html              # Frontend — interface de tagging
├── .gitignore           # Arquivos ignorados pelo Git
├── .agents/
│   └── rules.md         # Regras para agentes AI
├── README.md            # Este arquivo
├── CONTRIBUTING.md      # Guia de contribuição
└── CHANGELOG.md         # Histórico de versões
```

---

## 📦 Estrutura do JSON Exportado

```json
{
  "version": "0.4",
  "title": "Export V16 Width Fix - Nome do Frame",
  "type": "container",
  "content": [
    {
      "elType": "container",
      "settings": {
        "content_width": "boxed",
        "flex_direction": "column",
        "gap": { "column": 20, "row": 20, "unit": "px" },
        "padding": { "top": 40, "right": 20, "bottom": 40, "left": 20, "unit": "px" }
      },
      "elements": [
        {
          "elType": "widget",
          "widgetType": "heading",
          "settings": {
            "title": "Meu Título",
            "title_color": "rgba(26,26,26,1)",
            "typography_font_size": { "size": 48, "unit": "px" }
          }
        }
      ]
    }
  ]
}
```

---

## 🌿 Branches

| Branch | Propósito |
|---|---|
| `main` | Produção — código estável e testado |
| `dev` | Desenvolvimento — integração de features |
| `feature/*` | Features individuais |
| `fix/*` | Correções de bugs |

> **Regra**: nunca commitar direto na `main`. Todo trabalho segue `feature/* → dev → main`.

---

## 🗺️ Roadmap

- [x] v0.1 — Estrutura base e tagging manual
- [x] v0.4 — Correção de propriedades mistas (`figma.mixed`)
- [ ] v0.5 — Handlers para `icon-box`, `image-carousel`, `container-carousel`
- [ ] v0.6 — Export de imagens como base64 ou URL
- [ ] v0.7 — Suporte a gradientes e múltiplos fills
- [ ] v1.0 — Importação direta via API do Elementor

---

## 🤝 Contribuição

Veja o [CONTRIBUTING.md](CONTRIBUTING.md) para detalhes sobre como contribuir.

---

## 📄 Licença

Projeto privado. Todos os direitos reservados.
