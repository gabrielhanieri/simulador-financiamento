/* Regras de apoio ao motor: leitura de valores, subsidio e trava da Faixa 3. */
(function (raiz) {
  'use strict';

  function numero(str) {
    if (typeof str === 'number') return str;
    var s = (str || '').toString().replace(/[^\d.,-]/g, '');
    if (!s) return 0;
    var temVirg = s.indexOf(',') >= 0, temPonto = s.indexOf('.') >= 0;
    if (temVirg) { s = s.replace(/\./g, '').replace(',', '.'); }
    else if (temPonto) {
      var partes = s.split('.');
      if (partes.length > 2 || (partes.length === 2 && partes[1].length === 3)) s = partes.join('');
    }
    var v = parseFloat(s);
    return isFinite(v) ? v : 0;
  }

  /* possui imovel ou renda acima do MCMV -> SBPE */
  function ehSbpe(cliente) { return cliente.possuiImovel === true || cliente.renda > 13000; }

  /* avaliacao > 400 mil vendida abaixo de 400 mil para renda de Faixa 3: o imovel
     trava em 400 mil e a CAIXA simula na Faixa 3 */
  var TETO_F3 = 400000, RENDA_MAX_F3 = 9600;
  function travaFaixa3(cliente, un) {
    return !ehSbpe(cliente) && cliente.renda <= RENDA_MAX_F3 && un.avaliacao > TETO_F3 && un.associativo < TETO_F3;
  }

  /* renda que pode ter subsidio (Faixas 1 e 2 ate R$ 4.000, sem imovel na cidade) */
  var RENDA_MAX_SUBSIDIO = 4000;
  function temSubsidio(renda, possuiImovel) { return renda > 0 && renda <= RENDA_MAX_SUBSIDIO && possuiImovel !== true; }

  var api = { numero: numero, temSubsidio: temSubsidio, travaFaixa3: travaFaixa3, TETO_F3: TETO_F3 };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else raiz.Match = api;
})(typeof window !== 'undefined' ? window : this);
