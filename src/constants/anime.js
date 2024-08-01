const STATUS_COLORS = {
    RELEASING: 'success',
    FINISHED: 'primary',
    NOT_YET_RELEASED: 'warning',
    CANCELLED: 'danger',
    HIATUS: 'secondary',
};

const STATUS_LABELS = {
    RELEASING: 'EN EMISIÓN',
    FINISHED: 'FINALIZADO',
    NOT_YET_RELEASED: 'NO LANZADO',
    CANCELLED: 'CANCELADO',
    HIATUS: 'HIATUS',
};

module.exports = { STATUS_COLORS, STATUS_LABELS }