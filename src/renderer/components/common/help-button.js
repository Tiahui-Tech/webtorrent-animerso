const React = require('react');
const { Button } = require('@nextui-org/react');
const { Icon } = require('@iconify/react');
const { useLocation } = require('react-router-dom');
const eventBus = require('../../lib/event-bus');

const HelpButton = ({ isModalOpen }) => {
    const location = useLocation();

    const handleHelpClick = () => {
        eventBus.emit('modalOpen', 'discordTicket');
    };

    if (location.pathname === '/player' || isModalOpen) {
        return null
    }

    return (
        <Button
            isIconOnly
            color="default"
            variant="shadow"
            radius="full"
            size="lg"
            className="fixed bottom-6 right-6 shadow-lg hover:scale-105 transition-transform bg-white"
            style={{ zIndex: 9999 }}
            onClick={handleHelpClick}
        >
            <Icon icon="hugeicons:question"
                width="32"
                height="32"
                className="text-black pointer-events-none" />
        </Button>
    );
};

module.exports = HelpButton;
