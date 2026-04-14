const {
  getSettings,
  getSliders,
  getMarkets,
  getPredictionsFile,
  readJson
} = require('../helpers/data');

const {
  getLatestResultByMarket,
  getResultHistoryByMarket
} = require('../helpers/results');

const { formatDisplayDate, getTodayWIBDate } = require('../helpers/time');

function getPredictionsMap() {
  const payload = readJson(getPredictionsFile(), { markets: {} });
  return payload && payload.markets && typeof payload.markets === 'object'
    ? payload.markets
    : {};
}

function buildHomeMarkets() {
  return getMarkets().map((market) => ({
    ...market,
    latestResult: getLatestResultByMarket(market.slug)
  }));
}

function home(req, res) {
  const sliders = getSliders().filter((item) => item.active !== false);
  const markets = buildHomeMarkets();

  res.render('pages/home', {
    pageTitle: 'Home',
    settings: getSettings(),
    sliders,
    markets,
    formatDisplayDate
  });
}

function predictions(req, res) {
  const predictionsMap = getPredictionsMap();
  const sliders = getSliders().filter((item) => item.active !== false);

  const markets = getMarkets().map((market) => {
    const predictionPayload = predictionsMap[market.slug] || {
      current: null,
      history: []
    };

    return {
      ...market,
      prediction: predictionPayload.current || null
    };
  });

  res.render('pages/predictions', {
    pageTitle: 'Prediksi',
    settings: getSettings(),
    sliders,
    markets,
    today: getTodayWIBDate(),
    formatDisplayDate
  });
}

function predictionDetail(req, res) {
  const market = getMarkets().find((item) => item.slug === req.params.slug);

  if (!market) {
    return res.status(404).render('pages/404', {
      pageTitle: 'Tidak ditemukan',
      settings: getSettings()
    });
  }

  const predictionsMap = getPredictionsMap();
  const sliders = getSliders().filter((item) => item.active !== false);

  const predictionPayload = predictionsMap[market.slug] || {
    current: null,
    history: []
  };

  const selectedDate = req.query.date;

  let current = predictionPayload.current || null;

  // 🔥 FIX: klik history
  if (selectedDate) {
    const found = (predictionPayload.history || []).find(
      (item) => item.date === selectedDate
    );

    if (found) {
      current = found;
    }
  }

  res.render('pages/prediction-detail', {
    pageTitle: `Prediksi ${market.name}`,
    settings: getSettings(),
    sliders,
    market,
    current,
    history: Array.isArray(predictionPayload.history)
      ? predictionPayload.history
      : [],
    formatDisplayDate
  });
}

function resultDetail(req, res) {
  const market = getMarkets().find((item) => item.slug === req.params.slug);

  if (!market) {
    return res.status(404).render('pages/404', {
      pageTitle: 'Tidak ditemukan',
      settings: getSettings()
    });
  }

  const history = getResultHistoryByMarket(market.slug);
  const sliders = getSliders().filter((item) => item.active !== false);

  res.render('pages/result-detail', {
    pageTitle: `Result ${market.name}`,
    settings: getSettings(),
    sliders,
    market,
    history: Array.isArray(history) ? history : [],
    formatDisplayDate
  });
}

module.exports = {
  home,
  predictions,
  predictionDetail,
  resultDetail
};
