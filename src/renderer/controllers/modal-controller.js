const { dispatch } = require('../lib/dispatcher')
const eventBus = require('../lib/event-bus')

// Controls the modals of the App
module.exports = class ModalController {
  constructor(state) {
    this.state = state
  }

  modalUpdate(modalData) {
    this.state.saved.modals = { ...this.state.saved.modals, ...modalData }

    dispatch('stateSaveImmediate')
  }

  modalOpen(modalId) {
    eventBus.emit('modalOpen', modalId)
  }
}
