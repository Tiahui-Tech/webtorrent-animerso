const React = require('react');
const { Icon } = require('@iconify/react');

const SubtitleItem = ({ isSelected, label, onClick }) => (
    <li
        onClick={onClick}
        className="flex items-center gap-2 px-4 py-2 text-sm text-zinc-200 hover:bg-zinc-800 cursor-pointer transition-colors"
        style={{
            zIndex: 9999
        }}
    >
        <Icon
            icon={isSelected ? 'mdi:radiobox-marked' : 'mdi:radiobox-blank'}
            className={`text-lg ${isSelected ? 'text-zinc-200' : 'text-zinc-400'}`}
        />
        <span>{label}</span>
    </li>
);

module.exports = SubtitleItem;