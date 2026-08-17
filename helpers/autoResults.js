const { getSettings, saveSettings, getMarkets, getPaths, readJson, writeJson } = require('./data');
const { saveDailyResult, getLatestResultByMarket } = require('./results');

const DEFAULT_CONFIG = {
  enabled: false,
  sourceUrl: 'https://kakaktogelgroup.com/',
  intervalSeconds: 20,
  timeoutSeconds: 15
};

const MAX_LOGS = 80;
let timer = null;
let running = false;

function decodeHtml(text) {
  return String(text || '')
    .replace(/&nbsp;?/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/<[^>]*>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function normalizeName(value) {
  return decodeHtml(value)
    .toUpperCase()
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^A-Z0-9]+/g, '')
    .trim();
}

const ALIAS_TO_CANONICAL = new Map();
[
  ['SRILANKA', 'SRILANKA'], ['SRILANKAPOOL', 'SRILANKA'], ['SRILANKA', 'SRILANKA'],
  ['CAMBODIA', 'CAMBODIA'], ['CAMBODIAPOOL', 'CAMBODIA'],
  ['CHINA', 'CHINA'], ['CHINAPOOL', 'CHINA'],
  ['SINGAPORE', 'SINGAPORE'], ['SINGAPURA', 'SINGAPORE'], ['SINGAPOREPOOL', 'SINGAPORE'],
  ['TAIWAN', 'TAIWAN'], ['TAIWANPOOL', 'TAIWAN'],
  ['VEGAS', 'VEGAS'], ['VEGASPOOL', 'VEGAS'],
  ['HONGKONG', 'HONGKONG'], ['HONGKONGPOOL', 'HONGKONG'], ['HONGKONGLOTTO', 'HONGKONG'],
  ['ANDORRA', 'ANDORRA'], ['ANDORRAPOOL', 'ANDORRA'],
  ['CAROLINADAY', 'CAROLINADAY'], ['CAROLINADAYPOOL', 'CAROLINADAY'],
  ['CAROLINAEVE', 'CAROLINAEVE'], ['CAROLINAEVEPOOL', 'CAROLINAEVE'],
  ['FLORIDAMID', 'FLORIDAMID'], ['FLORIDAMIDPOOL', 'FLORIDAMID'],
  ['FLORIDAEVE', 'FLORIDAEVE'], ['FLORIDAEVEPOOL', 'FLORIDAEVE'],
  ['SYDNEY', 'SYDNEY'], ['SYDNEYPOOL', 'SYDNEY'], ['SYDNEYLOTTO', 'SYDNEY'],
  ['VIETNAM', 'VIETNAM'], ['VIETNAMPOOL', 'VIETNAM'],
  ['MALAYSIA', 'MALAYSIA'], ['MALAYSIAPOOL', 'MALAYSIA'],
  ['HKSIANG', 'HKSIANG'],
  ['TOTOWUHAN', 'TOTOWUHAN']
].forEach(([alias, canonical]) => ALIAS_TO_CANONICAL.set(alias, canonical));

function canonicalName(value) {
  const normalized = normalizeName(value);
  return ALIAS_TO_CANONICAL.get(normalized) || normalized;
}

function parseSourceDate(value) {
  const raw = decodeHtml(value);
  let m = raw.match(/^(\d{1,2})[-\/]([0-1]?\d)[-\/](\d{4})$/);
  if (m) {
    const dd = m[1].padStart(2, '0');
    const mm = m[2].padStart(2, '0');
    return `${m[3]}-${mm}-${dd}`;
  }
  m = raw.match(/^(\d{4})[-\/]([0-1]?\d)[-\/](\d{1,2})$/);
  if (m) return `${m[1]}-${m[2].padStart(2, '0')}-${m[3].padStart(2, '0')}`;
  return '';
}

function parseKakakTogelHtml(html) {
  const source = String(html || '');
  const rows = [];

  // Hanya baca tombol result utama. History di accordion memakai <div class="result"> tanpa button.
  const buttonRegex = /<button\b[^>]*class=["'][^"']*\bresult\b[^"']*\baccordion-button\b[^"']*["'][^>]*>([\s\S]*?)<\/button>/gi;
  let match;
  while ((match = buttonRegex.exec(source))) {
    const block = match[1];
    const marketMatch = block.match(/<div\b[^>]*class=["'][^"']*\bpasaran\b[^"']*["'][^>]*>([\s\S]*?)<\/div>/i);
    const numberMatch = block.match(/<div\b[^>]*class=["'][^"']*\bkeluaran\b[^"']*["'][^>]*>([\s\S]*?)<\/div>/i);
    const dateMatch = block.match(/<div\b[^>]*class=["'][^"']*\btanggal\b[^"']*["'][^>]*>([\s\S]*?)<\/div>/i);
    if (!marketMatch || !numberMatch || !dateMatch) continue;

    const marketName = decodeHtml(marketMatch[1]);
    const rawNumber = decodeHtml(numberMatch[1]);
    const date = parseSourceDate(dateMatch[1]);

    // Result harus 4 atau 5 digit murni. String dipertahankan agar 0085/0709 tidak hilang.
    if (!/^\d{4,5}$/.test(rawNumber) || !date || !marketName) continue;

    rows.push({
      marketName,
      canonical: canonicalName(marketName),
      prize1: rawNumber,
      date,
      sourceDate: decodeHtml(dateMatch[1])
    });
  }

  return rows;
}

function getConfig() {
  const settings = getSettings();
  return { ...DEFAULT_CONFIG, ...(settings.autoResult || {}) };
}

function saveConfig(input) {
  const settings = getSettings();
  const current = getConfig();
  const enabled = input.enabled === true || input.enabled === 'true' || input.enabled === '1' || input.enabled === 'on';
  const sourceUrl = String(input.sourceUrl || current.sourceUrl || '').trim();
  const intervalSeconds = Math.max(10, Math.min(3600, Number(input.intervalSeconds) || current.intervalSeconds));
  const timeoutSeconds = Math.max(5, Math.min(60, Number(input.timeoutSeconds) || current.timeoutSeconds));

  if (!/^https?:\/\//i.test(sourceUrl)) throw new Error('URL sumber harus diawali http:// atau https://');

  const next = { enabled, sourceUrl, intervalSeconds, timeoutSeconds };
  saveSettings({ ...settings, autoResult: next });
  restartScheduler();
  return next;
}

function stateFile() {
  return getPaths().autoResultState;
}

function getState() {
  return readJson(stateFile(), { lastScanAt: null, lastSuccessAt: null, lastError: null, lastFound: 0, lastSaved: 0, logs: [] });
}

function saveState(patch) {
  const current = getState();
  const next = { ...current, ...patch };
  next.logs = Array.isArray(next.logs) ? next.logs.slice(0, MAX_LOGS) : [];
  writeJson(stateFile(), next);
  return next;
}

function addLog(message, level = 'info') {
  const state = getState();
  const logs = [{ at: new Date().toISOString(), level, message }, ...(state.logs || [])].slice(0, MAX_LOGS);
  saveState({ logs });
}

function marketCanonicalCandidates(market) {
  const values = [market.sourceName, market.name, market.slug].filter(Boolean);
  return [...new Set(values.map(canonicalName).filter(Boolean))];
}

function matchSourceRow(market, rows) {
  const rawCandidates = [market.sourceName, market.name, market.slug].filter(Boolean);
  const normalizedCandidates = [...new Set(rawCandidates.map(normalizeName).filter(Boolean))];

  // Prioritas 1: nama sumber exact setelah normalisasi. Ini membedakan SYDNEY vs SYDNEY LOTTO
  // dan HONGKONG vs HONGKONG LOTTO walaupun keduanya punya alias canonical yang sama.
  const exact = rows.find((row) => normalizedCandidates.includes(normalizeName(row.marketName)));
  if (exact) return exact;

  // Prioritas 2: alias canonical yang eksplisit. Tidak ada fuzzy/contains matching.
  const candidates = marketCanonicalCandidates(market);
  return rows.find((row) => candidates.includes(row.canonical)) || null;
}

async function fetchText(url, timeoutSeconds) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutSeconds * 1000);
  try {
    const response = await fetch(url, {
      signal: controller.signal,
      redirect: 'follow',
      headers: {
        'user-agent': 'Mozilla/5.0 (compatible; AutoResultBot/1.0)',
        'accept': 'text/html,application/xhtml+xml'
      }
    });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    return await response.text();
  } finally {
    clearTimeout(timeout);
  }
}

async function scanNow(options = {}) {
  if (running) return { ok: false, skipped: true, message: 'Scan masih berjalan.' };
  running = true;
  const config = getConfig();
  const startedAt = new Date().toISOString();

  try {
    const html = options.html != null ? String(options.html) : await fetchText(config.sourceUrl, config.timeoutSeconds);
    const rows = parseKakakTogelHtml(html);
    if (!rows.length) throw new Error('Result tidak ditemukan pada HTML sumber.');

    let saved = 0;
    let unchanged = 0;
    const matched = [];

    for (const market of getMarkets()) {
      const row = matchSourceRow(market, rows);
      if (!row) continue;

      matched.push({ slug: market.slug, market: market.name, source: row.marketName, prize1: row.prize1, date: row.date });
      const latest = getLatestResultByMarket(market.slug);
      const same = latest && latest.date === row.date && String(latest.prize1) === row.prize1;
      if (same) {
        unchanged += 1;
        continue;
      }

      saveDailyResult(market.slug, {
        date: row.date,
        prize1: row.prize1,
        resultTime: market.resultTime || '00:00',
        source: 'auto',
        sourceMarket: row.marketName,
        sourceUrl: config.sourceUrl
      });
      saved += 1;
    }

    const finishedAt = new Date().toISOString();
    saveState({
      lastScanAt: startedAt,
      lastSuccessAt: finishedAt,
      lastError: null,
      lastFound: rows.length,
      lastSaved: saved,
      lastMatched: matched
    });
    addLog(`Scan OK: ${rows.length} result sumber, ${matched.length} market cocok, ${saved} disimpan, ${unchanged} tidak berubah.`);
    return { ok: true, found: rows.length, matched: matched.length, saved, unchanged, rows, matches: matched };
  } catch (error) {
    const message = error && error.name === 'AbortError' ? 'Timeout saat membuka URL sumber.' : String(error.message || error);
    saveState({ lastScanAt: startedAt, lastError: message, lastSaved: 0 });
    addLog(`Scan ERROR: ${message}`, 'error');
    return { ok: false, error: message };
  } finally {
    running = false;
  }
}

function stopScheduler() {
  if (timer) clearInterval(timer);
  timer = null;
}

function startScheduler() {
  stopScheduler();
  const config = getConfig();
  if (!config.enabled) return;
  const ms = Math.max(10, Number(config.intervalSeconds) || 20) * 1000;
  timer = setInterval(() => scanNow().catch((error) => console.error('Auto result scan error:', error)), ms);
  if (timer.unref) timer.unref();
  setTimeout(() => scanNow().catch((error) => console.error('Initial auto result scan error:', error)), 1500).unref?.();
}

function restartScheduler() {
  startScheduler();
}

module.exports = {
  DEFAULT_CONFIG,
  decodeHtml,
  normalizeName,
  canonicalName,
  parseSourceDate,
  parseKakakTogelHtml,
  getConfig,
  saveConfig,
  getState,
  scanNow,
  matchSourceRow,
  startScheduler,
  stopScheduler,
  restartScheduler
};
