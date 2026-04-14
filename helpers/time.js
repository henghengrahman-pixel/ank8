function getJakartaNow() {
  const now = new Date();
  return new Date(
    now.toLocaleString('en-US', { timeZone: 'Asia/Jakarta' })
  );
}

function pad(value) {
  return String(value).padStart(2, '0');
}

function getTodayWIBDate() {
  const now = getJakartaNow();
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
}

function formatDisplayDate(input) {
  if (!input) return '-';

  const date = new Date(input);
  if (Number.isNaN(date.getTime())) return input;

  return date.toLocaleDateString('id-ID', {
    timeZone: 'Asia/Jakarta',
    weekday: 'long',
    day: '2-digit',
    month: 'long',
    year: 'numeric'
  });
}

function getDayNameIndonesia(input) {
  if (!input) return '-';

  const date = new Date(input);
  if (Number.isNaN(date.getTime())) return '-';

  return date.toLocaleDateString('id-ID', {
    timeZone: 'Asia/Jakarta',
    weekday: 'long'
  });
}

module.exports = {
  getJakartaNow,
  getTodayWIBDate,
  formatDisplayDate,
  getDayNameIndonesia
};
