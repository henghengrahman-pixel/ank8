const {
  getSettings,
  saveSettings,
  getSliders,
  saveSliders,
  getMarkets,
  saveMarkets,
  getAdmins,
  saveAdmins
} = require('../helpers/data');

const {
  getLatestResultByMarket,
  getCurrentResultByMarket,
  getResultHistoryByMarket,
  saveDailyResult
} = require('../helpers/results');

const { getTodayWIBDate } = require('../helpers/time');

function loginPage(req, res) {
  if (req.session.admin) {
    return res.redirect('/admin');
  }

  res.render('admin/login', {
    pageTitle: 'Admin Login',
    settings: getSettings(),
    error: null
  });
}

function login(req, res) {
  const { id, password } = req.body;
  const extraAdmins = getAdmins();

  const envAdminId = (process.env.ADMIN_ID || '').trim();
  const envAdminPassword = (process.env.ADMIN_PASSWORD || '').trim();

  const inputId = (id || '').trim();
  const inputPassword = (password || '').trim();

  const envMatch =
    inputId === envAdminId &&
    inputPassword === envAdminPassword;

  const extraMatch = extraAdmins.some((item) => {
    return (
      String(item.adminId || '').trim() === inputId &&
      String(item.adminPassword || '').trim() === inputPassword
    );
  });

  if (!envMatch && !extraMatch) {
    return res.status(401).render('admin/login', {
      pageTitle: 'Admin Login',
      settings: getSettings(),
      error: 'ID atau password salah.'
    });
  }

  req.session.admin = {
    id: inputId,
    source: envMatch ? 'env' : 'json'
  };

  return res.redirect('/admin');
}

function logout(req, res) {
  req.session.destroy(() => {
    res.redirect('/admin/login');
  });
}

function dashboard(req, res) {
  const sliders = getSliders();

  const markets = getMarkets().map((market) => ({
    ...market,
    latestResult: getLatestResultByMarket(market.slug)
  }));

  res.render('admin/dashboard', {
    pageTitle: 'Dashboard',
    settings: getSettings(),
    sliders,
    markets,
    today: getTodayWIBDate()
  });
}

function settingsPage(req, res) {
  res.render('admin/settings', {
    pageTitle: 'Web Settings',
    settings: getSettings()
  });
}

function saveSettingsPage(req, res) {
  const current = getSettings();

  saveSettings({
    ...current,
    ...req.body
  });

  res.redirect('/admin/settings');
}

function slidersPage(req, res) {
  res.render('admin/sliders', {
    pageTitle: 'Slider Banner',
    settings: getSettings(),
    sliders: getSliders()
  });
}

function saveSlidersPage(req, res) {
  const sliders = getSliders();
  const { action, id, imageUrl, title } = req.body;

  if (action === 'create') {
    sliders.unshift({
      id: `s-${Date.now()}`,
      imageUrl,
      title,
      active: true
    });
  }

  if (action === 'update') {
    const index = sliders.findIndex((item) => item.id === id);
    if (index >= 0) {
      sliders[index] = {
        ...sliders[index],
        imageUrl,
        title
      };
    }
  }

  if (action === 'delete') {
    saveSliders(sliders.filter((item) => item.id !== id));
    return res.redirect('/admin/sliders');
  }

  saveSliders(sliders);
  res.redirect('/admin/sliders');
}

function marketsPage(req, res) {
  res.render('admin/markets', {
    pageTitle: 'Daftar Pasaran',
    settings: getSettings(),
    markets: getMarkets()
  });
}

function saveMarketsPage(req, res) {
  const markets = getMarkets();
  const {
    action,
    id,
    name,
    slug,
    liveDrawLink,
    logoUrl,
    closeTime,
    resultTime,
    description
  } = req.body;

  if (action === 'create') {
    markets.unshift({
      id: `m-${Date.now()}`,
      name,
      slug,
      liveDrawLink,
      logoUrl,
      closeTime,
      resultTime,
      description
    });
  }

  if (action === 'update') {
    const index = markets.findIndex((item) => item.id === id);
    if (index >= 0) {
      markets[index] = {
        ...markets[index],
        name,
        slug,
        liveDrawLink,
        logoUrl,
        closeTime,
        resultTime,
        description
      };
    }
  }

  if (action === 'delete') {
    saveMarkets(markets.filter((item) => item.id !== id));
    return res.redirect('/admin/markets');
  }

  saveMarkets(markets);
  res.redirect('/admin/markets');
}

function resultsPage(req, res) {
  const today = getTodayWIBDate();

  let markets = getMarkets().map((market) => {
    const currentResult = getCurrentResultByMarket(market.slug);
    const history = getResultHistoryByMarket(market.slug);

    const hasTodayResult =
      currentResult && currentResult.date === today;

    return {
      ...market,
      currentResult: currentResult || null,
      history: Array.isArray(history) ? history : [],
      hasTodayResult: !!hasTodayResult
    };
  });

  markets = markets.sort((a, b) => {
    if (a.hasTodayResult === b.hasTodayResult) return 0;
    return a.hasTodayResult ? 1 : -1;
  });

  const allHistory = [];

  getMarkets().forEach((market) => {
    const history = getResultHistoryByMarket(market.slug) || [];

    history.forEach((item) => {
      allHistory.push({
        marketName: market.name,
        marketSlug: market.slug,
        marketLogoUrl: market.logoUrl,
        ...item
      });
    });
  });

  allHistory.sort((a, b) => {
    const byDate = new Date(b.date) - new Date(a.date);
    if (byDate !== 0) return byDate;
    return String(b.createdAt || '').localeCompare(String(a.createdAt || ''));
  });

  res.render('admin/results', {
    pageTitle: 'Result Pasaran',
    settings: getSettings(),
    markets,
    today,
    allHistory
  });
}

function saveResultsPage(req, res) {
  const { slug, date, prize1, resultTime } = req.body;

  saveDailyResult(slug, {
    date,
    prize1,
    resultTime
  });

  res.redirect('/admin/results');
}

function adminsPage(req, res) {
  res.render('admin/admins', {
    pageTitle: 'Tambah Admin',
    settings: getSettings(),
    admins: getAdmins()
  });
}

function saveAdminsPage(req, res) {
  const admins = getAdmins();
  const { action, id, adminId, adminPassword } = req.body;

  if (action === 'create') {
    admins.unshift({
      id: `a-${Date.now()}`,
      adminId,
      adminPassword
    });
  }

  if (action === 'delete') {
    saveAdmins(admins.filter((item) => item.id !== id));
    return res.redirect('/admin/admins');
  }

  saveAdmins(admins);
  res.redirect('/admin/admins');
}

module.exports = {
  loginPage,
  login,
  logout,
  dashboard,
  settingsPage,
  saveSettingsPage,
  slidersPage,
  saveSlidersPage,
  marketsPage,
  saveMarketsPage,
  resultsPage,
  saveResultsPage,
  adminsPage,
  saveAdminsPage
};
