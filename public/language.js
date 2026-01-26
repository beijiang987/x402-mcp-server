// 语言切换功能
class LanguageSwitcher {
  constructor() {
    this.currentLang = this.getStoredLanguage() || 'en';
    this.init();
  }

  // 检测浏览器语言
  detectBrowserLanguage() {
    const browserLang = navigator.language || navigator.userLanguage;
    if (browserLang.startsWith('zh')) return 'zh';
    if (browserLang.startsWith('ko')) return 'ko';
    if (browserLang.startsWith('ja')) return 'ja';
    return 'en';
  }

  // 获取存储的语言
  getStoredLanguage() {
    return localStorage.getItem('preferredLanguage');
  }

  // 存储语言选择
  setStoredLanguage(lang) {
    localStorage.setItem('preferredLanguage', lang);
  }

  // 初始化
  init() {
    this.updatePage(this.currentLang);
    this.setupEventListeners();
  }

  // 设置事件监听
  setupEventListeners() {
    const langButtons = document.querySelectorAll('[data-lang]');
    langButtons.forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.preventDefault();
        const lang = btn.getAttribute('data-lang');
        this.switchLanguage(lang);
      });
    });
  }

  // 切换语言
  switchLanguage(lang) {
    if (!translations[lang]) {
      console.error(`Language ${lang} not found`);
      return;
    }

    this.currentLang = lang;
    this.setStoredLanguage(lang);
    this.updatePage(lang);
    this.updateActiveButton(lang);
  }

  // 更新页面内容
  updatePage(lang) {
    const t = translations[lang];

    // 更新文档语言属性
    document.documentElement.lang = this.getLangCode(lang);

    // 导航栏
    this.setText('[data-i18n="nav.features"]', t.nav.features);
    this.setText('[data-i18n="nav.pricing"]', t.nav.pricing);
    this.setText('[data-i18n="nav.api"]', t.nav.api);
    this.setText('[data-i18n="nav.quickstart"]', t.nav.quickstart);
    this.setText('[data-i18n="nav.github"]', t.nav.github);

    // Hero
    this.setText('[data-i18n="hero.title1"]', t.hero.title1);
    this.setText('[data-i18n="hero.title2"]', t.hero.title2);
    this.setHTML('[data-i18n="hero.subtitle"]', t.hero.subtitle);
    this.setText('[data-i18n="hero.btnPrimary"]', t.hero.btnPrimary);
    this.setText('[data-i18n="hero.btnSecondary"]', t.hero.btnSecondary);
    this.setText('[data-i18n="hero.stat1"]', t.hero.stat1);
    this.setText('[data-i18n="hero.stat2"]', t.hero.stat2);
    this.setText('[data-i18n="hero.stat3"]', t.hero.stat3);

    // Features
    this.setText('[data-i18n="features.title"]', t.features.title);
    this.setText('[data-i18n="features.subtitle"]', t.features.subtitle);
    this.setText('[data-i18n="features.feature1.title"]', t.features.feature1.title);
    this.setText('[data-i18n="features.feature1.desc"]', t.features.feature1.desc);
    this.setText('[data-i18n="features.feature2.title"]', t.features.feature2.title);
    this.setText('[data-i18n="features.feature2.desc"]', t.features.feature2.desc);
    this.setText('[data-i18n="features.feature3.title"]', t.features.feature3.title);
    this.setText('[data-i18n="features.feature3.desc"]', t.features.feature3.desc);
    this.setText('[data-i18n="features.feature4.title"]', t.features.feature4.title);
    this.setText('[data-i18n="features.feature4.desc"]', t.features.feature4.desc);
    this.setText('[data-i18n="features.feature5.title"]', t.features.feature5.title);
    this.setText('[data-i18n="features.feature5.desc"]', t.features.feature5.desc);
    this.setText('[data-i18n="features.feature6.title"]', t.features.feature6.title);
    this.setText('[data-i18n="features.feature6.desc"]', t.features.feature6.desc);
    this.setText('[data-i18n="features.instant"]', t.features.instant);

    // Pricing
    this.setText('[data-i18n="pricing.title"]', t.pricing.title);
    this.setText('[data-i18n="pricing.subtitle"]', t.pricing.subtitle);
    this.setText('[data-i18n="pricing.popular"]', t.pricing.popular);
    this.setText('[data-i18n="pricing.perMonth"]', t.pricing.perMonth);
    this.setText('[data-i18n="pricing.btnFree"]', t.pricing.btnFree);
    this.setText('[data-i18n="pricing.btnStart"]', t.pricing.btnStart);
    this.setText('[data-i18n="pricing.btnPro"]', t.pricing.btnPro);
    this.setText('[data-i18n="pricing.btnEnterprise"]', t.pricing.btnEnterprise);

    // Pricing tiers
    Object.keys(t.pricing.tier).forEach(tierKey => {
      const tier = t.pricing.tier[tierKey];
      this.setText(`[data-i18n="pricing.tier.${tierKey}.name"]`, tier.name);
      if (tier.price) {
        this.setText(`[data-i18n="pricing.tier.${tierKey}.price"]`, tier.price);
      }
      tier.features.forEach((feature, index) => {
        this.setText(`[data-i18n="pricing.tier.${tierKey}.feature${index + 1}"]`, feature);
      });
    });

    // API Docs
    this.setText('[data-i18n="apiDocs.title"]', t.apiDocs.title);
    this.setText('[data-i18n="apiDocs.subtitle"]', t.apiDocs.subtitle);
    this.setText('[data-i18n="apiDocs.viewFull"]', t.apiDocs.viewFull);

    // Quick Start
    this.setText('[data-i18n="quickstart.title"]', t.quickstart.title);
    ['step1', 'step2', 'step3', 'step4'].forEach(step => {
      this.setText(`[data-i18n="quickstart.${step}.title"]`, t.quickstart[step].title);
    });

    // Networks
    this.setText('[data-i18n="networks.title"]', t.networks.title);

    // CTA
    this.setText('[data-i18n="cta.title"]', t.cta.title);
    this.setText('[data-i18n="cta.subtitle"]', t.cta.subtitle);
    this.setText('[data-i18n="cta.btnPrimary"]', t.cta.btnPrimary);
    this.setText('[data-i18n="cta.btnSecondary"]', t.cta.btnSecondary);

    // Footer
    this.setText('[data-i18n="footer.product"]', t.footer.product);
    this.setText('[data-i18n="footer.resources"]', t.footer.resources);
    this.setText('[data-i18n="footer.community"]', t.footer.community);
    this.setText('[data-i18n="footer.about"]', t.footer.about);
    this.setText('[data-i18n="footer.description"]', t.footer.description);
    this.setText('[data-i18n="footer.poweredBy"]', t.footer.poweredBy);
    this.setText('[data-i18n="footer.copyright"]', t.footer.copyright);
    this.setText('[data-i18n="footer.contactUs"]', t.footer.contactUs);
  }

  // 更新激活按钮
  updateActiveButton(lang) {
    document.querySelectorAll('[data-lang]').forEach(btn => {
      btn.classList.remove('active');
      if (btn.getAttribute('data-lang') === lang) {
        btn.classList.add('active');
      }
    });
  }

  // 设置文本
  setText(selector, text) {
    const elements = document.querySelectorAll(selector);
    elements.forEach(el => {
      if (el) el.textContent = text;
    });
  }

  // 设置 HTML
  setHTML(selector, html) {
    const elements = document.querySelectorAll(selector);
    elements.forEach(el => {
      if (el) el.innerHTML = html;
    });
  }

  // 获取语言代码
  getLangCode(lang) {
    const codes = {
      'zh': 'zh-CN',
      'en': 'en',
      'ko': 'ko',
      'ja': 'ja'
    };
    return codes[lang] || 'en';
  }
}

// 页面加载完成后初始化
document.addEventListener('DOMContentLoaded', () => {
  window.languageSwitcher = new LanguageSwitcher();
});
