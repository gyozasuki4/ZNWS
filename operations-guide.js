(() => {
  const search = document.querySelector('#guidanceSearch');
  const articles = [...document.querySelectorAll('#guidanceContent > article')];
  const links = [...document.querySelectorAll('.guidance-toc a')];
  const results = document.querySelector('#guidanceResults');
  const topButton = document.querySelector('#guidanceToTop');

  const filterGuide = () => {
    const query = search.value.trim().toLowerCase();
    let shown = 0;
    articles.forEach((article) => {
      const haystack = `${article.dataset.guideKeywords || ''} ${article.textContent}`.toLowerCase();
      const match = !query || haystack.includes(query);
      article.hidden = !match;
      shown += Number(match);
    });
    links.forEach((link) => {
      const target = document.querySelector(link.getAttribute('href'));
      link.hidden = Boolean(query && target?.hidden);
    });
    results.textContent = query ? `${shown} ${shown === 1 ? 'chapter' : 'chapters'} found for “${search.value.trim()}”` : '';
  };

  search?.addEventListener('input', filterGuide);
  document.addEventListener('keydown', (event) => {
    if (event.key === '/' && !/INPUT|TEXTAREA|SELECT/.test(document.activeElement?.tagName)) {
      event.preventDefault();
      search?.focus();
    }
    if (event.key === 'Escape' && document.activeElement === search) {
      search.value = '';
      filterGuide();
      search.blur();
    }
  });

  const observer = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (!entry.isIntersecting) return;
      links.forEach((link) => link.classList.toggle('is-active', link.hash === `#${entry.target.id}`));
    });
  }, { rootMargin: '-20% 0px -70%' });
  articles.forEach((article) => observer.observe(article));

  const updateTopButton = () => topButton?.classList.toggle('is-visible', window.scrollY > 650);
  window.addEventListener('scroll', updateTopButton, { passive: true });
  topButton?.addEventListener('click', () => window.scrollTo({ top: 0, behavior: 'smooth' }));
  updateTopButton();
})();
