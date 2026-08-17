const assert = require('assert');
const {
  parseKakakTogelHtml,
  canonicalName,
  matchSourceRow
} = require('../helpers/autoResults');

const html = `
<div class="result-data accordion-item">
  <button class="result accordion-button" type="button">
    <div class="pasaran">CAMBODIA&nbsp;</div>
    <div class="keluaran">2679</div>
    <div class="tanggal">17-08-2026</div>
  </button>
  <div class="accordion-collapse">
    <div class="result"><div class="pasaran"></div><div class="keluaran">6852</div><div class="tanggal">16-08-2026</div></div>
  </div>
</div>
<div class="result-data accordion-item"><button class="result accordion-button"><div class="pasaran">CHINA</div><div class="keluaran">0085</div><div class="tanggal">17-08-2026</div></button></div>
<div class="result-data accordion-item"><button class="result accordion-button"><div class="pasaran">SYDNEY</div><div class="keluaran">0709</div><div class="tanggal">17-08-2026</div></button></div>
<div class="result-data accordion-item"><button class="result accordion-button"><div class="pasaran">SYDNEY LOTTO</div><div class="keluaran">1982</div><div class="tanggal">17-08-2026</div></button></div>
<div class="result-data accordion-item"><button class="result accordion-button"><div class="pasaran">HONGKONG</div><div class="keluaran">0747</div><div class="tanggal">16-08-2026</div></button></div>
<div class="result-data accordion-item"><button class="result accordion-button"><div class="pasaran">HONGKONG LOTTO</div><div class="keluaran">5594</div><div class="tanggal">16-08-2026</div></button></div>
`;

const rows = parseKakakTogelHtml(html);
assert.strictEqual(rows.length, 6, 'harus hanya membaca tombol result utama');
assert.strictEqual(rows.find(x => x.marketName === 'CAMBODIA').prize1, '2679');
assert.strictEqual(rows.find(x => x.marketName === 'CHINA').prize1, '0085');
assert.strictEqual(rows.find(x => x.marketName === 'SYDNEY').prize1, '0709');
assert.ok(!rows.some(x => x.prize1 === '6852'), 'history child tidak boleh dianggap result utama');
assert.strictEqual(canonicalName('SRI LANKA'), 'SRILANKA');
assert.strictEqual(canonicalName('CAROLINA DAY'), 'CAROLINADAY');

assert.strictEqual(matchSourceRow({ name: 'Sydney', slug: 'sydney' }, rows).prize1, '0709');
assert.strictEqual(matchSourceRow({ name: 'Sydney Lotto', slug: 'sydney-lotto' }, rows).prize1, '1982');
assert.strictEqual(matchSourceRow({ name: 'Hongkong', slug: 'hongkong' }, rows).prize1, '0747');
assert.strictEqual(matchSourceRow({ name: 'Hongkong Lotto', slug: 'hongkong-lotto' }, rows).prize1, '5594');

console.log('AUTO RESULT TEST PASS');
