/* ============================================================
   DADOS DE IMOVEIS
     window.SIM_EMPS     - catalogo de empreendimentos
     window.SimUnidades  - carga das unidades disponiveis (CSV de config.js)
   sheetName = valor da coluna "Nome do Empreendimento" no CSV.
   ============================================================ */

window.SIM_EMPS = [
  /* ---------- Ribeirao Preto ---------- */
  { id:'gaia', nome:'Village Gaia', cidade:'Ribeirão Preto',
    sheetName:'Village Gaia' },
  { id:'park', nome:'Village Park', cidade:'Ribeirão Preto',
    sheetName:'Village Park' },
  { id:'botanico', nome:'Reserva Direcional Jardim Botânico', cidade:'Ribeirão Preto',
    sheetName:'Reserva Direcional Jardim Botânico' },
  { id:'ipiranga', nome:'Conquista Clube Ipiranga', cidade:'Ribeirão Preto',
    sheetName:'Direcional Conquista Clube Ipiranga' },

  /* ---------- Campinas ---------- */
  { id:'alta-vista', nome:'Alta Vista Mangará', cidade:'Campinas',
    sheetName:'Alta Vista Mangará' },
  { id:'cores-da-mata', nome:'Cores da Mata Mangará', cidade:'Campinas',
    sheetName:'Cores da Mata Mangará' },
  { id:'casa-prado', nome:'Casa Prado Residence Riva', cidade:'Campinas',
    sheetName:'Casa Prado Residencial Riva' },
  { id:'seleto', nome:'Seleto Amoreiras', cidade:'Campinas',
    sheetName:'Seleto Amoreiras' },

  /* ---------- Sorocaba ---------- */
  { id:'vila-da-mata', nome:'Conquista Vila da Mata', cidade:'Sorocaba',
    sheetName:'Conquista Vila da Mata' }
];

/* ============================================================
   UNIDADES DISPONIVEIS
   ============================================================ */
window.SimUnidades = (function () {

  var CACHE_KEY = 'sim-unidades-csv-v1';
  var estado = 'inicial';   /* inicial | carregando | ok | erro */
  var linhas = null;
  var erroMsg = '';
  var ouvintes = [];
  /* chaves das unidades promocionais; null = ainda nao carregou */
  var PROMO_SET = null;

  /* O "Identificador" (BL01-0003) se repete entre empreendimentos,
     por isso a chave inclui o nome do empreendimento. */
  function chavePromo(nomeEmp, identificador) {
    var e = ('' + (nomeEmp || '')).toLowerCase()
      .normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]/g, '');
    return e + '::' + ('' + (identificador || '')).trim().toUpperCase();
  }

  function avisa() {
    for (var i = 0; i < ouvintes.length; i++) ouvintes[i](estado, erroMsg);
  }

  /* Le o CSV opcional de promocionais (window.PROMO_CSV_URL, de config.js).
     Sem ele, nenhuma unidade e tratada como promocional. */
  function carregaPromocionais() {
    function aplicaChaves(chaves) {
      PROMO_SET = {};
      for (var i = 0; i < chaves.length; i++) PROMO_SET[('' + chaves[i]).trim()] = true;
      avisa();
    }
    /* CSV baixado com o cabecalho e sem linhas = nenhuma promocional (lista vazia valida. Resposta HTML/lixo e ignorada. */
    function doCsv(text) {
      var limpo = ('' + (text || '')).replace(/^\uFEFF/, '').trim();
      if (!limpo || limpo.charAt(0) === '<') return false;
      if (!/identificador/i.test(limpo.split('\n')[0])) return false;
      var rows = parseCSV(limpo) || [];
      var chaves = [];
      for (var i = 0; i < rows.length; i++) {
        var emp = rows[i]['Empreendimento'], ident = rows[i]['Identificador'];
        if (emp && ident) chaves.push(chavePromo(emp, ident));
      }
      aplicaChaves(chaves);
      return true;
    }
    var csv = window.PROMO_CSV_URL;
    if (!csv) return;
    fetch(csv)
      .then(function (r) { return r.ok ? r.text() : null; })
      .then(doCsv)
      .catch(function () { /* segue sem promocionais */ });
  }

  /* ---------- CSV (leitor simples) ---------- */
  function parseCSV(text) {
    var lines = text.replace(/\r/g, '').trim().split('\n');
    if (lines.length < 2) return null;
    function splitLine(line) {
      var result = [], inQ = false, cur = '';
      for (var i = 0; i < line.length; i++) {
        var ch = line[i];
        if (ch === '"') { inQ = !inQ; }
        else if (ch === ',' && !inQ) { result.push(cur.trim()); cur = ''; }
        else { cur += ch; }
      }
      result.push(cur.trim());
      return result;
    }
    var header = splitLine(lines[0]).map(function (h) { return h.replace(/"/g, '').trim(); });
    var rows = [];
    for (var i = 1; i < lines.length; i++) {
      if (!lines[i].trim()) continue;
      var cols = splitLine(lines[i]);
      var row = {};
      for (var j = 0; j < header.length; j++) row[header[j]] = (cols[j] || '').replace(/"/g, '').trim();
      rows.push(row);
    }
    return rows;
  }

  function normKey(s) {
    return ('' + (s || '')).toLowerCase()
      .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, ' ').trim();
  }

  /* todos os valores das colunas cujo nome contenha todas as palavras dadas.
     Devolve lista porque ha cabecalhos parecidos - "Produto Direcional: ID" e
     "Produto Direcional: Produto Direcional" casam com os mesmos termos. */
  function cols(row, palavras) {
    var out = [];
    for (var k in row) {
      if (!Object.prototype.hasOwnProperty.call(row, k)) continue;
      var nk = normKey(k), ok = true;
      for (var p = 0; p < palavras.length; p++) {
        if (nk.indexOf(palavras[p]) < 0) { ok = false; break; }
      }
      if (ok) out.push(row[k]);
    }
    return out;
  }
  function col(row, palavras) { return cols(row, palavras)[0] || ''; }

  /* o codigo da unidade (BL02-0804) esta na coluna "Identificador" e tambem
     embutido em "Produto Direcional"; pega o primeiro candidato que casar */
  function codigoUnidade(row) {
    var cands = [col(row, ['identificador'])].concat(cols(row, ['produto', 'direcional']));
    for (var i = 0; i < cands.length; i++) {
      var m = ('' + (cands[i] || '')).match(/BL\d+-\d+/);
      if (m) return m[0];
    }
    return '';
  }

  function parseBR(s) {
    if (!s) return 0;
    s = ('' + s).replace(/"/g, '').trim().replace(/[R$\s]/g, '');
    s = s.replace(/\./g, '').replace(',', '.');
    var v = parseFloat(s);
    return isFinite(v) ? v : 0;
  }

  /* ---------- titulo e sol da unidade ---------- */
  var TIPO_LABEL = {
    '1q': 'Studio 1Q', '2q-meio': '2Q C/S - Meio', '2q-ponta': '2Q C/S - Ponta',
    'terreo-meio': 'Terreo C/S C/ AP - Meio', 'terreo-ponta': 'Terreo C/S C/ AP - Ponta'
  };
  var NASCENTE_FINAIS = [3, 4, 5, 6];

  function classificaTipo(tipoPlanta, final) {
    var t = ('' + (tipoPlanta || '')).toLowerCase();
    /* usa o texto da planilha (Tipo Planta/Area) */
    var pontaFinais = [2, 3, 6, 7];
    var isPonta = pontaFinais.indexOf(final) >= 0;
    if (t.indexOf('1q') >= 0 || t.indexOf('adapt') >= 0 || t.indexOf('studio') >= 0) return '1q';
    if (t.indexOf('terreo') >= 0 || t.indexOf('jardim') >= 0 || t.indexOf('garden') >= 0) {
      return isPonta ? 'terreo-ponta' : 'terreo-meio';
    }
    return isPonta ? '2q-ponta' : '2q-meio';
  }

  /* ---------- carga do CSV ---------- */
  function carregar() {
    if (estado === 'carregando' || estado === 'ok') return;

    carregaPromocionais();

    try {
      var cache = sessionStorage.getItem(CACHE_KEY);
      if (cache) { linhas = JSON.parse(cache); estado = 'ok'; avisa(); return; }
    } catch (e) { /* sessionStorage indisponivel - segue para a rede */ }

    estado = 'carregando'; erroMsg = ''; avisa();

    var pronto = false;
    function ok(rows) {
      if (pronto) return; pronto = true;
      linhas = rows; estado = 'ok';
      try { sessionStorage.setItem(CACHE_KEY, JSON.stringify(rows)); } catch (e) { /* cota cheia */ }
      avisa();
    }
    function falha(msg) {
      if (pronto) return; pronto = true;
      estado = 'erro'; erroMsg = msg; avisa();
    }
    setTimeout(function () { falha('Tempo esgotado ao buscar a planilha.'); }, 20000);

    function tenta(url, proximo) {
      fetch(url)
        .then(function (r) { if (!r.ok) { proximo(); return; } return r.text(); })
        .then(function (text) {
          if (text === undefined) return;
          if (!text || text.trim().charAt(0) === '<') { proximo(); return; }
          var rows = parseCSV(text);
          if (!rows || !rows.length) { proximo(); return; }
          ok(rows);
        })
        .catch(function () { proximo(); });
    }

    tenta(window.SIM_SHEET_CSV_URL, function () {
      falha('Não foi possível acessar a planilha de unidades.');
    });
  }

  /* ---------- agrupamento por empreendimento ---------- */
  /* O bloco vem do proprio codigo da unidade (BL02-0804 -> BL02), e nao da
     coluna "Bloco/Etapa": alem de ser o que o corretor ve na tela, isso ja
     resolve as linhas agregadas (que trazem o cod. do produto no lugar do
     bloco) e descarta sozinho as vagas de garagem (VG-0010, sem prefixo BL). */
  function numBloco(codigo) { return parseInt(codigo.slice(2, codigo.indexOf('-')), 10); }

  /* valor exato da coluna pelo nome (com um fallback tolerante a espacos/caixa);
     os nomes batem com o cabecalho real da planilha, ja conferidos em producao */
  function valorExato(row, nome) {
    if (Object.prototype.hasOwnProperty.call(row, nome)) return row[nome];
    var alvo = nome.toLowerCase();
    for (var k in row) if (k.toLowerCase().trim() === alvo) return row[k];
    return '';
  }

  function porEmpreendimento(emp) {
    var vazio = { blocos: [], unidades: {}, total: 0, detalhes: {} };
    if (!emp || !linhas) return vazio;

    var querem = [normKey(emp.sheetName)];
    if (emp.sheetNamesExtra) {
      for (var e = 0; e < emp.sheetNamesExtra.length; e++) querem.push(normKey(emp.sheetNamesExtra[e]));
    }
    /* unidades promocionais so existem em Ribeirao Preto */
    var ehRP = emp.cidade === 'Ribeirão Preto';

    var porBloco = {}, detalhes = {}, total = 0;
    for (var i = 0; i < linhas.length; i++) {
      var r = linhas[i];

      if (querem.indexOf(normKey(col(r, ['nome', 'empreendimento']))) < 0) continue;
      /* so unidades vendaveis entram no seletor: Disponivel ou Mirror. Reservada / Reservada aguardando revisao ficam de fora. */
      var statusU = normKey(col(r, ['status', 'unidade']));
      if (statusU !== 'disponivel' && statusU !== 'mirror') continue;

      var codigo = codigoUnidade(r);
      if (!codigo) continue;                  /* vagas de garagem e afins */
      var n = numBloco(codigo);
      if (emp.torresVisiveis && emp.torresVisiveis.indexOf(n) < 0) continue;

      var chave = codigo.slice(0, codigo.indexOf('-'));   /* BL02 */
      if (!porBloco[chave]) porBloco[chave] = { n: n, lista: [] };
      if (porBloco[chave].lista.indexOf(codigo) < 0) { porBloco[chave].lista.push(codigo); total++; }

      /* valores da unidade - mesmas contas */
      var valorFinal  = parseBR(valorExato(r, 'Valor Final Com Kit'));
      var ba          = parseBR(valorExato(r, 'B.A. da Unidade'));
      var folgaCampG  = parseBR(valorExato(r, 'Folga Campanha G'));
      var folgaTabela = parseBR(valorExato(r, 'Folga de Tabela'));
      /* "Folga Volta ao Caixa" = premio; coluna propria */
      var folgaVoltaCx = parseBR(col(r, ['folga', 'volta', 'caixa']) || col(r, ['folga', 'volta']));
      var vcm         = parseBR(valorExato(r, 'Valor Comercial Mínimo'));
      var avaliacao   = parseBR(valorExato(r, 'Valor de Avaliação Bancária'));
      var areaPriv    = Math.round(parseBR(valorExato(r, 'Área privativa total')));
      var vagasRaw    = valorExato(r, 'Quantidade de vagas');
      var vagas       = (vagasRaw === '' || vagasRaw == null) ? null : Math.round(parseBR(vagasRaw));
      var final       = parseInt(valorExato(r, 'Final unidade') || '0', 10);
      var andar       = parseInt(valorExato(r, 'Andar') || '0', 10);
      var tipoPlanta  = valorExato(r, 'Tipo Planta/Área') || '';

      var tabelaDireta = valorFinal - ba - folgaCampG;
      var associativo  = tabelaDireta - folgaTabela;
      /* unidade promocional (marcada em /promocionais): exibe o Valor Comercial
         Minimo no lugar do associativo, e VCM + Folga de Tabela na tabela direta.
         Fail-safe: VCM ausente/incoerente cai nos valores normais. */
      var promocional = ehRP && !!PROMO_SET &&
                        PROMO_SET[chavePromo(emp.sheetName, codigo)] === true &&
                        vcm > 0 && vcm < associativo;
      var assocExibido  = promocional ? vcm : associativo;
      var tabelaExibida = promocional ? (vcm + folgaTabela) : tabelaDireta;
      var tipo = classificaTipo(tipoPlanta, final);

      detalhes[codigo] = {
        tipoLabel: TIPO_LABEL[tipo],
        sol: NASCENTE_FINAIS.indexOf(final) >= 0 ? 'Nascente' : 'Poente',
        areaPriv: areaPriv, vagas: vagas, avaliacao: avaliacao,
        tabelaDireta: tabelaExibida, associativo: assocExibido, promocional: promocional,
        /* valor sem premio: promocional usa o VCM */
        associativoSemPremio: promocional ? vcm : associativo - folgaVoltaCx,
        /* "Valor Final Com Kit": valor cheio do imovel (o PDF do Match mostra o desconto ate a venda) */
        valorFinal: valorFinal
      };
    }

    var blocos = Object.keys(porBloco).sort(function (a, b) { return porBloco[a].n - porBloco[b].n; });
    var unidades = {};
    for (var b = 0; b < blocos.length; b++) {
      unidades[blocos[b]] = porBloco[blocos[b]].lista.sort();
    }
    return {
      blocos: blocos.map(function (k) {
        return { id: k, label: 'Torre ' + porBloco[k].n, qtd: porBloco[k].lista.length };
      }),
      unidades: unidades,
      total: total,
      detalhes: detalhes
    };
  }

  return {
    carregar: carregar,
    porEmpreendimento: porEmpreendimento,
    aoMudar: function (fn) { ouvintes.push(fn); fn(estado, erroMsg); },
    estado: function () { return estado; },
    erro: function () { return erroMsg; },
    normKey: normKey
  };
})();
