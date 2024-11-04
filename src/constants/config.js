const API_BASE_URL = 'http://localhost:3000'

const DEFAULTS = {
  volume: 1,
  playerAutoplay: true,
  playerPause: true,
  playerAutocomplete: true,
  playerDeband: false,
  rssQuality: '1080',
  rssFeedsNew: [['New Releases']],
  rssAutoplay: true,
  torrentSpeed: 5,
  torrentPersist: false,
  torrentDHT: false,
  torrentPeX: false,
  torrentPort: 0,
  dhtPort: 0,
  missingFont: true,
  maxConns: 50,
  subtitleLanguage: 'eng',
  audioLanguage: 'jpn',
  enableDoH: false,
  doHURL: 'https://cloudflare-dns.com/dns-query',
  showDetailsInRPC: true,
  smoothScroll: true,
  cards: 'small',
  expandingSidebar: true,
  torrentPathNew: undefined,
  font: undefined,
  angle: 'default',
  toshoURL: decodeURIComponent(
    atob('aHR0cHM6Ly9mZWVkLmFuaW1ldG9zaG8ub3JnLw==')
  ),
  sources: {}
};

const TIME_UNITS = [
  { key: 'segundo', limit: 60, divisor: 1 },
  { key: 'minuto', limit: 3600, divisor: 60 },
  { key: 'hora', limit: 86400, divisor: 3600 },
  { key: 'dia', limit: 2592000, divisor: 86400 }
];

module.exports = { API_BASE_URL, DEFAULTS, TIME_UNITS };
