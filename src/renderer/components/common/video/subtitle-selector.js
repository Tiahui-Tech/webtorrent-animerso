const React = require('react');

const { dispatcher } = require('../../../lib/dispatcher');
const SubtitleItem = require('./subtitle-selector-item');

const SubtitleSelector = ({ state, currentSubtitles }) => {
    const subtitlesData = state.playing?.subtitles;
    if (!currentSubtitles.tracks.length || !subtitlesData.showMenu) return;

    return (
        <ul
            key="subtitle-options"
            className="absolute bottom-16 right-8 bg-zinc-900 rounded-lg shadow-lg backdrop-blur-sm border border-zinc-800 min-w-[200px] py-2"
            style={{ zIndex: 9999 }}
        >
            {currentSubtitles.tracks.map((track, ix) => (
                <SubtitleItem
                    key={ix}
                    isSelected={subtitlesData.selectedIndex === ix}
                    label={track.label}
                    onClick={dispatcher('selectSubtitle', ix)}
                />
            ))}

            <div className="my-2 border-t border-zinc-800" />

            <SubtitleItem
                isSelected={subtitlesData.selectedIndex === -1}
                label="Sin subtítulos"
                onClick={dispatcher('selectSubtitle', -1)}
            />
        </ul>
    );
}

module.exports = SubtitleSelector;