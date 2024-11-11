const React = require('react');
const { TIME_UNITS } = require('../constants/config');
const { Icon } = require('@iconify/react');

const timeAgo = (dateISO) => {
  const now = new Date();
  const date = new Date(dateISO);
  const seconds = Math.floor((now - date) / 1000);

  for (const { key, limit, divisor } of TIME_UNITS) {
    if (seconds < limit) {
      const quantity = Math.floor(seconds / divisor);
      return `Hace ${quantity} ${key}${quantity !== 1 ? 's' : ''}`;
    }
  }
  const { key, divisor } = TIME_UNITS[TIME_UNITS.length - 1];
  const quantity = Math.floor(seconds / divisor);
  return `Hace ${quantity} ${key}${quantity !== 1 ? 's' : ''}`;
};

const normalize = (title) => title.toLowerCase().replace(/[^a-z0-9]/g, '');

const getAnimeFlags = (subtitles) => {
  const allowedFlags = ['mx', 'es', 'us'];
  const flagRegex = /\[([a-z]{2})\]/g;
  const matches = subtitles.match(flagRegex);

  if (!matches) return [];

  return allowedFlags
    .filter((flag) => matches.some((match) => match.includes(flag)))
    .map((flag) => (
      <Icon
        key={`flag-icon-${flag}`}
        icon={`flagpack:${flag}`}
        width={24}
        height={24}
      />
    ));
};

const getFormatIcon = (format) => {
  const icons = {
    TV: 'gravity-ui:tv',
    MOVIE: 'gravity-ui:video',
    OVA: 'gravity-ui:tv',
    ONA: 'gravity-ui:tv',
    MUSIC: 'gravity-ui:music-note',
    MANGA: 'gravity-ui:book-open',
    NOVEL: 'gravity-ui:book-open',
    ONE_SHOT: 'gravity-ui:book-open'
  };
  return icons[format] ? <Icon icon={icons[format]} /> : null;
};

const getContrastColor = (hexColor) => {
  hexColor = hexColor.replace('#', '');

  const r = parseInt(hexColor.substr(0, 2), 16);
  const g = parseInt(hexColor.substr(2, 2), 16);
  const b = parseInt(hexColor.substr(4, 2), 16);

  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;

  return luminance > 0.5 ? '#000000' : '#FFFFFF';
};

function getNeonColor(hexColor) {
  let r = parseInt(hexColor.slice(1, 3), 16);
  let g = parseInt(hexColor.slice(3, 5), 16);
  let b = parseInt(hexColor.slice(5, 7), 16);

  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);

  if (max === min) {
    r = 255;
    g = 0;
    b = 0;
  } else {
    const saturationIncrease = 5;
    r = r === max ? 255 : Math.round((r - min) * saturationIncrease);
    g = g === max ? 255 : Math.round((g - min) * saturationIncrease);
    b = b === max ? 255 : Math.round((b - min) * saturationIncrease);
  }

  r = Math.max(Math.min(r, 255), 100);
  g = Math.max(Math.min(g, 255), 100);
  b = Math.max(Math.min(b, 255), 100);

  const neonHex = '#' +
    r.toString(16).padStart(2, '0') +
    g.toString(16).padStart(2, '0') +
    b.toString(16).padStart(2, '0');

  return neonHex;
}

const sortColorsByBrightness = (colors) => {
  return colors
    .sort((a, b) => {
      if (
        a.saturation > 0.5 &&
        a.lightness > 0.5 &&
        (b.saturation <= 0.5 || b.lightness <= 0.5)
      ) {
        return -1;
      }
      if (
        b.saturation > 0.5 &&
        b.lightness > 0.5 &&
        (a.saturation <= 0.5 || a.lightness <= 0.5)
      ) {
        return 1;
      }
      return b.intensity - a.intensity;
    })
    .map((color) => color.hex);
};

const genGlassStyle = (color, opacity = 15, blur = 15) => {
  return {
    background: `${color}${opacity}`,
    borderRadius: '16px',
    boxShadow: '0 4px 30px rgba(0, 0, 0, 0.3)',
    backdropFilter: `blur(${blur}px)`,
    WebkitBackdropFilter: `blur(${blur}px)`,
    border: `2px solid ${color}${opacity}`
  };
};

const translateGenres = (genres) => {
  if (!genres) return [];
  
  const translations = {
    'Comedy': 'Comedia',
    'Fantasy': 'Fantasía',
    'Romance': 'Romance',
    'Slice of Life': 'Vida Cotidiana',
    'Supernatural': 'Sobrenatural',
    'Action': 'Acción',
    'Adventure': 'Aventura',
    'Drama': 'Drama',
    'Mahou Shoujo': 'Mahou Shoujo',
    'Mystery': 'Misterio',
    'Psychological': 'Psicológico',
    'Sci-Fi': 'Ciencia Ficción',
    'Ecchi': 'Ecchi',
    'Thriller': 'Suspenso',
    'Horror': 'Terror',
    'Mecha': 'Mecha',
    'Sports': 'Deportes',
    'Music': 'Música'
  };

  return genres.map(genre => translations[genre] || genre);
}

const debounce = (func, delay) => {
  let timeoutId;
  return (...args) => {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => func(...args), delay);
  };
};

const deepMerge = (target, source) => {
  for (const key in source) {
    if (source.hasOwnProperty(key)) {
      if (source[key] && typeof source[key] === 'object') {
        target[key] = target[key] || {};
        deepMerge(target[key], source[key]);
      } else {
        target[key] = source[key];
      }
    }
  }
  return target;
}

module.exports = {
  timeAgo,
  normalize,
  getAnimeFlags,
  getFormatIcon,
  getContrastColor,
  getNeonColor,
  sortColorsByBrightness,
  genGlassStyle,
  translateGenres,
  debounce,
  deepMerge
};
