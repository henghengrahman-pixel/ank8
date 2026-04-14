(function () {
  const slides = document.querySelectorAll('[data-slider] .slide');
  if (slides.length > 1) {
    let current = 0;
    setInterval(() => {
      slides[current].classList.remove('active');
      current = (current + 1) % slides.length;
      slides[current].classList.add('active');
    }, 3500);
  }

  const modal = document.getElementById('livedrawModal');
  const modalLogo = document.getElementById('modalLogo');
  const modalTitle = document.getElementById('modalTitle');
  const modalDate = document.getElementById('modalDate');
  const modalResult = document.getElementById('modalResult');

  function closeModal() {
    if (!modal) return;
    modal.classList.remove('show');
    modal.setAttribute('aria-hidden', 'true');
  }

  document.querySelectorAll('.js-livedraw').forEach((button) => {
    button.addEventListener('click', () => {
      if (!modal) return;
      modalLogo.src = button.dataset.logo || '';
      modalTitle.textContent = `Livedraw ${button.dataset.name || ''}`;
      modalDate.textContent = button.dataset.date || '-';
      modalResult.textContent = button.dataset.result || '----';
      modal.classList.add('show');
      modal.setAttribute('aria-hidden', 'false');
    });
  });

  document.querySelectorAll('[data-close-modal]').forEach((item) => item.addEventListener('click', closeModal));
  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') closeModal();
  });

  const marketFilter = document.getElementById('marketFilter');
  const predictionList = document.getElementById('predictionList');
  if (marketFilter && predictionList) {
    marketFilter.addEventListener('change', () => {
      const value = marketFilter.value;
      predictionList.querySelectorAll('[data-slug]').forEach((item) => {
        item.style.display = !value || item.dataset.slug === value ? '' : 'none';
      });
    });
  }
})();
