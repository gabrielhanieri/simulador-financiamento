# Simulador de Financiamento

Tela de simulação de financiamento habitacional com motor de cálculo próprio, baseado no simulador da CAIXA (MCMV faixas 1 a 4 e SBPE) para Ribeirão Preto, Campinas e Sorocaba.

HTML, CSS e JavaScript puro. Sem build e sem dependências para instalar.

## Como rodar

```bash
git clone https://github.com/gabrielhanieri/simulador-financiamento.git
cd simulador-financiamento
python3 -m http.server 5510
```

Abra http://localhost:5510. É preciso usar um servidor local: abrindo o `index.html` direto do disco, o navegador bloqueia a leitura do CSV.

jsPDF (geração do PDF) e a fonte DM Sans vêm de CDN, então o PDF precisa de internet.

## Testes

Requer Node 18 ou mais novo.

```bash
node --test tests/*.test.js
```

## Arquivos

| Arquivo | O que faz |
|---|---|
| `assets/motor-caixa.js` | Motor de cálculo: enquadramento, juros, prazo, seguros, subsídio, PRICE e SAC |
| `assets/regras-apoio.js` | Leitura de valores, elegibilidade ao subsídio e trava da Faixa 3 (`window.Match`) |
| `assets/financiamento.js` | Regras do simulador sobre o motor (funções puras) |
| `assets/financiamento-app.js` | Tela: os cinco passos e o resultado |
| `assets/financiamento-ui.js` | Componentes e animações |
| `assets/financiamento-pdf.js` | PDF da simulação |
| `assets/dados-unidades.js` | Catálogo de empreendimentos e leitura do CSV |
| `assets/config.js` | Fontes de dados |
| `data/unidades-exemplo.csv` | Unidades **fictícias** para demonstração |
| `docs/` | Regras do motor, coleta de SBPE e matriz de conferência |

## Dados próprios

Troque `window.SIM_SHEET_CSV_URL` em `assets/config.js` por outro CSV com o mesmo cabeçalho do arquivo de exemplo. O código da unidade segue o formato `BL01-0102`, e só aparecem unidades com status `Disponível` ou `Mirror`. Os valores usam o formato brasileiro (`215.000,00`).

O catálogo de empreendimentos fica em `window.SIM_EMPS`, em `assets/dados-unidades.js`.

O navegador guarda o CSV em `sessionStorage`. Depois de trocar os dados, abra uma aba nova.

## Marca

Logo, favicon e fotos são placeholders em `assets/img/`.

## Aviso

O resultado é uma estimativa e não é aprovação de crédito. As regras refletem o simulador da CAIXA nas datas indicadas em `docs/` e precisam ser revalidadas quando o programa mudar.
