const React = require('react');
const { useState, useCallback } = React;

const usePagination = (totalItems, itemsPerPage = 8) => {
    const [currentPage, setCurrentPage] = useState(1);
    const [direction, setDirection] = useState(0);

    const totalPages = Math.ceil(totalItems / itemsPerPage);
    const hasMore = currentPage < totalPages;

    const handlePrev = useCallback(() => {
        if (currentPage > 1) {
            setDirection(-1);
            setCurrentPage(prev => prev - 1);
        }
    }, [currentPage]);

    const handleNext = useCallback(() => {
        if (hasMore) {
            setDirection(1);
            setCurrentPage(prev => prev + 1);
        }
    }, [hasMore, currentPage]);

    return {
        currentPage,
        direction,
        hasMore,
        handlePrev,
        handleNext
    };
};

module.exports = usePagination;