const React = require('react');
const { Icon } = require('@iconify/react');
const prettyBytes = require('prettier-bytes');

const VideoSpinner = ({ progress, downloadSpeed, uploadSpeed }) => {
    return (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/50 backdrop-blur-sm z-50">
            <Icon
                icon="fluent:spinner-ios-16-filled"
                width="128"
                height="128"
                className="animate-spin text-white/90"
            />

            <div className="mt-6 text-center text-gray-200 font-medium">
                <div className="flex flex-col items-center justify-center space-y-2">

                    <span className="text-3xl text-white font-semibold">{progress}% | Descargando...</span>

                    <div className="flex items-center space-x-4 text-base text-gray-400">
                        <span className="flex items-center">
                            <span className="mr-1">↓</span>
                            {prettyBytes(downloadSpeed || 0)}/s
                        </span>
                        <span className="flex items-center">
                            <span className="mr-1">↑</span>
                            {prettyBytes(uploadSpeed || 0)}/s
                        </span>
                    </div>
                </div>
            </div>
        </div>
    );
};

module.exports = VideoSpinner;