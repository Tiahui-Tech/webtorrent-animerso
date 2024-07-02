const React = require('react')
const prettyBytes = require('prettier-bytes')

const { Stack, Checkbox, LinearProgress, Box, Typography, TableCell, TableRow, IconButton } = require('@mui/material')

const PlayArrowIcon = require('@mui/icons-material/PlayArrow').default
const CloseIcon = require('@mui/icons-material/Close').default
const AddIcon = require('@mui/icons-material/Add').default
const DescriptionIcon = require('@mui/icons-material/Description').default

const TorrentSummary = require('../lib/torrent-summary')
const TorrentPlayer = require('../lib/torrent-player')
const { dispatcher } = require('../lib/dispatcher')
const { calculateEta } = require('../lib/time')
module.exports = class TorrentList extends React.Component {
  render() {
    const state = this.props.state

    const contents = []
    if (state.downloadPathStatus === 'missing') {
      contents.push(
        <Box key='torrent-missing-path'>
          <Typography>Download path missing: {state.saved.prefs.downloadPath}</Typography>
          <Typography>Check that all drives are connected?</Typography>
          <Typography>
            Alternatively, choose a new download path
            in <a href='#' onClick={dispatcher('preferences')}>Preferences</a>
          </Typography>
        </Box>
      )
    }
    const torrentElems = state.saved.torrents.map(
      (torrentSummary) => this.renderTorrent(torrentSummary)
    )
    contents.push(...torrentElems)
    contents.push(
      <Box key='torrent-placeholder' className='torrent-placeholder'>
        <Typography noWrap>Drop a torrent file here or paste a magnet link</Typography>
      </Box>
    )

    return (
      <Box
        key='torrent-list'
        className='torrent-list'
        onContextMenu={dispatcher('openTorrentListContextMenu')}
      >
        {contents}
      </Box>
    )
  }

  renderTorrent(torrentSummary) {
    const state = this.props.state
    const infoHash = torrentSummary.infoHash
    const isSelected = infoHash && state.selectedInfoHash === infoHash

    // Background image: show some nice visuals, like a frame from the movie, if possible
    const style = {}
    if (torrentSummary.posterFileName) {
      const gradient = 'linear-gradient(to bottom, rgba(0, 0, 0, 0.4) 0%, rgba(0, 0, 0, 0.4) 100%)'
      const posterPath = TorrentSummary.getPosterPath(torrentSummary)
      style.backgroundImage = `${gradient}, url('${posterPath}')`
    }

    // Foreground: name of the torrent, basic info like size, play button,
    // cast buttons if available, and delete
    const classes = ['torrent']
    if (isSelected) classes.push('selected')
    if (!infoHash) classes.push('disabled')
    if (!torrentSummary.torrentKey) throw new Error('Missing torrentKey')
    return (
      <div
        id={torrentSummary.testID && ('torrent-' + torrentSummary.testID)}
        key={torrentSummary.torrentKey}
        style={style}
        className={classes.join(' ')}
        onContextMenu={infoHash && dispatcher('openTorrentContextMenu', infoHash)}
        onClick={infoHash && dispatcher('toggleSelectTorrent', infoHash)}
      >
        {this.renderTorrentMetadata(torrentSummary)}
        {infoHash ? this.renderTorrentButtons(torrentSummary) : null}
        {isSelected ? this.renderTorrentDetails(torrentSummary) : null}
        <hr />
      </div>
    )
  }

  // Show name, download status, % complete
  renderTorrentMetadata(torrentSummary) {
    const name = torrentSummary.name || 'Loading torrent...'
    const elements = [(
      <div key='name' className='name ellipsis'>{name}</div>
    )]

    // If it's downloading/seeding then show progress info
    const prog = torrentSummary.progress
    let progElems
    if (torrentSummary.error) {
      progElems = [getErrorMessage(torrentSummary)]
    } else if (torrentSummary.status !== 'paused' && prog) {
      progElems = [
        renderDownloadCheckbox(),
        renderTorrentStatus(),
        renderProgressBar(),
        renderPercentProgress(),
        renderTotalProgress(),
        renderPeers(),
        renderSpeeds(),
        renderEta()
      ]
    } else {
      progElems = [
        renderDownloadCheckbox(),
        renderTorrentStatus()
      ]
    }
    elements.push(
      <div key='progress-info' className='ellipsis'>
        {progElems}
      </div>
    )

    return (<div key='metadata' className='metadata'>{elements}</div>)

    function renderDownloadCheckbox() {
      const infoHash = torrentSummary.infoHash
      const isActive = ['downloading', 'seeding'].includes(torrentSummary.status)
      return (
        <Checkbox
          key='download-button'
          className={'control download ' + torrentSummary.status}
          sx={{
            display: 'inline-block',
            width: 32
          }}
          checked={isActive}
          onClick={stopPropagation}
          onChange={() => dispatcher('toggleTorrent', infoHash)}
        />
      )
    }

    function renderProgressBar() {
      const progress = Math.floor(100 * prog.progress)
      return (
        <Box key='progress-bar' sx={{ display: 'inline-block', marginRight: 1, width: 30 }}>
          <LinearProgress variant='determinate' value={progress} sx={{ height: 8 }} />
        </Box>
      )
    }

    function renderPercentProgress() {
      const progress = Math.floor(100 * prog.progress)
      return (<span key='percent-progress'>{progress}%</span>)
    }

    function renderTotalProgress() {
      const downloaded = prettyBytes(prog.downloaded)
      const total = prettyBytes(prog.length || 0)
      if (downloaded === total) {
        return (<span key='total-progress'>{downloaded}</span>)
      } else {
        return (<span key='total-progress'>{downloaded} / {total}</span>)
      }
    }

    function renderPeers() {
      if (prog.numPeers === 0) return
      const count = prog.numPeers === 1 ? 'peer' : 'peers'
      return (<span key='peers'>{prog.numPeers} {count}</span>)
    }

    function renderSpeeds() {
      let str = ''
      if (prog.downloadSpeed > 0) str += ' ↓ ' + prettyBytes(prog.downloadSpeed) + '/s'
      if (prog.uploadSpeed > 0) str += ' ↑ ' + prettyBytes(prog.uploadSpeed) + '/s'
      if (str === '') return
      return (<span key='download'>{str}</span>)
    }

    function renderEta() {
      const downloaded = prog.downloaded
      const total = prog.length || 0
      const missing = total - downloaded
      const downloadSpeed = prog.downloadSpeed
      if (downloadSpeed === 0 || missing === 0) return

      const etaStr = calculateEta(missing, downloadSpeed)

      return (<span key='eta'>{etaStr}</span>)
    }

    function renderTorrentStatus() {
      let status
      if (torrentSummary.status === 'paused') {
        if (!torrentSummary.progress) status = ''
        else if (torrentSummary.progress.progress === 1) status = 'Not seeding'
        else status = 'Paused'
      } else if (torrentSummary.status === 'downloading') {
        if (!torrentSummary.progress) status = ''
        else if (!torrentSummary.progress.ready) status = 'Verifying'
        else status = 'Downloading'
      } else if (torrentSummary.status === 'seeding') {
        status = 'Seeding'
      } else { // torrentSummary.status is 'new' or something unexpected
        status = ''
      }
      return (<span key='torrent-status'>{status}</span>)
    }
  }

  // Download button toggles between torrenting (DL/seed) and paused
  // Play button starts streaming the torrent immediately, unpausing if needed
  renderTorrentButtons(torrentSummary) {
    const infoHash = torrentSummary.infoHash

    let playButton
    if (!torrentSummary.error && TorrentPlayer.isPlayableTorrentSummary(torrentSummary)) {
      playButton = (
        <IconButton
          key='play-button'
          title='Start streaming'
          className='icon play'
          onClick={dispatcher('playFile', infoHash)}
        >
          <PlayArrowIcon />
        </IconButton>
      )
    }

    return (
      <Stack direction="row" gap={2} alignItems="center" justifyContent="center">
        {playButton}
        <IconButton
          key='delete-button'
          title='Remove torrent'
          className='icon delete'
          onClick={dispatcher('confirmDeleteTorrent', infoHash, false)}
        >
          <CloseIcon />
        </IconButton>
      </Stack>
    )
  }

  // Show files, per-file download status and play buttons, and so on
  renderTorrentDetails(torrentSummary) {
    let filesElement
    if (torrentSummary.error || !torrentSummary.files) {
      let message = ''
      if (torrentSummary.error === 'path-missing') {
        // Special case error: this torrent's download dir or file is missing
        message = 'Missing path: ' + TorrentSummary.getFileOrFolder(torrentSummary)
      } else if (torrentSummary.error) {
        // General error for this torrent: just show the message
        message = torrentSummary.error.message || torrentSummary.error
      } else if (torrentSummary.status === 'paused') {
        // No file info, no infohash, and we're not trying to download from the DHT
        message = 'Failed to load torrent info. Click the download button to try again...'
      } else {
        // No file info, no infohash, trying to load from the DHT
        message = 'Downloading torrent info...'
      }
      filesElement = (
        <div key='files' className='files warning'>
          {message}
        </div>
      )
    } else {
      // We do know the files. List them and show download stats for each one
      const sortByName = this.props.state.saved.prefs.sortByName
      const collator = new Intl.Collator(undefined, { numeric: true, sensitivity: 'base' })
      let fileRows = torrentSummary.files
        .filter((file) => !file.path.includes('/.____padding_file/'))
        .map((file, index) => ({ file, index }))

      if (sortByName) {
        fileRows = fileRows.sort((a, b) => collator.compare(a.file.name, b.file.name))
      }

      fileRows = fileRows.map((obj) => this.renderFileRow(torrentSummary, obj.file, obj.index))

      filesElement = (
        <div key='files' className='files'>
          <table>
            <tbody>
              {fileRows}
            </tbody>
          </table>
        </div>
      )
    }

    return (
      <Box key='details' className='torrent-details'>
        {filesElement}
      </Box>
    )
  }

  // Show a single torrentSummary file in the details view for a single torrent
  renderFileRow(torrentSummary, file, index) {
    // First, find out how much of the file we've downloaded
    // Are we even torrenting it?
    const isSelected = torrentSummary.selections && torrentSummary.selections[index]
    let isDone = false // Are we finished torrenting it?
    let progress = ''
    if (torrentSummary.progress && torrentSummary.progress.files &&
      torrentSummary.progress.files[index]) {
      const fileProg = torrentSummary.progress.files[index]
      isDone = fileProg.numPiecesPresent === fileProg.numPieces
      progress = Math.floor(100 * fileProg.numPiecesPresent / fileProg.numPieces) + '%'
    }

    // Second, for media files where we saved our position, show how far we got
    let positionElem
    if (file.currentTime) {
      // Radial progress bar. 0% = start from 0:00, 270% = 3/4 of the way thru
      positionElem = this.renderRadialProgressBar(file.currentTime / file.duration)
    }

    // Finally, render the file as a table row
    const isPlayable = TorrentPlayer.isPlayable(file)
    const infoHash = torrentSummary.infoHash
    let icon
    let handleClick
    if (isPlayable) {
      icon = 'play_arrow' /* playable? add option to play */
      handleClick = dispatcher('playFile', infoHash, index)
    } else {
      icon = 'description' /* file icon, opens in OS default app */
      handleClick = isDone
        ? dispatcher('openPath', infoHash, index)
        : (e) => e.stopPropagation() // noop if file is not ready
    }
    // TODO: add a css 'disabled' class to indicate that a file cannot be opened/streamed
    let rowClass = ''
    if (!isSelected) rowClass = 'disabled' // File deselected, not being torrented
    if (!isDone && !isPlayable) rowClass = 'disabled' // Can't open yet, can't stream
    return (
      <TableRow key={index} onClick={handleClick}>
        <TableCell className={'col-icon ' + rowClass}>
          {positionElem}
          {isPlayable ? <PlayArrowIcon /> : <DescriptionIcon />}
        </TableCell>
        <TableCell className={'col-name ' + rowClass}>
          {file.name}
        </TableCell>
        <TableCell className={'col-progress ' + rowClass}>
          {isSelected ? progress : ''}
        </TableCell>
        <TableCell className={'col-size ' + rowClass}>
          {prettyBytes(file.length)}
        </TableCell>
        <TableCell
          className='col-select'
          onClick={dispatcher('toggleTorrentFile', infoHash, index)}
        >
          <IconButton className='icon deselect-file'>
            {isSelected ? <CloseIcon /> : <AddIcon />}
          </IconButton>
        </TableCell>
      </TableRow>
    )
  }

  renderRadialProgressBar(fraction, cssClass) {
    const rotation = 360 * fraction
    const transformFill = { transform: 'rotate(' + (rotation / 2) + 'deg)' }
    const transformFix = { transform: 'rotate(' + rotation + 'deg)' }

    return (
      <div key='radial-progress' className={'radial-progress ' + cssClass}>
        <div className='circle'>
          <div className='mask full' style={transformFill}>
            <div className='fill' style={transformFill} />
          </div>
          <div className='mask half'>
            <div className='fill' style={transformFill} />
            <div className='fill fix' style={transformFix} />
          </div>
        </div>
        <div className='inset' />
      </div>
    )
  }
}

function stopPropagation(e) {
  e.stopPropagation()
}

function getErrorMessage(torrentSummary) {
  const err = torrentSummary.error
  if (err === 'path-missing') {
    return (
      <span key='path-missing'>
        Path missing.<br />
        Fix and restart the app, or delete the torrent.
      </span>
    )
  }
  return 'Error'
}
