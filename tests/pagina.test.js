const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');

const raiz = path.join(__dirname, '..');
const ler = (f) => fs.readFileSync(path.join(raiz, f), 'utf8');

test('todos os arquivos locais citados pela página e pelos scripts existem', () => {
  const fontes = ['index.html', ...fs.readdirSync(path.join(raiz, 'assets')).filter((f) => f.endsWith('.js')).map((f) => 'assets/' + f)];
  for (const f of fontes) {
    for (const [ref] of ler(f).matchAll(/(?:assets|data)\/[\w./@-]+\.(?:js|css|svg|png|csv)/g)) {
      assert.ok(fs.existsSync(path.join(raiz, ref)), f + ' -> ' + ref);
    }
  }
});

test('a página não leva a telas que não fazem parte do pacote', () => {
  for (const f of ['index.html', 'assets/financiamento-app.js', 'assets/financiamento.js']) {
    assert.ok(!/(simulador-associativo|match-unidades)[\w-]*\.html/.test(ler(f)), f);
  }
});
