const {
  getMarkets,
  getResultsFile,
  readJson,
  writeJson,
  getMeta,
  saveMeta
} = require('./data');

const { getTodayWIBDate, getDayNameIndonesia } = require('./time');

function normalizePrize1(value) {
  return String(value || '')
    .replace(/\D/g, '')
    .slice(0, 5);
}

function makeEmptyPayload() {
  return {
    current: null,
    latest: null,
    history: []
  };
}

function readResultPayload(slug) {
  const file = getResultsFile(slug);
  const payload = readJson(file, makeEmptyPayload());

  return {
    current: payload && typeof payload === 'object' ? payload.current || null : null,
    latest: payload && typeof payload === 'object' ? payload.latest || null : null,
    history: payload && Array.isArray(payload.history) ? payload.history : []
  };
}

function sortHistory(history) {
  return [...history].sort((a, b) => {
    const dateCompare = new Date(b.date) - new Date(a.date);
    if (dateCompare !== 0) return dateCompare;
    return String(b.createdAt || '').localeCompare(String(a.createdAt || ''));
  });
}

function trimHistory(history) {
  return sortHistory(history).slice(0, 14);
}

function writeResultPayload(slug, payload) {
  const file = getResultsFile(slug);

  writeJson(file, {
    current: payload.current || null,
    latest: payload.latest || null,
    history: trimHistory(Array.isArray(payload.history) ? payload.history : [])
  });
}

function getLatestResultByMarket(slug) {
  const payload = readResultPayload(slug);
  return payload.latest || null;
}

function getCurrentResultByMarket(slug) {
  const payload = readResultPayload(slug);
  return payload.current || null;
}

function getResultHistoryByMarket(slug) {
  const payload = readResultPayload(slug);
  return trimHistory(payload.history || []);
}

function saveDailyResult(slug, payload) {
  const today = getTodayWIBDate();
  const resultPayload = readResultPayload(slug);
  const date = payload.date || today;
  const prize1 = normalizePrize1(payload.prize1);

  const entry = {
    id: payload.id || `${slug}-${date}`,
    date,
    dayName: payload.dayName || getDayNameIndonesia(date),
    prize1,
    resultTime: payload.resultTime || '00:00',
    createdAt: new Date().toISOString()
  };

  if (date === today) {
    resultPayload.current = entry;
    resultPayload.latest = entry;
  } else {
    resultPayload.history = (resultPayload.history || []).filter((item) => item.date !== date);
    resultPayload.history.unshift(entry);
    resultPayload.history = trimHistory(resultPayload.history);
  }

  writeResultPayload(slug, resultPayload);
  return entry;
}

function ensureDailyReset() {
  const today = getTodayWIBDate();
  const meta = getMeta();

  if (meta.lastResultResetDate === today) {
    return;
  }

  getMarkets().forEach((market) => {
    const payload = readResultPayload(market.slug);

    if (payload.current && payload.current.date !== today) {
      payload.history = (payload.history || []).filter(
        (item) => item.date !== payload.current.date
      );

      payload.history.unshift(payload.current);
      payload.history = trimHistory(payload.history);
      payload.current = null;
    }

    writeResultPayload(market.slug, payload);
  });

  meta.lastResultResetDate = today;
  saveMeta(meta);
}

module.exports = {
  getLatestResultByMarket,
  getCurrentResultByMarket,
  getResultHistoryByMarket,
  saveDailyResult,
  ensureDailyReset
};
