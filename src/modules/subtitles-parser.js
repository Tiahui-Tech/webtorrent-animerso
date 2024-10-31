const fs = require('fs');
const path = require('path');

async function parseSubtitles(filePath) {
  const { default: Metadata } = await import('matroska-metadata');
  console.log('Initializing parser for file: ' + path.basename(filePath));

  const file = {
    name: path.basename(filePath),
    stream: () => fs.createReadStream(filePath),
    [Symbol.asyncIterator]: async function* () {
      const stream = this.stream();
      for await (const chunk of stream) {
        yield chunk;
      }
    }
  };

  const metadata = new Metadata(file);
  const subtitles = {};

  try {
    const tracks = await metadata.getTracks();

    tracks.forEach(track => {
      subtitles[track.number] = {
        track: track,
        cues: []
      };
    });

    metadata.on('subtitle', (subtitle, trackNumber) => {
      if (subtitles[trackNumber]) {
        subtitles[trackNumber].cues.push(subtitle);
      }
    });

    if (file.name.endsWith('.mkv') || file.name.endsWith('.webm')) {
      const fileStream = file[Symbol.asyncIterator]();
      
      // Without this, the code doesn't work
      try {
        for await (const chunk of metadata.parseStream(fileStream)) {
        }
      } catch (error) {
        console.warn('Error parsing subtitle chunk:', error);
        // Ignore the error and continue processing
      }

      console.log('Finished parsing subtitles');
      return subtitles;
    } else {
      throw new Error('Unsupported file format: ' + file.name);
    }
  } catch (error) {
    console.error('Error parsing subtitles:', error);
    throw error;
  }
}

const convertAssTextToVtt = (text) => {
  // Skip drawing commands as they will be handled separately
  if (text.includes('\\p1') && text.includes('m 0 0 l')) {
    return '';
  }

  const styles = [];
  const styleMatches = text.match(/\{[^}]+\}/g) || [];
  
  styleMatches.forEach(match => {
    // Parse ASS color codes in format c&HRRGGBB&
    if (match.includes('c&H')) {
      const colorMatch = match.match(/c&H([0-9A-Fa-f]{6})&/);
      if (colorMatch) {
        styles.push(`color: #${colorMatch[1]}`);
      }
    }
    
    // Extract font size
    const fsMatch = match.match(/\\fs(\d+)/);
    if (fsMatch) {
      styles.push(`font-size: ${fsMatch[1]}px`);
    }

    // Map ASS alignment codes (1-9) to CSS text alignment
    const anMatch = match.match(/\\an(\d)/);
    if (anMatch) {
      const alignMap = {
        '1': 'left', '2': 'center', '3': 'right',
        '4': 'left', '5': 'center', '6': 'right',
        '7': 'left', '8': 'center', '9': 'right'
      };
      styles.push(`text-align: ${alignMap[anMatch[1]] || 'center'}`);
    }
  });

  // Clean ASS commands and normalize line breaks
  text = text
    .replace(/\{[^}]+\}/g, '')
    .replace(/\\N/g, '\n')
    .replace(/\\n/g, '\n')
    .replace(/\{\\N\}/g, '\n')
    .replace(/\{\\n\}/g, '\n');

  text = text.split('\n')
    .map(line => line.trim())
    .filter(line => line.length > 0)
    .join('\n');

  // Wrap multiline text or text after drawing in a subtitle box
  if (text.includes('\n') || styleMatches.some(s => s.includes('\\p1'))) {
    const styleAttr = styles.length > 0 ? ` style="${styles.join('; ')}"` : '';
    return `<div class="subtitle-box"${styleAttr}>${text}</div>`;
  }

  if (styles.length > 0) {
    return `<span style="${styles.join('; ')}">${text}</span>`;
  }

  return text;
};

function formatVttTime(milliseconds) {
  const totalSeconds = Math.floor(milliseconds / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  const ms = milliseconds % 1000;

  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}.${String(ms).padStart(3, '0')}`;
}

module.exports = {
  parseSubtitles,
  convertAssTextToVtt,
  formatVttTime
};
