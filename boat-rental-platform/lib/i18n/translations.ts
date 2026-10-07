export type Locale = 'en' | 'de' | 'fr' | 'ar' | 'ru' | 'sv' | 'nl' | 'pl'

export const LOCALES: { code: Locale; name: string; flag: string; dir?: 'rtl' }[] = [
  { code: 'en', name: 'English',    flag: '🇬🇧' },
  { code: 'de', name: 'Deutsch',    flag: '🇩🇪' },
  { code: 'fr', name: 'Français',   flag: '🇫🇷' },
  { code: 'ar', name: 'العربية',    flag: '🇦🇪', dir: 'rtl' },
  { code: 'ru', name: 'Русский',    flag: '🇷🇺' },
  { code: 'sv', name: 'Svenska',    flag: '🇸🇪' },
  { code: 'nl', name: 'Nederlands', flag: '🇳🇱' },
  { code: 'pl', name: 'Polski',     flag: '🇵🇱' },
]

export interface T {
  nav: {
    about: string
    explore: string
    howItWorks: string
    blog: string
    listYourBoat: string
    login: string
    getStarted: string
  }
  home: {
    eyebrow: string
    title: string
    titleHighlight: string
    subtitle: string
    searchPlaceholder: string
    searchBtn: string
    trustBar: string[]
    featuredTitle: string
    featuredSub: string
    howTitle: string
    howSub: string
    steps: { title: string; desc: string }[]
    ctaTitle: string
    ctaSub: string
    ctaBtn: string
    ctaBtnSecondary: string
  }
  footer: {
    tagline: string
    whatsapp: string
    explore: string
    links: {
      allBoats: string; marbella: string; howItWorks: string
      charterGuide: string; luxuryYachts: string; newsroom: string
    }
    forHosts: string
    hostLinks: {
      listYourBoat: string; hostDashboard: string
      manageCalendar: string; earnings: string; stripeSetup: string
    }
    company: string
    companyLinks: {
      about: string; contact: string; blog: string
      privacy: string; terms: string
    }
    ctaEyebrow: string
    ctaTitle: string
    ctaTitleHighlight: string
    // ctaSub carries {boats}/{destinations} placeholders — the layout fills
    // them with live counts from lib/site-stats.ts so no locale hardcodes
    // fleet numbers that drift out of date.
    ctaSub: string
    ctaBtn: string
    ctaBtnSecondary: string
    trustBadges: string[]
    rights: string
    securedBy: string
    skippersIncluded: string
  }
  common: {
    bookNow: string
    viewMore: string
    from: string
    perHour: string
    perDay: string
    guests: string
    verified: string
    back: string
    save: string
    cancel: string
    loading: string
    error: string
    instantBook: string
    skipper: string
    fuelIncluded: string
  }
}

const en: T = {
  nav: {
    about: 'About us',
    explore: 'Explore boats',
    howItWorks: 'How it works',
    blog: 'Blog',
    listYourBoat: 'List your boat',
    login: 'Log in',
    getStarted: 'Get started',
  },
  home: {
    eyebrow: 'Book with confidence',
    title: 'Find the perfect boat charter',
    titleHighlight: 'worldwide',
    subtitle: 'Verified boats across destinations worldwide. Licensed skippers, instant booking, secure payments.',
    searchPlaceholder: 'Where do you want to sail?',
    searchBtn: 'Search boats',
    trustBar: ['Verified boats', 'Destinations worldwide', 'Licensed skippers', 'Instant booking'],
    featuredTitle: 'Featured destinations',
    featuredSub: 'From the Costa del Sol to the Caribbean — book the world\'s finest charter boats.',
    howTitle: 'Charter in 3 simple steps',
    howSub: 'From discovery to departure — BoatHire24 handles everything.',
    steps: [
      { title: 'Search & discover', desc: 'Browse verified boats across destinations worldwide. Filter by type, size, price and date.' },
      { title: 'Book instantly', desc: 'Instant confirmation or request-to-book. Secure payment via Stripe — no surprises.' },
      { title: 'Cast off', desc: 'Meet your licensed skipper at the marina. Everything is arranged — just enjoy.' },
    ],
    ctaTitle: 'Ready to set sail?',
    ctaSub: 'Book a charter in under 5 minutes.',
    ctaBtn: 'Browse all boats',
    ctaBtnSecondary: 'List your boat',
  },
  footer: {
    tagline: 'The global marketplace for verified boat charters. Licensed skippers, transparent prices, instant booking.',
    whatsapp: 'WhatsApp · 08:00–22:00',
    explore: 'Explore',
    links: { allBoats: 'All boats', marbella: 'Marbella', howItWorks: 'How it works', charterGuide: 'Charter guide', luxuryYachts: 'Luxury yachts', newsroom: 'Newsroom' },
    forHosts: 'For Hosts',
    hostLinks: { listYourBoat: 'List your boat', hostDashboard: 'Host dashboard', manageCalendar: 'Manage calendar', earnings: 'Earnings & payouts', stripeSetup: 'Stripe setup' },
    company: 'Company',
    companyLinks: { about: 'About us', contact: 'Contact', blog: 'Blog', privacy: 'Privacy policy', terms: 'Terms of service' },
    ctaEyebrow: 'Ready to cast off?',
    ctaTitle: 'Book your charter in',
    ctaTitleHighlight: 'under 5 minutes.',
    ctaSub: 'Browse {boats} verified boats across {destinations} destinations. Instant confirmation, licensed skippers, secure payments.',
    ctaBtn: 'Browse All Boats',
    ctaBtnSecondary: 'List Your Boat',
    trustBadges: ['🔒 Secure payments', '✅ Verified boats'],
    rights: 'All rights reserved.',
    securedBy: 'Payments secured by Stripe',
    skippersIncluded: 'All charters include a licensed skipper',
  },
  common: {
    bookNow: 'Book now', viewMore: 'View more', from: 'From', perHour: '/hr', perDay: '/day',
    guests: 'guests', verified: 'Verified', back: 'Back', save: 'Save', cancel: 'Cancel',
    loading: 'Loading…', error: 'Something went wrong', instantBook: 'Instant book',
    skipper: 'Skipper included', fuelIncluded: 'Fuel included',
  },
}

const de: T = {
  nav: {
    about: 'Über uns', explore: 'Boote entdecken', howItWorks: 'So funktioniert es',
    blog: 'Blog', listYourBoat: 'Boot eintragen', login: 'Anmelden', getStarted: 'Jetzt starten',
  },
  home: {
    eyebrow: 'Mit Vertrauen buchen',
    title: 'Das perfekte Bootschartern finden',
    titleHighlight: 'weltweit',
    subtitle: 'Verifizierte Boote in Destinationen weltweit. Lizenzierte Skipper, Sofortbuchung, sichere Zahlung.',
    searchPlaceholder: 'Wohin möchten Sie segeln?',
    searchBtn: 'Boote suchen',
    trustBar: ['Verifizierte Boote', 'Destinationen weltweit', 'Lizenzierte Skipper', 'Sofortbuchung'],
    featuredTitle: 'Beliebte Destinationen',
    featuredSub: 'Von der Costa del Sol bis in die Karibik — buchen Sie die schönsten Charterboote der Welt.',
    howTitle: 'Chartern in 3 einfachen Schritten',
    howSub: 'Von der Entdeckung bis zur Abfahrt — BoatHire24 regelt alles.',
    steps: [
      { title: 'Suchen & entdecken', desc: 'Stöbern Sie durch verifizierte Boote in Destinationen weltweit. Nach Typ, Größe, Preis und Datum filtern.' },
      { title: 'Sofort buchen', desc: 'Sofortbestätigung oder Buchungsanfrage. Sichere Zahlung über Stripe — keine Überraschungen.' },
      { title: 'Ablegen', desc: 'Treffen Sie Ihren lizenzierten Skipper am Hafen. Alles ist arrangiert — genießen Sie einfach.' },
    ],
    ctaTitle: 'Bereit loszusegeln?',
    ctaSub: 'Buchen Sie einen Charter in unter 5 Minuten.',
    ctaBtn: 'Alle Boote ansehen',
    ctaBtnSecondary: 'Boot eintragen',
  },
  footer: {
    tagline: 'Der globale Marktplatz für verifizierte Bootscharter. Lizenzierte Skipper, transparente Preise, Sofortbuchung.',
    whatsapp: 'WhatsApp · 08:00–22:00',
    explore: 'Entdecken',
    links: { allBoats: 'Alle Boote', marbella: 'Marbella', howItWorks: 'So funktioniert es', charterGuide: 'Charter-Guide', luxuryYachts: 'Luxus-Yachten', newsroom: 'Newsroom' },
    forHosts: 'Für Vermieter',
    hostLinks: { listYourBoat: 'Boot eintragen', hostDashboard: 'Vermieter-Dashboard', manageCalendar: 'Kalender verwalten', earnings: 'Einnahmen & Auszahlungen', stripeSetup: 'Stripe-Einrichtung' },
    company: 'Unternehmen',
    companyLinks: { about: 'Über uns', contact: 'Kontakt', blog: 'Blog', privacy: 'Datenschutz', terms: 'Nutzungsbedingungen' },
    ctaEyebrow: 'Bereit abzulegen?',
    ctaTitle: 'Ihren Charter buchen in',
    ctaTitleHighlight: 'unter 5 Minuten.',
    ctaSub: '{boats} verifizierte Boote in {destinations} Destinationen. Sofortbestätigung, lizenzierte Skipper, sichere Zahlung.',
    ctaBtn: 'Alle Boote durchsuchen',
    ctaBtnSecondary: 'Boot eintragen',
    trustBadges: ['🔒 Sichere Zahlung', '✅ Verifizierte Boote'],
    rights: 'Alle Rechte vorbehalten.',
    securedBy: 'Zahlungen gesichert durch Stripe',
    skippersIncluded: 'Alle Charter beinhalten einen lizenzierten Skipper',
  },
  common: {
    bookNow: 'Jetzt buchen', viewMore: 'Mehr ansehen', from: 'Ab', perHour: '/Std', perDay: '/Tag',
    guests: 'Gäste', verified: 'Verifiziert', back: 'Zurück', save: 'Speichern', cancel: 'Abbrechen',
    loading: 'Lädt…', error: 'Etwas ist schiefgelaufen', instantBook: 'Sofortbuchung',
    skipper: 'Skipper inklusive', fuelIncluded: 'Kraftstoff inklusive',
  },
}

const fr: T = {
  nav: {
    about: 'À propos', explore: 'Explorer les bateaux', howItWorks: 'Comment ça marche',
    blog: 'Blog', listYourBoat: 'Listez votre bateau', login: 'Se connecter', getStarted: 'Commencer',
  },
  home: {
    eyebrow: 'Réservez en toute confiance',
    title: 'Trouvez la location de bateau parfaite',
    titleHighlight: 'partout dans le monde',
    subtitle: 'Des bateaux vérifiés dans des destinations du monde entier. Skippers agréés, réservation instantanée, paiement sécurisé.',
    searchPlaceholder: 'Où souhaitez-vous naviguer ?',
    searchBtn: 'Rechercher des bateaux',
    trustBar: ['Bateaux vérifiés', 'Destinations mondiales', 'Skippers agréés', 'Réservation instantanée'],
    featuredTitle: 'Destinations phares',
    featuredSub: 'De la Costa del Sol aux Caraïbes — réservez les meilleurs bateaux de charter au monde.',
    howTitle: 'Louez en 3 étapes simples',
    howSub: 'De la découverte au départ — BoatHire24 s\'occupe de tout.',
    steps: [
      { title: 'Cherchez & découvrez', desc: 'Parcourez des bateaux vérifiés dans des destinations du monde entier. Filtrez par type, taille, prix et date.' },
      { title: 'Réservez instantanément', desc: 'Confirmation immédiate ou demande de réservation. Paiement sécurisé via Stripe — sans surprises.' },
      { title: 'Prenez la mer', desc: 'Retrouvez votre skipper agréé au port. Tout est organisé — profitez simplement.' },
    ],
    ctaTitle: 'Prêt à prendre la mer ?',
    ctaSub: 'Réservez un charter en moins de 5 minutes.',
    ctaBtn: 'Voir tous les bateaux',
    ctaBtnSecondary: 'Listez votre bateau',
  },
  footer: {
    tagline: 'Le marché mondial des charters de bateaux vérifiés. Skippers agréés, prix transparents, réservation instantanée.',
    whatsapp: 'WhatsApp · 08h00–22h00',
    explore: 'Explorer',
    links: { allBoats: 'Tous les bateaux', marbella: 'Marbella', howItWorks: 'Comment ça marche', charterGuide: 'Guide charter', luxuryYachts: 'Yachts de luxe', newsroom: 'Actualités' },
    forHosts: 'Pour les hôtes',
    hostLinks: { listYourBoat: 'Listez votre bateau', hostDashboard: 'Tableau de bord', manageCalendar: 'Gérer le calendrier', earnings: 'Revenus & paiements', stripeSetup: 'Configuration Stripe' },
    company: 'Société',
    companyLinks: { about: 'À propos', contact: 'Contact', blog: 'Blog', privacy: 'Politique de confidentialité', terms: 'Conditions d\'utilisation' },
    ctaEyebrow: 'Prêt à larguer les amarres ?',
    ctaTitle: 'Réservez votre charter en',
    ctaTitleHighlight: 'moins de 5 minutes.',
    ctaSub: '{boats} bateaux vérifiés dans {destinations} destinations. Confirmation instantanée, skippers agréés, paiements sécurisés.',
    ctaBtn: 'Voir tous les bateaux',
    ctaBtnSecondary: 'Listez votre bateau',
    trustBadges: ['🔒 Paiements sécurisés', '✅ Bateaux vérifiés'],
    rights: 'Tous droits réservés.',
    securedBy: 'Paiements sécurisés par Stripe',
    skippersIncluded: 'Tous les charters incluent un skipper agréé',
  },
  common: {
    bookNow: 'Réserver', viewMore: 'Voir plus', from: 'À partir de', perHour: '/h', perDay: '/jour',
    guests: 'passagers', verified: 'Vérifié', back: 'Retour', save: 'Enregistrer', cancel: 'Annuler',
    loading: 'Chargement…', error: 'Une erreur est survenue', instantBook: 'Réservation instantanée',
    skipper: 'Skipper inclus', fuelIncluded: 'Carburant inclus',
  },
}

const ar: T = {
  nav: {
    about: 'من نحن', explore: 'استكشف القوارب', howItWorks: 'كيف يعمل',
    blog: 'المدونة', listYourBoat: 'أضف قاربك', login: 'تسجيل الدخول', getStarted: 'ابدأ الآن',
  },
  home: {
    eyebrow: 'احجز بثقة',
    title: 'اعثر على أفضل رحلة بحرية',
    titleHighlight: 'في جميع أنحاء العالم',
    subtitle: 'قوارب موثقة في وجهات حول العالم. ربابنة مرخصون، حجز فوري، مدفوعات آمنة.',
    searchPlaceholder: 'أين تريد الإبحار؟',
    searchBtn: 'ابحث عن القوارب',
    trustBar: ['قوارب موثقة', 'وجهات حول العالم', 'ربابنة مرخصون', 'حجز فوري'],
    featuredTitle: 'الوجهات المميزة',
    featuredSub: 'من ساحل كوستا ديل سول إلى الكاريبي — احجز أفضل قوارب التأجير في العالم.',
    howTitle: 'استأجر في 3 خطوات بسيطة',
    howSub: 'من الاكتشاف إلى الإبحار — يتولى BoatHire24 كل شيء.',
    steps: [
      { title: 'ابحث واكتشف', desc: 'تصفح قوارب موثقة في وجهات حول العالم. فلتر حسب النوع والحجم والسعر والتاريخ.' },
      { title: 'احجز فوراً', desc: 'تأكيد فوري أو طلب حجز. دفع آمن عبر Stripe — بدون مفاجآت.' },
      { title: 'أقلع', desc: 'التق بربانك المرخص في الميناء. كل شيء مرتب — استمتع فقط.' },
    ],
    ctaTitle: 'هل أنت مستعد للإبحار؟',
    ctaSub: 'احجز رحلتك في أقل من 5 دقائق.',
    ctaBtn: 'تصفح جميع القوارب',
    ctaBtnSecondary: 'أضف قاربك',
  },
  footer: {
    tagline: 'السوق العالمي للقوارب المؤجرة الموثقة. ربابنة مرخصون، أسعار شفافة، حجز فوري.',
    whatsapp: 'واتساب · ٠٨:٠٠–٢٢:٠٠',
    explore: 'استكشف',
    links: { allBoats: 'جميع القوارب', marbella: 'ماربيا', howItWorks: 'كيف يعمل', charterGuide: 'دليل التأجير', luxuryYachts: 'يخوت فاخرة', newsroom: 'غرفة الأخبار' },
    forHosts: 'للمضيفين',
    hostLinks: { listYourBoat: 'أضف قاربك', hostDashboard: 'لوحة المضيف', manageCalendar: 'إدارة التقويم', earnings: 'الأرباح والمدفوعات', stripeSetup: 'إعداد Stripe' },
    company: 'الشركة',
    companyLinks: { about: 'من نحن', contact: 'اتصل بنا', blog: 'المدونة', privacy: 'سياسة الخصوصية', terms: 'شروط الخدمة' },
    ctaEyebrow: 'هل أنت مستعد للإبحار؟',
    ctaTitle: 'احجز رحلتك في',
    ctaTitleHighlight: 'أقل من 5 دقائق.',
    ctaSub: '{boats} قارب موثق في {destinations} وجهة. تأكيد فوري، ربابنة مرخصون، مدفوعات آمنة.',
    ctaBtn: 'تصفح جميع القوارب',
    ctaBtnSecondary: 'أضف قاربك',
    trustBadges: ['🔒 مدفوعات آمنة', '✅ قوارب موثقة'],
    rights: 'جميع الحقوق محفوظة.',
    securedBy: 'المدفوعات مؤمنة بواسطة Stripe',
    skippersIncluded: 'جميع الرحلات تشمل ربان مرخص',
  },
  common: {
    bookNow: 'احجز الآن', viewMore: 'عرض المزيد', from: 'من', perHour: '/ساعة', perDay: '/يوم',
    guests: 'ضيوف', verified: 'موثق', back: 'رجوع', save: 'حفظ', cancel: 'إلغاء',
    loading: 'جار التحميل…', error: 'حدث خطأ ما', instantBook: 'حجز فوري',
    skipper: 'ربان مشمول', fuelIncluded: 'الوقود مشمول',
  },
}

const ru: T = {
  nav: {
    about: 'О нас', explore: 'Найти яхту', howItWorks: 'Как это работает',
    blog: 'Блог', listYourBoat: 'Добавить яхту', login: 'Войти', getStarted: 'Начать',
  },
  home: {
    eyebrow: 'Бронируйте с уверенностью',
    title: 'Найдите идеальную яхту',
    titleHighlight: 'по всему миру',
    subtitle: 'Проверенные яхты в направлениях по всему миру. Лицензированные шкиперы, мгновенное бронирование, безопасная оплата.',
    searchPlaceholder: 'Куда вы хотите отправиться?',
    searchBtn: 'Найти яхту',
    trustBar: ['Проверенные яхты', 'Направления по всему миру', 'Лицензированные шкиперы', 'Мгновенное бронирование'],
    featuredTitle: 'Популярные направления',
    featuredSub: 'От Коста-дель-Соль до Карибского моря — бронируйте лучшие чартерные яхты мира.',
    howTitle: 'Аренда в 3 простых шага',
    howSub: 'От поиска до отплытия — BoatHire24 берёт всё на себя.',
    steps: [
      { title: 'Ищите и открывайте', desc: 'Просматривайте проверенные яхты в направлениях по всему миру. Фильтруйте по типу, размеру, цене и дате.' },
      { title: 'Бронируйте мгновенно', desc: 'Мгновенное подтверждение или запрос на бронирование. Безопасная оплата через Stripe — без сюрпризов.' },
      { title: 'Отплывайте', desc: 'Встретьтесь с лицензированным шкипером в марине. Всё организовано — просто наслаждайтесь.' },
    ],
    ctaTitle: 'Готовы выйти в море?',
    ctaSub: 'Забронируйте чартер менее чем за 5 минут.',
    ctaBtn: 'Смотреть все яхты',
    ctaBtnSecondary: 'Добавить яхту',
  },
  footer: {
    tagline: 'Глобальный рынок проверенных яхтенных чартеров. Лицензированные шкиперы, прозрачные цены, мгновенное бронирование.',
    whatsapp: 'WhatsApp · 08:00–22:00',
    explore: 'Исследовать',
    links: { allBoats: 'Все яхты', marbella: 'Марбелья', howItWorks: 'Как это работает', charterGuide: 'Гид по чартеру', luxuryYachts: 'Люкс яхты', newsroom: 'Новости' },
    forHosts: 'Для владельцев',
    hostLinks: { listYourBoat: 'Добавить яхту', hostDashboard: 'Панель владельца', manageCalendar: 'Управление календарём', earnings: 'Доходы и выплаты', stripeSetup: 'Настройка Stripe' },
    company: 'Компания',
    companyLinks: { about: 'О нас', contact: 'Контакты', blog: 'Блог', privacy: 'Политика конфиденциальности', terms: 'Условия использования' },
    ctaEyebrow: 'Готовы отчалить?',
    ctaTitle: 'Забронируйте чартер за',
    ctaTitleHighlight: 'менее 5 минут.',
    ctaSub: 'Проверенные яхты: {boats} в {destinations} направлениях. Мгновенное подтверждение, лицензированные шкиперы, безопасная оплата.',
    ctaBtn: 'Смотреть все яхты',
    ctaBtnSecondary: 'Добавить яхту',
    trustBadges: ['🔒 Безопасная оплата', '✅ Проверенные яхты'],
    rights: 'Все права защищены.',
    securedBy: 'Платежи защищены Stripe',
    skippersIncluded: 'Все чартеры включают лицензированного шкипера',
  },
  common: {
    bookNow: 'Забронировать', viewMore: 'Смотреть ещё', from: 'От', perHour: '/час', perDay: '/день',
    guests: 'гостей', verified: 'Проверено', back: 'Назад', save: 'Сохранить', cancel: 'Отмена',
    loading: 'Загрузка…', error: 'Что-то пошло не так', instantBook: 'Мгновенное бронирование',
    skipper: 'Шкипер включён', fuelIncluded: 'Топливо включено',
  },
}

const sv: T = {
  nav: {
    about: 'Om oss', explore: 'Utforska båtar', howItWorks: 'Hur det fungerar',
    blog: 'Blogg', listYourBoat: 'Lista din båt', login: 'Logga in', getStarted: 'Kom igång',
  },
  home: {
    eyebrow: 'Boka med förtroende',
    title: 'Hitta den perfekta båtchartern',
    titleHighlight: 'världen över',
    subtitle: 'Verifierade båtar i destinationer världen över. Licensierade skeppare, direktbokning, säkra betalningar.',
    searchPlaceholder: 'Vart vill du segla?',
    searchBtn: 'Sök båtar',
    trustBar: ['Verifierade båtar', 'Destinationer världen över', 'Licensierade skeppare', 'Direktbokning'],
    featuredTitle: 'Populära destinationer',
    featuredSub: 'Från Costa del Sol till Karibien — boka världens finaste charterbåtar.',
    howTitle: 'Charter i 3 enkla steg',
    howSub: 'Från sökning till avgång — BoatHire24 sköter allt.',
    steps: [
      { title: 'Sök & upptäck', desc: 'Bläddra bland verifierade båtar i destinationer världen över. Filtrera på typ, storlek, pris och datum.' },
      { title: 'Boka direkt', desc: 'Omedelbar bekräftelse eller bokningsförfrågan. Säker betalning via Stripe — inga överraskningar.' },
      { title: 'Kasta loss', desc: 'Möt din licensierade skeppare i hamnen. Allt är ordnat — njut bara.' },
    ],
    ctaTitle: 'Redo att sätta segel?',
    ctaSub: 'Boka en charter på under 5 minuter.',
    ctaBtn: 'Se alla båtar',
    ctaBtnSecondary: 'Lista din båt',
  },
  footer: {
    tagline: 'Den globala marknadsplatsen för verifierade båtcharter. Licensierade skeppare, transparenta priser, direktbokning.',
    whatsapp: 'WhatsApp · 08:00–22:00',
    explore: 'Utforska',
    links: { allBoats: 'Alla båtar', marbella: 'Marbella', howItWorks: 'Hur det fungerar', charterGuide: 'Charterguide', luxuryYachts: 'Lyxjakter', newsroom: 'Nyhetsrum' },
    forHosts: 'För värdar',
    hostLinks: { listYourBoat: 'Lista din båt', hostDashboard: 'Värddashboard', manageCalendar: 'Hantera kalender', earnings: 'Intäkter & utbetalningar', stripeSetup: 'Stripe-inställning' },
    company: 'Företag',
    companyLinks: { about: 'Om oss', contact: 'Kontakt', blog: 'Blogg', privacy: 'Integritetspolicy', terms: 'Användarvillkor' },
    ctaEyebrow: 'Redo att kasta loss?',
    ctaTitle: 'Boka din charter på',
    ctaTitleHighlight: 'under 5 minuter.',
    ctaSub: '{boats} verifierade båtar i {destinations} destinationer. Omedelbar bekräftelse, licensierade skeppare, säkra betalningar.',
    ctaBtn: 'Se alla båtar',
    ctaBtnSecondary: 'Lista din båt',
    trustBadges: ['🔒 Säkra betalningar', '✅ Verifierade båtar'],
    rights: 'Alla rättigheter förbehållna.',
    securedBy: 'Betalningar säkrade av Stripe',
    skippersIncluded: 'Alla charter inkluderar en licensierad skeppare',
  },
  common: {
    bookNow: 'Boka nu', viewMore: 'Visa mer', from: 'Från', perHour: '/tim', perDay: '/dag',
    guests: 'gäster', verified: 'Verifierad', back: 'Tillbaka', save: 'Spara', cancel: 'Avbryt',
    loading: 'Laddar…', error: 'Något gick fel', instantBook: 'Direktbokning',
    skipper: 'Skeppare ingår', fuelIncluded: 'Bränsle ingår',
  },
}

const nl: T = {
  nav: {
    about: 'Over ons', explore: 'Ontdek boten', howItWorks: 'Hoe het werkt',
    blog: 'Blog', listYourBoat: 'Zet uw boot in', login: 'Inloggen', getStarted: 'Aan de slag',
  },
  home: {
    eyebrow: 'Boek met vertrouwen',
    title: 'Vind de perfecte bootverhuur',
    titleHighlight: 'wereldwijd',
    subtitle: 'Geverifieerde boten in bestemmingen wereldwijd. Gediplomeerde schippers, directe boeking, veilige betaling.',
    searchPlaceholder: 'Waar wilt u varen?',
    searchBtn: 'Zoek boten',
    trustBar: ['Geverifieerde boten', 'Bestemmingen wereldwijd', 'Gediplomeerde schippers', 'Directe boeking'],
    featuredTitle: 'Uitgelichte bestemmingen',
    featuredSub: 'Van de Costa del Sol tot het Caribisch gebied — boek de mooiste charterboten ter wereld.',
    howTitle: 'Charter in 3 eenvoudige stappen',
    howSub: 'Van ontdekking tot vertrek — BoatHire24 regelt alles.',
    steps: [
      { title: 'Zoek & ontdek', desc: 'Blader door geverifieerde boten in bestemmingen wereldwijd. Filter op type, grootte, prijs en datum.' },
      { title: 'Boek direct', desc: 'Directe bevestiging of boekingsverzoek. Veilige betaling via Stripe — geen verrassingen.' },
      { title: 'Vaar uit', desc: 'Ontmoet uw gediplomeerde schipper in de haven. Alles is geregeld — geniet er gewoon van.' },
    ],
    ctaTitle: 'Klaar om uit te varen?',
    ctaSub: 'Boek een charter in minder dan 5 minuten.',
    ctaBtn: 'Bekijk alle boten',
    ctaBtnSecondary: 'Zet uw boot in',
  },
  footer: {
    tagline: 'De wereldwijde marktplaats voor geverifieerde boottochten. Gediplomeerde schippers, transparante prijzen, directe boeking.',
    whatsapp: 'WhatsApp · 08:00–22:00',
    explore: 'Ontdek',
    links: { allBoats: 'Alle boten', marbella: 'Marbella', howItWorks: 'Hoe het werkt', charterGuide: 'Chartergids', luxuryYachts: 'Luxe jachten', newsroom: 'Nieuwsredactie' },
    forHosts: 'Voor verhuurders',
    hostLinks: { listYourBoat: 'Zet uw boot in', hostDashboard: 'Verhuurder dashboard', manageCalendar: 'Agenda beheren', earnings: 'Inkomsten & uitbetalingen', stripeSetup: 'Stripe-instelling' },
    company: 'Bedrijf',
    companyLinks: { about: 'Over ons', contact: 'Contact', blog: 'Blog', privacy: 'Privacybeleid', terms: 'Gebruiksvoorwaarden' },
    ctaEyebrow: 'Klaar om uit te varen?',
    ctaTitle: 'Boek uw charter in',
    ctaTitleHighlight: 'minder dan 5 minuten.',
    ctaSub: '{boats} geverifieerde boten in {destinations} bestemmingen. Directe bevestiging, gediplomeerde schippers, veilige betalingen.',
    ctaBtn: 'Bekijk alle boten',
    ctaBtnSecondary: 'Zet uw boot in',
    trustBadges: ['🔒 Veilige betalingen', '✅ Geverifieerde boten'],
    rights: 'Alle rechten voorbehouden.',
    securedBy: 'Betalingen beveiligd door Stripe',
    skippersIncluded: 'Alle charters bevatten een gediplomeerde schipper',
  },
  common: {
    bookNow: 'Nu boeken', viewMore: 'Meer bekijken', from: 'Vanaf', perHour: '/uur', perDay: '/dag',
    guests: 'gasten', verified: 'Geverifieerd', back: 'Terug', save: 'Opslaan', cancel: 'Annuleren',
    loading: 'Laden…', error: 'Er is iets misgegaan', instantBook: 'Directe boeking',
    skipper: 'Schipper inbegrepen', fuelIncluded: 'Brandstof inbegrepen',
  },
}

const pl: T = {
  nav: {
    about: 'O nas', explore: 'Odkryj łodzie', howItWorks: 'Jak to działa',
    blog: 'Blog', listYourBoat: 'Dodaj łódź', login: 'Zaloguj się', getStarted: 'Zacznij',
  },
  home: {
    eyebrow: 'Rezerwuj z pewnością',
    title: 'Znajdź idealny czarter',
    titleHighlight: 'na całym świecie',
    subtitle: 'Zweryfikowane łodzie w destynacjach na całym świecie. Licencjonowani kapitanowie, natychmiastowa rezerwacja, bezpieczne płatności.',
    searchPlaceholder: 'Dokąd chcesz popłynąć?',
    searchBtn: 'Szukaj łodzi',
    trustBar: ['Zweryfikowane łodzie', 'Destynacje na całym świecie', 'Licencjonowani kapitanowie', 'Natychmiastowa rezerwacja'],
    featuredTitle: 'Polecane destynacje',
    featuredSub: 'Od Costa del Sol po Karaiby — zarezerwuj najlepsze łodzie czarterowe na świecie.',
    howTitle: 'Czarter w 3 prostych krokach',
    howSub: 'Od wyszukiwania do wypłynięcia — BoatHire24 zajmuje się wszystkim.',
    steps: [
      { title: 'Szukaj i odkrywaj', desc: 'Przeglądaj zweryfikowane łodzie w destynacjach na całym świecie. Filtruj według typu, rozmiaru, ceny i daty.' },
      { title: 'Rezerwuj natychmiast', desc: 'Natychmiastowe potwierdzenie lub prośba o rezerwację. Bezpieczna płatność przez Stripe — bez niespodzianek.' },
      { title: 'Wypłyń', desc: 'Spotkaj się ze swoim licencjonowanym kapitanem w marinie. Wszystko jest zorganizowane — po prostu ciesz się.' },
    ],
    ctaTitle: 'Gotowy, by wypłynąć?',
    ctaSub: 'Zarezerwuj czarter w mniej niż 5 minut.',
    ctaBtn: 'Przeglądaj wszystkie łodzie',
    ctaBtnSecondary: 'Dodaj swoją łódź',
  },
  footer: {
    tagline: 'Globalny rynek zweryfikowanych czarterów. Licencjonowani kapitanowie, przejrzyste ceny, natychmiastowa rezerwacja.',
    whatsapp: 'WhatsApp · 08:00–22:00',
    explore: 'Odkryj',
    links: { allBoats: 'Wszystkie łodzie', marbella: 'Marbella', howItWorks: 'Jak to działa', charterGuide: 'Przewodnik czarterowy', luxuryYachts: 'Luksusowe jachty', newsroom: 'Aktualności' },
    forHosts: 'Dla właścicieli',
    hostLinks: { listYourBoat: 'Dodaj łódź', hostDashboard: 'Panel właściciela', manageCalendar: 'Zarządzaj kalendarzem', earnings: 'Przychody i wypłaty', stripeSetup: 'Konfiguracja Stripe' },
    company: 'Firma',
    companyLinks: { about: 'O nas', contact: 'Kontakt', blog: 'Blog', privacy: 'Polityka prywatności', terms: 'Warunki usługi' },
    ctaEyebrow: 'Gotowy do wypłynięcia?',
    ctaTitle: 'Zarezerwuj czarter w',
    ctaTitleHighlight: 'mniej niż 5 minut.',
    ctaSub: 'Zweryfikowane łodzie: {boats} w {destinations} destynacjach. Natychmiastowe potwierdzenie, licencjonowani kapitanowie, bezpieczne płatności.',
    ctaBtn: 'Przeglądaj łodzie',
    ctaBtnSecondary: 'Dodaj swoją łódź',
    trustBadges: ['🔒 Bezpieczne płatności', '✅ Zweryfikowane łodzie'],
    rights: 'Wszelkie prawa zastrzeżone.',
    securedBy: 'Płatności zabezpieczone przez Stripe',
    skippersIncluded: 'Wszystkie czartery obejmują licencjonowanego kapitana',
  },
  common: {
    bookNow: 'Zarezerwuj', viewMore: 'Zobacz więcej', from: 'Od', perHour: '/godz', perDay: '/dzień',
    guests: 'gości', verified: 'Zweryfikowany', back: 'Wstecz', save: 'Zapisz', cancel: 'Anuluj',
    loading: 'Ładowanie…', error: 'Coś poszło nie tak', instantBook: 'Natychmiastowa rezerwacja',
    skipper: 'Kapitan w cenie', fuelIncluded: 'Paliwo w cenie',
  },
}

export const translations: Record<Locale, T> = { en, de, fr, ar, ru, sv, nl, pl }

export function t(locale: Locale): T {
  return translations[locale] ?? translations.en
}
