const React = require('react');
const { useState, useEffect, useRef } = React;
const { Icon } = require('@iconify/react');
const { motion, AnimatePresence } = require('framer-motion');
const eventBus = require('../../lib/event-bus');

const SearchInput = ({ searchTerm, setSearchTerm }) => {
    const [isExpanded, setIsExpanded] = useState(false);
    const inputRef = useRef(null);
    const containerRef = useRef(null);

    // Handle input focus when expanded
    useEffect(() => {
        if (isExpanded) {
            inputRef.current?.focus();
        }
    }, [isExpanded]);

    // Handle click outside
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (!containerRef.current?.contains(event.target)) {
                // Only close if empty
                if (!searchTerm) {
                    setIsExpanded(false);
                }
            }
        };

        if (isExpanded) {
            document.addEventListener('mousedown', handleClickOutside);
        }

        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, [isExpanded, searchTerm]);

    // Close search input when term is empty
    useEffect(() => {
        if (searchTerm === null) {
            setIsExpanded(false);
        }
    }, [searchTerm]);

    const handleSearch = (event) => {
        setSearchTerm(event.target.value);
    };

    const handleClear = () => {
        setSearchTerm('');
        setIsExpanded(false);
    };

    return (
        <div ref={containerRef} className="relative inline-flex items-center" style={{ WebkitAppRegion: 'no-drag', zIndex: 9999 }}>
            <AnimatePresence>
                {isExpanded && (
                    <motion.div
                        initial={{ width: 0, opacity: 0 }}
                        animate={{ width: 256, opacity: 1 }}
                        exit={{ width: 0, opacity: 0 }}
                        transition={{ type: "spring", stiffness: 250, damping: 25 }}
                        className="relative"
                    >
                        <input
                            ref={inputRef}
                            type="text"
                            className="h-10 py-2 pl-4 pr-10 w-full text-white placeholder-white/70 
                                     rounded-full bg-white/10 backdrop-blur-sm focus:outline-none 
                                     focus:ring-1 focus:ring-white/30"
                            placeholder="Buscar"
                            value={searchTerm}
                            onChange={handleSearch}
                        />
                        {searchTerm && (
                            <button
                                onClick={handleClear}
                                className="absolute right-3 top-1/2 transform -translate-y-1/2 
                                         text-white/70 hover:text-white focus:outline-none"
                            >
                                <Icon icon="gravity-ui:xmark" width="20" className="pointer-events-none" />
                            </button>
                        )}
                    </motion.div>
                )}
            </AnimatePresence>

            <button
                onClick={() => setIsExpanded(!isExpanded)}
                className={`focus:outline-none p-1 hover:bg-zinc-800 rounded 
                               transition-colors ${isExpanded ? 'ml-2' : ''}`}
            >
                <Icon
                    icon="gravity-ui:magnifier"
                    width="28"
                    height="28"
                    className="text-white pointer-events-none"
                />
            </button>
        </div>
    );
};

module.exports = SearchInput;
