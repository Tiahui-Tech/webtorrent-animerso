const React = require('react');
const { useEffect } = require('react');
const { motion } = require('framer-motion');
const { Icon } = require('@iconify/react');
const { usePostHog } = require('posthog-js/react');

const ErrorPopover = ({ state }) => {
    const posthog = usePostHog();
    const now = new Date().getTime();
    const recentErrors = state.errors.filter((x) => now - x.time < 5000);
    const hasErrors = recentErrors.length > 0;

    if (!hasErrors) return null;

    const errorColors = {
        error: '#f31260',
        alert: '#ff961f',
        debug: '#336ecc'
    };

    useEffect(() => {
        posthog?.capture('error_popover', {
            error: recentErrors[recentErrors.length - 1],
        });
    }, [recentErrors]);

    return (
        <div
            key="errors"
            className="fixed left-4 flex flex-col space-y-4"
            style={{ zIndex: 9999, top: '72px' }}
        >
            {recentErrors.map((error, i) => (
                <motion.div
                    key={i}
                    initial={{ opacity: 0, x: -100 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.3 }}
                    className={`text-white px-4 pr-6 py-3 rounded-xl shadow-md flex items-center`}
                    style={{
                        backgroundColor: errorColors[error.type] || errorColors.error
                    }}
                >
                    <Icon
                        icon={error.type === "debug" ? "gravity-ui:wrench" : "gravity-ui:diamond-exclamation"}
                        width="32"
                        height="32"
                        style={{ color: 'white' }}
                        className="mr-3"
                    />
                    <div>
                        <h3 className="font-bold mb-1">
                            {error.title || 'Ha ocurrido un error...'}
                        </h3>
                        <p className="text-sm text-white/80">{error.message}</p>
                    </div>
                </motion.div>
            ))}
        </div>
    );
}

module.exports = ErrorPopover;