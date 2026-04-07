export type Lang = 'fr' | 'en'

const translations = {
  fr: {
    // ── Navigation ────────────────────────────────────────────
    navHome: 'Accueil',
    navLiveTV: 'TV Direct',
    navMovies: 'Films',
    navSeries: 'Séries',
    navWorldEX: 'WorldEX',
    navHub: 'Hub',
    navFrench: 'Français',

    // ── Header ────────────────────────────────────────────────
    welcome: 'Bienvenue',
    muteAmbient: 'Couper le son ambiant',
    playAmbient: 'Jouer le son ambiant',
    logout: 'Déconnexion',
    poweredBy: 'Propulsé par',

    // ── Access Code Login ─────────────────────────────────────
    premiumStreaming: 'Streaming Premium',
    accessCode: 'Code d\'accès',
    accessCodePlaceholder: 'DASH-SL-001',
    enter: 'Entrer',
    verifying: 'Vérification',
    enterCodeFromDash: 'Entrez le code de votre abonnement DASH',
    pleaseEnterCode: 'Veuillez entrer votre code d\'accès',
    invalidCode: 'Code d\'accès invalide',
    connectionError: 'Erreur de connexion — vérifiez votre internet',

    // ── Welcome Page ──────────────────────────────────────────
    signIn: 'Se connecter',
    showmaxBadge: 'Showmax a fermé. Pas nous.',
    heroTitle1: 'Showmax a disparu.',
    heroTitle2: 'Votre streaming continue.',
    heroSubtitle: '60 000+ films. 11 000 chaînes en direct. Bandes-annonces YouTube. Sélections IA.',
    heroPrice: 'À partir de 3$/mois.',
    heroCTA: 'Commencez — 48h gratuites',
    heroFooter: 'Pas de carte bancaire. Pas de parabole. Juste votre téléphone.',
    veeSmartPicks: 'VEE Smart Picks',
    veeSmartPicksDesc: 'L\'IA apprend vos goûts et personnalise votre flux',
    youtubeTrailers: 'Bandes-annonces YouTube',
    youtubeTrailersDesc: 'Découvrez chaque film avant de le regarder',
    worksOn3G: 'Fonctionne en 3G',
    worksOn3GDesc: 'Mode éco pour toute connexion',
    whatsStreaming: 'Que regarder maintenant',
    whatsStreamingDesc: 'Films, séries, TV en direct — tout au même endroit',
    first48Free: '48 premières heures gratuites',
    perMonth: '/mois',
    pricingDesc: 'Orange Money • Annulez quand vous voulez • Tous les appareils',
    startFreeTrial: 'Essai gratuit',
    enterTrialCode: 'Entrez votre code d\'essai pour commencer le streaming',
    startWatching: 'Commencer',
    verifyingLogin: 'Vérification...',
    freeTrialNote: '48h d\'essai gratuit • Pas de carte bancaire',

    // ── Home Page ─────────────────────────────────────────────
    heroGoodMorning: 'Bonjour',
    heroGoodMorningSubtitle: 'Infos. Sport. Tout ce qu\'il faut avant que la journée commence.',
    heroAfternoonEscape: 'Pause',
    heroAfternoonSubtitle: 'Des films qui valent le coup. Des séries qu\'on ne met pas sur pause.',
    heroPrimeTime: 'Prime Time',
    heroPrimeTimeSubtitle: 'Les matchs sont là. Les films sont prêts. À toi de choisir.',
    heroLateNight: 'Nuit Blanche',
    heroLateNightSubtitle: 'Juste toi et l\'écran. Pas de rush.',
    heroCTAStartWatching: 'Commencer',
    heroCTAExplore: 'Explorer',
    heroCTAWatchNow: 'Regarder',
    heroCTADiveIn: 'Plonger',
    heroDefault: 'Divertissement sélectionné, sport en direct et cinéma du monde. Votre expérience commence ici.',
    continueWatching: 'Reprendre',
    justNow: 'À l\'instant',
    minsAgo: 'min',
    hoursAgo: 'h',
    daysAgo: 'j',
    recently: 'Récemment',
    more: 'Plus',
    seeAll: 'Tout voir',
    sportsBreak: 'Pause Sport',
    diveRightBackIn: 'On reprend',
    getInComfortZone: 'Zone de confort',
    trySomethingNew: 'Essayer du nouveau',
    hottestFixtures: 'Matchs en cours',
    discover: 'Découvrir',
    dashExclusives: 'Exclusivités DASH',
    forYou: 'Pour vous',
    forYouDesc: 'Sélections personnalisées selon vos goûts',
    becauseYouWatched: 'Parce que vous avez regardé',
    sinceYouLiked: 'PUISQUE VOUS AVEZ AIMÉ',
    similarTo: 'Similaire à',
    live: 'Direct',
    movie: 'Film',

    // ── Home Page — collection names ──────────────────────────
    liveSports: 'Sport en direct',
    justDropped: 'Tout juste sorti',
    kidsFamily: 'Enfants & Famille',
    stayInformed: 'Restez informé',
    fourKExperience: 'Expérience 4K',
    bingeWorthy: 'À binger',
    aroundTheWorld: 'Tour du Monde',

    // ── Home Page — collection descriptions ──────────────────
    liveSportsDesc: 'Premier League, beIN, Sky Sports et plus',
    justDroppedDesc: 'Tout juste ajouté — 2025 & 2026',
    kidsFamilyDesc: 'Nick, Disney, Cartoon Network et plus',
    stayInformedDesc: 'CNN, BBC, Al Jazeera, Sky News',
    fourKExperienceDesc: 'Blockbusters en qualité cristalline',
    bingeWorthyDesc: 'K-Drama, séries turques et internationales',
    aroundTheWorldDesc: 'France, Allemagne, Arabe, Inde et plus',

    // ── Originals ────────────────────────────────────────────
    originalsSubtitle: 'Streamez depuis Netflix, Prime, HBO et plus',
    openNetflix: 'Ouvrir Netflix',

    // ── Quick nav pills ───────────────────────────────────────
    sports: 'Sport',
    news: 'Infos',
    movies: 'Films',
    series: 'Séries',
    africa: 'Afrique',
    kids: 'Enfants',
    music: 'Musique',
    faith: 'Spiritualité',

    // ── Sport tabs ────────────────────────────────────────────
    football: 'Football',
    beinZone: 'beIN Zone',
    tennis: 'Tennis',

    // ── Live TV Page ──────────────────────────────────────────
    searchChannels: 'Rechercher des chaînes...',
    searching: 'Recherche...',
    channelFound: 'chaîne trouvée',
    channelsFound: 'chaînes trouvées',
    channelDataUpdating: 'Données chaînes en cours de mise à jour...',
    loadingChannels: 'Chargement des chaînes...',
    noChannelsMatch: 'Aucune chaîne ne correspond',
    browseAllCategories: 'Parcourir toutes les catégories',
    seeLess: 'Voir moins',
    unableToLoad: 'Impossible de charger',
    retry: 'Réessayer',
    noChannelsInCategory: 'Aucune chaîne dans cette catégorie',
    selectQuality: 'Choisir la qualité',
    best: 'Meilleure',
    high: 'Haute',
    standard: 'Standard',
    loading: 'Chargement...',

    // ── Live TV Theme names ───────────────────────────────────
    themeSports: 'Sport',
    themeEntertainment: 'Divertissement',
    themeNews: 'Infos',
    themeKids: 'Enfants',
    themeCinema: 'Chaînes Ciné',
    themeMusic: 'Musique & Ambiance',
    themeDiscovery: 'Docs & Découverte',
    themePremium4K: 'Premium 4K',
    themeFaith: 'Spiritualité',

    // ── Movies Page ───────────────────────────────────────────
    searchMovies: 'Rechercher des films...',
    trendingNow: 'Tendances',
    showMore: 'Voir plus',
    showing: 'Affichage',
    of: 'sur',
    clearFilter: 'Effacer le filtre',
    noMoviesMatch: 'Aucun film ne correspond',
    noMoviesGenre: 'Aucun film de ce genre ici',
    showAll: 'Tout afficher',
    noMoviesInCategory: 'Aucun film dans cette catégorie',
    unableToLoadRetry: 'Impossible de charger — appuyez pour réessayer',
    top50: '50 premiers résultats',
    found: 'trouvé(s)',
    download: 'Télécharger',

    // ── Movies — mood rows ────────────────────────────────────
    lateNightThrills: 'Frissons nocturnes',
    dateNight: 'Soirée romantique',
    feelGoodEnergy: 'Énergie positive',
    edgeOfSeat: 'Suspense haletant',
    easyMorning: 'Matinée tranquille',
    mindExpanding: 'Ouverture d\'esprit',
    criticallyAcclaimed: 'Acclamé par la critique',

    // ── Moment Packs ─────────────────────────────────────────
    momentBeforeSleep: 'Avant de dormir',
    momentEveryoneWatching: 'Tout le monde regarde',
    momentQuickLunch: 'Pause déjeuner',
    momentLateNight: 'Nuit blanche',
    momentInYourFeelings: 'Dans tes émotions',
    momentFamilyTime: 'En famille',
    momentAdrenaline: 'Montée d\'adrénaline',
    momentMindBenders: 'Casse-tête',
    momentDescBeforeSleep: 'Comédies douces et drames légers pour finir la journée en douceur',
    momentDescEveryoneWatching: 'Les films les mieux notés que tout le monde adore',
    momentDescQuickLunch: 'Courts et fun — parfait pour une pause',
    momentDescLateNight: 'Thrillers et mystères dont on ne décroche pas',
    momentDescInYourFeelings: 'Drames intenses qui touchent au cœur',
    momentDescFamilyTime: 'Divertissement pour toute la famille',
    momentDescAdrenaline: 'Action non-stop et aventures palpitantes',
    momentDescMindBenders: 'Sci-fi et mystères qui font réfléchir',

    // ── Movies — sort modes ───────────────────────────────────
    sortSmart: 'Intelligent',
    sortTopRated: 'Mieux notés',
    sortNewest: 'Récents',
    sortAZ: 'A-Z',

    // ── Movies — genre names ──────────────────────────────────
    genreAll: 'Tous',
    genreAction: 'Action',
    genreComedy: 'Comédie',
    genreThriller: 'Thriller',
    genreDrama: 'Drame',
    genreSciFi: 'Sci-Fi',
    genreHorror: 'Horreur',
    genreRomance: 'Romance',
    genreAdventure: 'Aventure',
    genreAnimation: 'Animation',
    genreDocumentary: 'Documentaire',
    genreCrime: 'Policier',
    genreMystery: 'Mystère',
    genreFamily: 'Famille',
    genreFantasy: 'Fantastique',
    genreWar: 'Guerre',
    genreReality: 'Télé-réalité',
    genreWestern: 'Western',

    // ── Movies — tab names ────────────────────────────────────
    tabNewHot: 'Nouveautés',
    tabHollywood: 'Hollywood',
    tabBollywood: 'Bollywood',
    tabInternational: 'International',

    // ── Series Page ───────────────────────────────────────────
    searchSeries: 'Rechercher des séries...',
    trendingRightNow: 'En ce moment',
    noSeriesMatch: 'Aucune série ne correspond',
    noSeriesGenre: 'Aucune série de ce genre ici',
    noSeriesInCategory: 'Aucune série dans cette catégorie',
    loadingSeries: 'Chargement des séries...',
    showMoreRemaining: 'Voir plus',
    remaining: 'restant(s)',
    loadingEpisodes: 'Chargement des épisodes...',
    episodesUnavailable: 'Épisodes non disponibles',
    season: 'Saison',
    episode: 'Épisode',
    noEpisodes: 'Aucun épisode disponible',

    // ── Series — mood rows ────────────────────────────────────
    bingeAllNight: 'Marathon nocturne',
    cozyNightIn: 'Soirée cocooning',
    getsYouHooked: 'Ça vous accroche',
    lightEasy: 'Léger & facile',
    quickEpisodes: 'Épisodes rapides',
    masterpieceTV: 'Chefs-d\'œuvre TV',

    // ── Series — tabs ─────────────────────────────────────────
    tabPlatformOriginals: 'Plateformes',
    tabTurkish: 'Turc',
    tabKorean: 'Coréen',
    tabAnime: 'Anime',

    // ── WorldEX / FrenchPage ──────────────────────────────────
    aTasteOfTheWorld: 'Un goût du monde',
    enteringWorldEX: 'Entrée dans WorldEX...',
    ambiLive: 'AmbiLive',
    ambiLiveDesc: 'Regardez du contenu anglais en français. Bientôt disponible.',
    channels: 'chaînes',
    noChannelsFor: 'Aucune chaîne disponible pour',
    exploring: 'Exploration de',

    // ── WorldEX — region names ────────────────────────────────
    regionMotherland: 'Mère Patrie',
    regionSahara: 'Traversée du Sahara',
    regionEurope: 'De Paris à Rome',
    regionPersian: 'Le Golfe & la Perse',
    regionSouthAsia: 'Bienvenue en Asie du Sud',
    regionCrescent: 'Croissant & Étoile',
    regionIsles: 'Les Îles',
    regionUSA: 'Big USA',
    regionPacific: 'Le Pacifique',
    regionAmericas: 'Les Amériques',
    regionAlwaysOn: 'Toujours en marche',

    // ── Content Detail Modal ──────────────────────────────────
    watchNow: 'Regarder',
    playNow: 'Lancer',
    addToFavorites: 'Ajouter aux favoris',
    close: 'Fermer',
    director: 'Réalisateur',
    cast: 'Acteurs',

    // ── VEE Widget ────────────────────────────────────────────
    veeHot: 'HOT',
    veeExplore: 'EXPLORE',

    // ── VEE Mood Overlay ──────────────────────────────────────
    videoIntelligence: 'Intelligence Vidéo',
    whatAreWeWatching: 'On regarde quoi ?',
    pickAVibe: 'Choisissez une ambiance, VEE s\'occupe du reste',
    letVeeFind: 'Laissez VEE vous trouver une pépite ce soir',
    moodAdrenaline: 'Montée d\'adrénaline',
    moodChill: 'Chill & Ambiance',
    moodMindGames: 'Jeux d\'esprit',
    moodFeelGood: 'Feel Good',
    moodDateNight: 'Soirée romantique',
    moodLateNight: 'Nuit Blanche',
    surpriseMe: 'Surprenez-moi',
    searchByTitle: 'Rechercher par titre, genre ou ambiance...',

    // ── Content Detail — type badge ─────────────────────────────
    typeMovie: 'Film',
    typeSeries: 'Série',

    // ── Home Page — breakers & error ─────────────────────────────
    unableToLoadTapRetry: 'Impossible de charger — appuyez pour réessayer',
    dPlusCollection: 'Collection D+',

    // ── Search status ────────────────────────────────────────────
    searchingEllipsis: 'Recherche...',
    top50Results: '50 premiers résultats',

    // ── Movies/Series — genre filter label ───────────────────────
    moviesLabel: 'films',
    seriesLabel: 'séries',

    // ── Player / Common ───────────────────────────────────────
    buffering: 'Mise en mémoire tampon...',
    error: 'Erreur',
    cancel: 'Annuler',
    back: 'Retour',

    // ── Feed Section ──────────────────────────────────────────
    whatsHappening: 'En ce moment sur DASH',
    showMoreFeed: 'Voir plus',
    liveNow: 'En direct',
    watchOnTivi: 'Regarder sur TiVi',
    seeOnDash: 'Voir sur DASH',
    reactionOye: 'OYÉ',
    reactionLove: 'J\'ADORE',
    reactionWild: 'FOU',
    beFirstToReact: 'Soyez le premier à réagir',
    insightBadge: 'AVIS',
    fromCommunity: 'De la communauté',
    premierLeagueLive: 'Premier League en direct',
    trendingOnTivi: 'Tendances sur TiVi',

    // ── Platforms Page ────────────────────────────────────────
    seriesAvailable: 'séries disponibles',
    noSeriesFound: 'Aucune série trouvée',

    // ── Stream Limit Overlay ──────────────────────────────────
    screenInUse: 'Écran en cours d\'utilisation',
    anotherDeviceStreaming: 'Un autre appareil diffuse en ce moment',
    accountSupports1Screen: 'Votre compte prend en charge 1 écran. Mettez à niveau pour regarder sur plusieurs appareils en même temps.',
    screensAtOnce: 'écrans simultanés',
    screensShareFamily: 'écrans — partagez avec la famille',
    contactUsWhatsApp: 'Contactez-nous sur WhatsApp pour changer de forfait',

    // ── Video Player ──────────────────────────────────────────
    reconnecting: 'Reconnexion',
    channelUnavailable: 'Chaîne indisponible',
    unstableConnection: 'Connexion instable',
    switchToStreamFlow: 'Passer à StreamFlow pour une lecture fluide',
    flowShort: 'Flow',

    // ── Player Controls ───────────────────────────────────────
    liveLabel: 'EN DIRECT',
    streamFlow: 'StreamFlow',
    hdLabel: 'HD',

    // ── App Updates ───────────────────────────────────────────
    updateAvailable: 'Mise à jour disponible',
    updatingDashTivi: 'Mise à jour de DashTivi+',

    // ── Footer / Branding ─────────────────────────────────────
    dashLifestyle: 'DASH Lifestyle',
    dashPremium: 'Premium',
    poweredByDash: 'Propulsé par',
  },
  en: {
    // ── Navigation ────────────────────────────────────────────
    navHome: 'Home',
    navLiveTV: 'Live TV',
    navMovies: 'Movies',
    navSeries: 'Series',
    navWorldEX: 'WorldEX',
    navHub: 'Hub',
    navFrench: 'French',

    // ── Header ────────────────────────────────────────────────
    welcome: 'Welcome',
    muteAmbient: 'Mute ambient',
    playAmbient: 'Play ambient',
    logout: 'Logout',
    poweredBy: 'Powered by',

    // ── Access Code Login ─────────────────────────────────────
    premiumStreaming: 'Premium Streaming',
    accessCode: 'Access Code',
    accessCodePlaceholder: 'DASH-SL-001',
    enter: 'Enter',
    verifying: 'Verifying',
    enterCodeFromDash: 'Enter the code from your DASH subscription',
    pleaseEnterCode: 'Please enter your access code',
    invalidCode: 'Invalid access code',
    connectionError: 'Connection error — check your internet',

    // ── Welcome Page ──────────────────────────────────────────
    signIn: 'Sign In',
    showmaxBadge: 'Showmax shut down. We didn\'t.',
    heroTitle1: 'Showmax is gone.',
    heroTitle2: 'Your streaming isn\'t.',
    heroSubtitle: '60,000+ movies. 11,000 live channels. YouTube trailers. AI-powered picks.',
    heroPrice: 'From $3/month.',
    heroCTA: 'Start Watching — Free for 48 Hours',
    heroFooter: 'No credit card. No dish. Just your phone.',
    veeSmartPicks: 'VEE Smart Picks',
    veeSmartPicksDesc: 'AI that learns what you love and curates your feed',
    youtubeTrailers: 'YouTube Trailers',
    youtubeTrailersDesc: 'Preview any movie before you commit',
    worksOn3G: 'Works on 3G',
    worksOn3GDesc: 'Eco mode for any connection speed',
    whatsStreaming: 'What\'s streaming right now',
    whatsStreamingDesc: 'Movies, series, live TV — all in one place',
    first48Free: 'First 48 hours free',
    perMonth: '/month',
    pricingDesc: 'Orange Money \u2022 Cancel anytime \u2022 Works on any device',
    startFreeTrial: 'Start Free Trial',
    enterTrialCode: 'Enter your trial code to start streaming',
    startWatching: 'Start Watching',
    verifyingLogin: 'Verifying...',
    freeTrialNote: '48-hour free trial \u2022 No credit card required',

    // ── Home Page ─────────────────────────────────────────────
    heroGoodMorning: 'Good Morning',
    heroGoodMorningSubtitle: 'News. Sports. Everything you need before the day starts.',
    heroAfternoonEscape: 'Afternoon Escape',
    heroAfternoonSubtitle: 'Movies worth your time. Series you won\'t pause.',
    heroPrimeTime: 'Prime Time',
    heroPrimeTimeSubtitle: 'The matches are on. The movies are ready. You choose.',
    heroLateNight: 'Late Night',
    heroLateNightSubtitle: 'Just you and the screen. No rush.',
    heroCTAStartWatching: 'Start Watching',
    heroCTAExplore: 'Explore',
    heroCTAWatchNow: 'Watch Now',
    heroCTADiveIn: 'Dive In',
    heroDefault: 'Curated entertainment, live sports, and world cinema. Your experience starts here.',
    continueWatching: 'Continue Watching',
    justNow: 'Just now',
    minsAgo: 'm ago',
    hoursAgo: 'h ago',
    daysAgo: 'd ago',
    recently: 'Recently',
    more: 'More',
    seeAll: 'See All',
    sportsBreak: 'Sports Break',
    diveRightBackIn: 'Dive Right Back In',
    getInComfortZone: 'Get in Your Comfort Zone',
    trySomethingNew: 'Try Something New',
    hottestFixtures: 'Hottest Fixtures',
    discover: 'Discover',
    dashExclusives: 'DASH Exclusives',
    forYou: 'For You',
    forYouDesc: 'Personalized picks based on your taste',
    becauseYouWatched: 'Because You Watched',
    sinceYouLiked: 'SINCE YOU LIKED',
    similarTo: 'Similar to',
    live: 'Live',
    movie: 'Movie',

    // ── Home Page — collection names ──────────────────────────
    liveSports: 'Live Sports',
    justDropped: 'Just Dropped',
    kidsFamily: 'Kids & Family',
    stayInformed: 'Stay Informed',
    fourKExperience: '4K Experience',
    bingeWorthy: 'Binge-Worthy',
    aroundTheWorld: 'Around the World',

    // ── Home Page — collection descriptions ──────────────────
    liveSportsDesc: 'Premier League, beIN, Sky Sports & more',
    justDroppedDesc: 'Just added — 2025 & 2026',
    kidsFamilyDesc: 'Nick, Disney, Cartoon Network & more',
    stayInformedDesc: 'CNN, BBC, Al Jazeera, Sky News',
    fourKExperienceDesc: 'Crystal clear blockbusters',
    bingeWorthyDesc: 'K-Drama, Turkish & international series',
    aroundTheWorldDesc: 'France, Germany, Arabic, India & more',

    // ── Originals ────────────────────────────────────────────
    originalsSubtitle: 'Stream from Netflix, Prime, HBO & more',
    openNetflix: 'Open Netflix',

    // ── Quick nav pills ───────────────────────────────────────
    sports: 'Sports',
    news: 'News',
    movies: 'Movies',
    series: 'Series',
    africa: 'Africa',
    kids: 'Kids',
    music: 'Music',
    faith: 'Faith',

    // ── Sport tabs ────────────────────────────────────────────
    football: 'Football',
    beinZone: 'beIN Zone',
    tennis: 'Tennis',

    // ── Live TV Page ──────────────────────────────────────────
    searchChannels: 'Search channels...',
    searching: 'Searching...',
    channelFound: 'channel found',
    channelsFound: 'channels found',
    channelDataUpdating: 'Channel data updating...',
    loadingChannels: 'Loading channels...',
    noChannelsMatch: 'No channels match your search',
    browseAllCategories: 'Browse All Categories',
    seeLess: 'See less',
    unableToLoad: 'Unable to load',
    retry: 'Retry',
    noChannelsInCategory: 'No channels in this category',
    selectQuality: 'Select quality',
    best: 'Best',
    high: 'High',
    standard: 'Standard',
    loading: 'Loading...',

    // ── Live TV Theme names ───────────────────────────────────
    themeSports: 'Sports',
    themeEntertainment: 'Entertainment',
    themeNews: 'News',
    themeKids: 'Kids & Family',
    themeCinema: 'Movie Channels',
    themeMusic: 'Music & Vibes',
    themeDiscovery: 'Docs & Discovery',
    themePremium4K: 'Premium 4K',
    themeFaith: 'Faith',

    // ── Movies Page ───────────────────────────────────────────
    searchMovies: 'Search movies...',
    trendingNow: 'Trending Now',
    showMore: 'Show More',
    showing: 'Showing',
    of: 'of',
    clearFilter: 'Clear filter',
    noMoviesMatch: 'No movies match your search',
    noMoviesGenre: 'No movies of this genre here',
    showAll: 'Show all',
    noMoviesInCategory: 'No movies in this category',
    unableToLoadRetry: 'Unable to load — tap to retry',
    top50: 'Top 50 results',
    found: 'found',
    download: 'Download',

    // ── Movies — mood rows ────────────────────────────────────
    lateNightThrills: 'Late Night Thrills',
    dateNight: 'Date Night',
    feelGoodEnergy: 'Feel Good Energy',
    edgeOfSeat: 'Edge of Your Seat',
    easyMorning: 'Easy Morning Watch',
    mindExpanding: 'Mind Expanding',
    criticallyAcclaimed: 'Critically Acclaimed',

    // ── Moment Packs ─────────────────────────────────────────
    momentBeforeSleep: 'Before Sleep',
    momentEveryoneWatching: 'Everyone\'s Watching',
    momentQuickLunch: 'Quick Lunch Break',
    momentLateNight: 'Late Night Rabbit Hole',
    momentInYourFeelings: 'In Your Feelings',
    momentFamilyTime: 'Family Time',
    momentAdrenaline: 'Adrenaline Rush',
    momentMindBenders: 'Mind Benders',
    momentDescBeforeSleep: 'Gentle comedies and light dramas to wind down your day',
    momentDescEveryoneWatching: 'The highest-rated movies everyone loves right now',
    momentDescQuickLunch: 'Short and fun — perfect for a break',
    momentDescLateNight: 'Thrillers and mysteries you can\'t stop watching',
    momentDescInYourFeelings: 'Intense dramas that hit you in the heart',
    momentDescFamilyTime: 'Entertainment the whole family can enjoy',
    momentDescAdrenaline: 'Non-stop action and edge-of-your-seat adventures',
    momentDescMindBenders: 'Sci-fi and mysteries that make you think',

    // ── Movies — sort modes ───────────────────────────────────
    sortSmart: 'Smart',
    sortTopRated: 'Top Rated',
    sortNewest: 'Newest',
    sortAZ: 'A-Z',

    // ── Movies — genre names ──────────────────────────────────
    genreAll: 'All',
    genreAction: 'Action',
    genreComedy: 'Comedy',
    genreThriller: 'Thriller',
    genreDrama: 'Drama',
    genreSciFi: 'Sci-Fi',
    genreHorror: 'Horror',
    genreRomance: 'Romance',
    genreAdventure: 'Adventure',
    genreAnimation: 'Animation',
    genreDocumentary: 'Documentary',
    genreCrime: 'Crime',
    genreMystery: 'Mystery',
    genreFamily: 'Family',
    genreFantasy: 'Fantasy',
    genreWar: 'War',
    genreReality: 'Reality',
    genreWestern: 'Western',

    // ── Movies — tab names ────────────────────────────────────
    tabNewHot: 'New & Hot',
    tabHollywood: 'Hollywood',
    tabBollywood: 'Bollywood',
    tabInternational: 'International',

    // ── Series Page ───────────────────────────────────────────
    searchSeries: 'Search series...',
    trendingRightNow: 'Trending Right Now',
    noSeriesMatch: 'No series match your search',
    noSeriesGenre: 'No series of this genre here',
    noSeriesInCategory: 'No series in this category',
    loadingSeries: 'Loading series...',
    showMoreRemaining: 'Show More',
    remaining: 'remaining',
    loadingEpisodes: 'Loading episodes...',
    episodesUnavailable: 'Episodes unavailable',
    season: 'Season',
    episode: 'Episode',
    noEpisodes: 'No episodes available',

    // ── Series — mood rows ────────────────────────────────────
    bingeAllNight: 'Binge All Night',
    cozyNightIn: 'Cozy Night In',
    getsYouHooked: 'Gets You Hooked',
    lightEasy: 'Light & Easy',
    quickEpisodes: 'Quick Episodes',
    masterpieceTV: 'Masterpiece TV',

    // ── Series — tabs ─────────────────────────────────────────
    tabPlatformOriginals: 'Platform Originals',
    tabTurkish: 'Turkish',
    tabKorean: 'Korean',
    tabAnime: 'Anime',

    // ── WorldEX / FrenchPage ──────────────────────────────────
    aTasteOfTheWorld: 'A taste of the world',
    enteringWorldEX: 'Entering WorldEX...',
    ambiLive: 'AmbiLive',
    ambiLiveDesc: 'Watch English content in French. Coming soon.',
    channels: 'channels',
    noChannelsFor: 'No channels available for',
    exploring: 'Exploring',

    // ── WorldEX — region names ────────────────────────────────
    regionMotherland: 'Motherland',
    regionSahara: 'Crossing the Sahara',
    regionEurope: 'From Paris to Rome',
    regionPersian: 'The Gulf & Persian',
    regionSouthAsia: 'Welcome to South Asia',
    regionCrescent: 'Crescent & Star',
    regionIsles: 'The Isles',
    regionUSA: 'Big USA',
    regionPacific: 'The Pacific',
    regionAmericas: 'The Americas',
    regionAlwaysOn: 'Always On',

    // ── Content Detail Modal ──────────────────────────────────
    watchNow: 'Watch Now',
    playNow: 'Play Now',
    addToFavorites: 'Add to favorites',
    close: 'Close',
    director: 'Director',
    cast: 'Cast',

    // ── VEE Widget ────────────────────────────────────────────
    veeHot: 'HOT',
    veeExplore: 'EXPLORE',

    // ── VEE Mood Overlay ──────────────────────────────────────
    videoIntelligence: 'Video Intelligence',
    whatAreWeWatching: 'What are we watching?',
    pickAVibe: 'Pick a vibe, VEE handles the rest',
    letVeeFind: 'Let VEE find something new tonight',
    moodAdrenaline: 'Adrenaline Rush',
    moodChill: 'Chill & Vibes',
    moodMindGames: 'Mind Games',
    moodFeelGood: 'Feel Good',
    moodDateNight: 'Date Night',
    moodLateNight: 'Late Night',
    surpriseMe: 'Surprise Me',
    searchByTitle: 'Search by title, genre, or vibe...',

    // ── Content Detail — type badge ─────────────────────────────
    typeMovie: 'Movie',
    typeSeries: 'Series',

    // ── Home Page — breakers & error ─────────────────────────────
    unableToLoadTapRetry: 'Unable to load — tap to retry',
    dPlusCollection: 'D+ Collection',

    // ── Search status ────────────────────────────────────────────
    searchingEllipsis: 'Searching...',
    top50Results: 'Top 50 results',

    // ── Movies/Series — genre filter label ───────────────────────
    moviesLabel: 'movies',
    seriesLabel: 'series',

    // ── Player / Common ───────────────────────────────────────
    buffering: 'Buffering...',
    error: 'Error',
    cancel: 'Cancel',
    back: 'Back',

    // ── Feed Section ──────────────────────────────────────────
    whatsHappening: 'What\'s happening on DASH',
    showMoreFeed: 'Show More',
    liveNow: 'Live Now',
    watchOnTivi: 'Watch on TiVi',
    seeOnDash: 'See on DASH',
    reactionOye: 'OYÉ',
    reactionLove: 'LOVE',
    reactionWild: 'WILD',
    beFirstToReact: 'Be the first to react',
    insightBadge: 'INSIGHT',
    fromCommunity: 'From the community',
    premierLeagueLive: 'Premier League Live',
    trendingOnTivi: 'Trending on TiVi',

    // ── Platforms Page ────────────────────────────────────────
    seriesAvailable: 'series available',
    noSeriesFound: 'No series found',

    // ── Stream Limit Overlay ──────────────────────────────────
    screenInUse: 'Screen in use',
    anotherDeviceStreaming: 'Another device is streaming right now',
    accountSupports1Screen: 'Your account supports 1 screen. Upgrade to watch on multiple devices at the same time.',
    screensAtOnce: 'screens at once',
    screensShareFamily: 'screens — share with family',
    contactUsWhatsApp: 'Contact us on WhatsApp to upgrade your plan',

    // ── Video Player ──────────────────────────────────────────
    reconnecting: 'Reconnecting',
    channelUnavailable: 'Channel unavailable',
    unstableConnection: 'Unstable connection',
    switchToStreamFlow: 'Switch to StreamFlow for smooth playback',
    flowShort: 'Flow',

    // ── Player Controls ───────────────────────────────────────
    liveLabel: 'LIVE',
    streamFlow: 'StreamFlow',
    hdLabel: 'HD',

    // ── App Updates ───────────────────────────────────────────
    updateAvailable: 'Update available',
    updatingDashTivi: 'Updating DashTivi+',

    // ── Footer / Branding ─────────────────────────────────────
    dashLifestyle: 'DASH Lifestyle',
    dashPremium: 'Premium',
    poweredByDash: 'Powered by',
  },
} as const

export type TranslationKey = keyof typeof translations.fr

export function t(lang: Lang, key: TranslationKey): string {
  return translations[lang][key]
}

export function detectLang(): Lang {
  const stored = localStorage.getItem('tivi-lang')
  if (stored === 'en' || stored === 'fr') return stored
  const nav = navigator.language.toLowerCase()
  return nav.startsWith('fr') ? 'fr' : nav.startsWith('en') ? 'en' : 'fr'
}

// ── React Context (optional — components can also use t(lang, key) with prop drilling) ──

import { createContext, useContext, useState, useCallback, type ReactNode } from 'react'

interface LanguageContextValue {
  lang: Lang
  t: (key: TranslationKey) => string
  toggleLang: () => void
}

const LanguageContext = createContext<LanguageContextValue | null>(null)

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [lang, setLang] = useState<Lang>(detectLang)
  const toggleLang = useCallback(() => {
    setLang(prev => {
      const next = prev === 'fr' ? 'en' : 'fr'
      localStorage.setItem('tivi-lang', next)
      return next
    })
  }, [])
  const translate = useCallback(
    (key: TranslationKey) => translations[lang][key],
    [lang]
  )
  return (
    <LanguageContext.Provider value={{ lang, t: translate, toggleLang }}>
      {children}
    </LanguageContext.Provider>
  )
}

export function useLanguage() {
  const ctx = useContext(LanguageContext)
  if (!ctx) throw new Error('useLanguage must be used within LanguageProvider')
  return ctx
}
