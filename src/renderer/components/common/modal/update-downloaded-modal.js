const React = require('react')
const { Button, Modal, ModalContent, ModalHeader, ModalBody, ModalFooter } = require("@nextui-org/react")
const { Icon } = require("@iconify/react")

function UpdateDownloadedModal({ isOpen, setIsOpen }) {

  return (
    <Modal 
      isOpen={isOpen} 
      onClose={() => setIsOpen(false)}
      className="dark"
    >
      <ModalContent>
        <ModalHeader className="font-bold text-2xl text-white flex items-center gap-2">
          <Icon icon="gravity-ui:cloud-check" width="32" height="32" style={{color: 'white'}} />
          ¡Nueva actualización!
        </ModalHeader>
        <ModalBody>
          <p className="text-lg text-white">¿Deseas reiniciar Animeton ahora para instalar la actualización?</p>
        </ModalBody>
        <ModalFooter>
          <Button 
            className="bg-transparent hover:bg-opacity-90 transition-all duration-300 px-6 text-white font-semibold"
            onPress={() => setIsOpen(false)}
          >
            Más tarde
          </Button>
          <Button 
            className="bg-white text-black font-bold hover:bg-opacity-90 transition-all duration-300 px-6"
            onPress={() => dispatch('quitAndInstall')}
          >
            Reiniciar
          </Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  )
}

module.exports = UpdateDownloadedModal