const remote = require('@electron/remote')
const fs = require('fs')
const path = require('path')
const parallel = require('run-parallel')
const { fork } = require('child_process')
const { convertAssTextToVtt, formatVttTime } = require('../../modules/subtitles-parser')
const eventBus = require('../lib/event-bus')
const { dispatch } = require('../lib/dispatcher')

module.exports = class SubtitlesController {
  constructor(state) {
    this.state = state
  }

  openSubtitles() {
    const filenames = remote.dialog.showOpenDialogSync({
      title: 'Select a subtitles file.',
      filters: [{ name: 'Subtitles', extensions: ['vtt', 'srt'] }],
      properties: ['openFile']
    })
    if (!Array.isArray(filenames)) return
    this.addSubtitles(filenames, true)
  }

  selectSubtitle(ix) {
    this.state.playing.subtitles.selectedIndex = ix
  }

  toggleSubtitlesMenu() {
    const subtitles = this.state.playing.subtitles
    subtitles.showMenu = !subtitles.showMenu
  }

  addSubtitles(files, autoSelect) {
    // Subtitles are only supported when playing video files
    if (this.state.playing.type !== 'video') return
    if (files.length === 0) return
    const subtitles = this.state.playing.subtitles

    // Read the files concurrently, then add all resulting subtitle tracks
    const tasks = files.map((file) => (cb) => loadSubtitle(file, cb))
    parallel(tasks, (err, tracks) => {
      if (err) return dispatch('error', err)

      // No dupes allowed
      tracks.forEach((track, i) => {
        let trackIndex = subtitles.tracks.findIndex((t) =>
          track.filePath === t.filePath)

        // Add the track
        if (trackIndex === -1) {
          trackIndex = subtitles.tracks.push(track) - 1
        }

        // If we're auto-selecting a track, try to find one in the user's language
        if (autoSelect && (i === 0 || isSystemLanguage(track.language))) {
          subtitles.selectedIndex = trackIndex
        }
      })

      // Finally, make sure no two tracks have the same label
      relabelAndFilterSubtitles(subtitles)
    })
  }

  async checkForSubtitles(torrentSummary) {
    if (this.state.playing.type !== 'video') return
    console.log('checkForSubtitles torrentSummary', torrentSummary);
    if (!torrentSummary || !torrentSummary.progress) return

    const filePath = path.join(torrentSummary.path, torrentSummary.name)

    // Check if the file exists
    if (!fs.existsSync(filePath)) {
      console.log(`File does not exist: ${filePath}`);
      eventBus.emit('subtitlesUpdate', { forceStop: true });
      return;
    }

    try {
      console.log('Attempting to parse subtitles...');
      const subtitles = await this.parseSubtitles(filePath)
      console.log('Subtitles parsed successfully');
      await this.convertAndAddSubtitles(subtitles, torrentSummary.infoHash)
      console.log('Subtitles converted and added');
    } catch (err) {
      console.error('Error checking for subtitles: ', err)
    }
  }

  parseSubtitles(filePath) {
    console.log('parseSubtitles filePath', filePath);
    return new Promise((resolve, reject) => {
      const workerPath = path.join(__dirname, '..', '..', 'modules', 'subtitles-worker.js');
      console.log('Worker path:', workerPath);
      
      const child = fork(workerPath, [], { 
        stdio: ['pipe', 'pipe', 'pipe', 'ipc'],
        env: { ...process.env, ELECTRON_RUN_AS_NODE: '1' }
      });

      let timeoutId;

      child.stdout.on('data', (data) => {
        console.log(`Worker stdout: ${data}`);
      });

      child.stderr.on('data', (data) => {
        console.error(`Worker stderr: ${data}`);
      });

      child.on('message', (result) => {
        console.log('Received message from worker:', result);
        clearTimeout(timeoutId);
        if (result.success) {
          resolve(result.subtitles);
        } else {
          reject(new Error(result.error));
        }
        child.kill();
      });

      child.on('error', (err) => {
        console.error('Worker error:', err);
        clearTimeout(timeoutId);
        reject(err);
        child.kill();
      });

      child.on('exit', (code, signal) => {
        console.log(`Worker process exited with code ${code} and signal ${signal}`);
        clearTimeout(timeoutId);
        if (code !== 0) {
          reject(new Error(`Worker exited with code ${code}`));
        }
      });

      console.log('Sending file path to worker', filePath);
      child.send(filePath);

      // Set a timeout to kill the worker if it doesn't respond
      timeoutId = setTimeout(() => {
        console.error('Worker timed out');
        child.kill();
        reject(new Error('Subtitle parsing timed out'));
      }, 30000); // 30 seconds timeout
    });
  }

  isSubtitle(file) {
    const name = typeof file === 'string' ? file : file.name
    const ext = path.extname(name).toLowerCase()
    return ext === '.srt' || ext === '.vtt'
  }

  async convertAndAddSubtitles(subtitles, infoHash) {
    const convertedTracks = [];

    for (const [trackNumber, subtitle] of Object.entries(subtitles)) {
      if (subtitle.track.type === 'ass') {
        try {
          const vttContent = await this.convertAssToVtt(subtitle);
          convertedTracks.push({
            buffer: 'data:text/vtt;base64,' + Buffer.from(vttContent).toString('base64'),
            language: subtitle.track.language || 'Unknown',
            label: subtitle.track.name || `Track ${trackNumber}`,
            filePath: `memory:${trackNumber}`,
            infoHash
          });
        } catch (error) {
          console.error('Error converting subtitle:', error);
        }
      }
    }

    const updatedTracks = [...convertedTracks];
    let selectedIndex = this.state.playing.subtitles.selectedIndex;
    if (selectedIndex === -1 && convertedTracks.length > 0) {
      selectedIndex = this.state.playing.subtitles.tracks.length;
    }

    console.log('1- filtering subtitles');
    const uniqueSubtitles = relabelAndFilterSubtitles(updatedTracks, infoHash);
    console.log('2- sorting subtitles');
    const filteredAndSortedTracks = filterRenameAndSortSubtitles(uniqueSubtitles);
    console.log('3- parsed subtitles');

    console.log('filteredAndSortedTracks', filteredAndSortedTracks);

    this.state.playing.subtitles.selectedIndex = selectedIndex;

    console.log('emit subtitlesUpdate', infoHash);
    eventBus.emit('subtitlesUpdate', {
      infoHash,
      tracks: filteredAndSortedTracks
    });
  }

  convertAssToVtt(subtitle) {
    console.log('convertAssToVtt subtitle', subtitle.cues);
    return new Promise((resolve) => {
      const vttContent = 'WEBVTT\n\n' + subtitle.cues.map((cue) => {
        const startTime = formatVttTime(cue.time);
        const endTime = formatVttTime(cue.time + cue.duration);
        
        let cueSettings = [];
        
        if (cue.text.includes('subtitle-box')) {
          cueSettings.push('line:-4');
          cueSettings.push('position:50');
          cueSettings.push('align:center');
          cueSettings.push('size:80%');
        }

        const text = convertAssTextToVtt(cue.text);
        const settings = cueSettings.length ? ` ${cueSettings.join(' ')}` : '';

        return `${startTime} --> ${endTime}${settings}\n${text}\n`;
      }).join('\n');

      resolve(vttContent);
    });
  }
}

function loadSubtitle(file, cb) {
  // Lazy load to keep startup fast
  const concat = require('simple-concat')
  const LanguageDetect = require('languagedetect')
  const srtToVtt = require('srt-to-vtt')

  // Read the .SRT or .VTT file, parse it, add subtitle track
  const filePath = typeof file === 'string' ? file : file.path

  if (!filePath) {
    return dispatch('error', 'Can\'t parse subtitles file.')
  }

  const vttStream = fs.createReadStream(filePath).pipe(srtToVtt())

  concat(vttStream, (err, buf) => {
    if (err) return cb(new Error('Can\'t parse subtitles file.'))

    // Detect what language the subtitles are in
    const vttContents = buf.toString().replace(/(.*-->.*)/g, '')
    let langDetected = (new LanguageDetect()).detect(vttContents, 2)
    langDetected = langDetected.length ? langDetected[0][0] : 'subtitle'
    langDetected = langDetected.slice(0, 1).toUpperCase() + langDetected.slice(1)

    const track = {
      buffer: 'data:text/vtt;base64,' + buf.toString('base64'),
      language: langDetected,
      label: langDetected,
      filePath
    }

    cb(null, track)
  })
}

// Checks whether a language name like 'English' or 'German' matches the system
// language, aka the current locale
function isSystemLanguage(language) {
  const iso639 = require('iso-639-1')
  const osLangISO = window.navigator.language.split('-')[0] // eg 'en'
  const langIso = iso639.getCode(language) // eg 'de' if language is 'German'
  return langIso === osLangISO
}

// Filters and relabels subtitle tracks to ensure uniqueness and proper labeling
// Removes duplicate and empty subtitles, filters by infoHash, and labels tracks by language
// Example: 'English', 'English 2', 'Spanish', etc.
function relabelAndFilterSubtitles(subtitles, infoHash) {
  const counts = {}
  const uniquePaths = new Set()
  const uniqueSubtitles = []

  subtitles.forEach(track => {
    // Avoid duplicate subtitles based on filePath, remove empty subtitles, and filter by infoHash
    if (!uniquePaths.has(track.filePath) &&
      track.buffer !== 'data:text/vtt;base64,V0VCVlRUCgo=' &&
      track.infoHash === infoHash) {
      uniquePaths.add(track.filePath)
      uniqueSubtitles.push(track)

      const lang = track.language
      counts[lang] = (counts[lang] || 0) + 1
      track.label = counts[lang] > 1 ? `${lang} ${counts[lang]}` : lang
    }
  })

  return uniqueSubtitles
}

function filterRenameAndSortSubtitles(subtitles) {
  const languageMap = {
    'Unknown': 'Ingles',
  };

  // Helper function to determine Spanish subtitle type
  const getSpanishLabel = (track) => {
    const label = track.label.toLowerCase();
    if (label === 'spa' || label.includes('latin')) {
      return 'Español Latino';
    } else if (label.includes('spain') || label === 'spa 2') {
      return 'Español España';
    } else {
      return 'Español'; // Default case for unspecified Spanish subtitles
    }
  };

  const filteredAndRenamed = subtitles
    .filter(track => track.language === 'Unknown' || track.language === 'spa')
    .map(track => ({
      ...track,
      label: track.language === 'spa' ? getSpanishLabel(track) : languageMap[track.language]
    }));

  // Sort order with 'Español' as the last option for Spanish subtitles
  const sortOrder = ['Español Latino', 'Español España', 'Español', 'Ingles'];

  return filteredAndRenamed.sort((a, b) =>
    sortOrder.indexOf(a.label) - sortOrder.indexOf(b.label)
  );
}
