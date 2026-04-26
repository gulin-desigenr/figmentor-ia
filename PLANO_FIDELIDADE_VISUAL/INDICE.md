# PLANO DE FIDELIDADE VISUAL — Figma → Elementor

> **Documento de entrada.** Leia este arquivo antes de qualquer outro.
> Orienta a evolução do sistema Figmentor para atingir ~80% de fidelidade visual em páginas Elementor geradas a partir de designs Figma em Auto Layout.

---

## Visão Geral da Arquitetura

O sistema possui três camadas com responsabilidades distintas:

| Camada | Papel | Não deve |
|---|---|---|
| **Exportador Figmentor** | Tradutor principal — converte propriedades Figma em JSON Elementor de forma determinística | Conter lógica contextual ou inferências |
| **Bridge WordPress** | Conector operacional — lê, escreve e limpa cache de forma segura | Conter lógica de tradução visual |
| **Agente de IA** | Operador inteligente — identifica lacunas e aplica ajustes complementares | Sobrescrever o que o exportador já resolveu corretamente |

**Princípio central:** o que for determinístico vai no exportador; o que for contextual vai no agente; o bridge é apenas o canal seguro.

---

## Estrutura de Arquivos

```
PLANO_FIDELIDADE_VISUAL/
├── INDICE.md                        ← este arquivo
├── DIAGNOSTICO.md                   ← estado atual, matriz de responsabilidades, mapas de conhecimento
├── FASE_00_FIX_ALIGN_TEXTO.md       ← correção crítica: align hardcoded
├── FASE_01_TIPOGRAFIA_COMPLETA.md   ← line-height, letter-spacing, transform, decoration, italic
├── FASE_02_SIZING_VERTICAL.md       ← min-height e align-self de filhos
├── FASE_03_PROTOCOLO_AGENTE.md      ← protocolo de operação do agente + atualização do workflow
├── FASE_04_BRIDGE_V2.md             ← endpoints de eficiência (batch, GET individual, listagem)
├── FASE_05_RESPONSIVIDADE.md        ← responsividade por breakpoint via agente
└── RISCOS.md                        ← registro de riscos com mitigações
```

---

## Ordem de Execução

```
DIAGNOSTICO.md  ← leitura obrigatória antes de qualquer fase
      ↓
  FASE_00        ← executar primeiro — bug crítico que afeta todos os layouts
      ↓
  FASE_01        ← depende de FASE_00 concluída
      ↓
  FASE_02        ← depende de FASE_01 concluída
      ↓
  FASE_03 ─┐    ← pode ser paralela a FASE_02 (sem dependência de código)
  FASE_04 ─┘    ← independente das fases do exportador
      ↓
  FASE_05        ← requer FASE_03 e FASE_04 concluídas
```

---

## Dependências Resumidas

| Fase | Pré-requisitos obrigatórios |
|---|---|
| FASE_00 | Nenhuma — iniciar imediatamente |
| FASE_01 | FASE_00 aprovada |
| FASE_02 | FASE_01 aprovada |
| FASE_03 | FASE_00 aprovada (agente precisa conhecer o que o exportador já resolve) |
| FASE_04 | Nenhuma — pode ser paralela a FASE_01/02 |
| FASE_05 | FASE_03 e FASE_04 aprovadas |

---

## Como Usar Este Plano

1. Leia `DIAGNOSTICO.md` uma vez na íntegra — é o mapa de tudo que já existe e tudo que falta.
2. Antes de iniciar cada fase, leia o arquivo da fase por completo.
3. Execute as tarefas na ordem indicada dentro de cada arquivo.
4. Não avance sem que todos os checkpoints da fase atual estejam marcados.
5. Consulte `RISCOS.md` sempre que algo inesperado acontecer.

---

## Critério Global de Sucesso

O sistema atinge ~80% de fidelidade quando:
- Um frame Figma em Auto Layout exporta e importa no Elementor com hierarquia, tipografia, cores e espaçamentos corretos **sem edição manual**
- O agente consegue aplicar os ~20% restantes (imagens, hover, responsividade) em menos de 15 minutos de operação assistida
- Nenhuma das três camadas executa o trabalho que é responsabilidade de outra

---

*Gerado em: 2026-04-25 | Branch: `feature/elementor-bridge` | Exportador: versão modular com `src/`*
