const React = require('react')
const { useState, useEffect } = require('react')
const { Button, Modal, ModalContent, ModalHeader, ModalBody, ModalFooter, Divider, Textarea } = require("@nextui-org/react")
const { Icon } = require("@iconify/react")
const { shell } = require('electron')

const useDiscordTicket = require('../../../hooks/useDiscordTicket')

const { ANIMETON_GUILD_ID } = require('../../../../constants/config')

function DiscordTicketModal({ isOpen, setIsOpen, userId }) {
    const [description, setDescription] = useState('')
    const { createTicket, isLoading, error: ticketError, data, resetData } = useDiscordTicket()
    const [error, setError] = useState(null)

    useEffect(() => {
        if (data) {
            setDescription('')
        }
    }, [data])

    useEffect(() => {
        if (ticketError) {
            setError(ticketError)
        }
    }, [ticketError])

    const handleSubmit = async () => {
        if (!userId) {
            setError('No se pudo obtener el Usuario de Discord')
            return
        }

        await createTicket(userId, description.trim())
    }

    const handleClose = () => {
        if (!isLoading) {
            resetData()
            setDescription('')
            setError(null)
            setIsOpen(false)
        }
    }

    return (
        <Modal
            isOpen={isOpen}
            onClose={handleClose}
            className="dark"
        >
            <ModalContent>
                {data ? (
                    <>
                        <ModalHeader className="font-bold text-2xl text-white flex items-center gap-3">
                            <Icon icon="material-symbols:check-circle-outline"
                                width="32"
                                height="32"
                                className="text-green-500 mt-1" />
                            ¡Ticket Creado!
                        </ModalHeader>
                        <Divider className="bg-zinc-700" />
                        <ModalBody>
                            <div className="space-y-4 text-white py-4">
                                <div className="space-y-2">
                                    <p className="text-zinc-300">Tu ticket ha sido creado exitosamente</p>
                                    <p className="text-zinc-300">Presiona el siguiente botón para abrirlo.</p>
                                </div>
                            </div>
                        </ModalBody>
                        <Divider className="bg-zinc-700" />
                        <ModalFooter>
                            <Button
                                className="bg-[#5865F2] text-white font-medium hover:opacity-90"
                                startContent={<Icon icon="gravity-ui:ticket" width="20" height="20" />}
                                onClick={() => shell.openExternal(`discord://-/channels/${ANIMETON_GUILD_ID}/${data.channelId}`)}
                            >
                                Ir al Ticket
                            </Button>
                            <Button
                                className="bg-zinc-700 text-white font-medium hover:opacity-90"
                                onClick={handleClose}
                            >
                                Cerrar
                            </Button>
                        </ModalFooter>
                    </>
                ) : (
                    <>
                        <ModalHeader className="font-bold text-2xl text-white flex items-center gap-3">
                            <Icon icon="material-symbols:help-outline"
                                width="32"
                                height="32"
                                className="text-white mt-1" />
                            ¿Necesitas ayuda?
                        </ModalHeader>
                        <Divider className="bg-zinc-700" />
                        <ModalBody>
                            <div className="space-y-4 text-white">
                                {error && (
                                    <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-3">
                                        <p className="text-red-400 text-sm flex items-center gap-2">
                                            <Icon icon="material-symbols:error-outline" width="16" height="16" />
                                            {error}
                                        </p>
                                    </div>
                                )}

                                <div className="space-y-2">
                                    <p className="text-zinc-300">Describe tu problema o duda en detalle para que podamos ayudarte mejor.</p>
                                </div>

                                <Textarea
                                    variant="faded"
                                    placeholder="Explica tu problema o duda aquí..."
                                    value={description}
                                    onChange={(e) => setDescription(e.target.value)}
                                    minRows={4}
                                    maxRows={6}
                                    className="w-full rounded-lg"
                                    classNames={{
                                        input: "text-white",
                                        base: "bg-zinc-800 border-zinc-700",
                                        innerWrapper: "h-auto",
                                        input: "resize-y"
                                    }}
                                    isDisabled={isLoading}
                                />
                            </div>
                        </ModalBody>
                        <Divider className="bg-zinc-700" />
                        <ModalFooter className="flex gap-3">
                            <Button
                                className="bg-[#5865F2] text-white font-medium hover:opacity-90 min-w-[120px]"
                                startContent={
                                    isLoading ? (
                                        <Icon icon="eos-icons:loading" className="animate-spin" width="20" height="20" />
                                    ) : (
                                        <Icon icon="material-symbols:send-outline" width="20" height="20" />
                                    )
                                }
                                onClick={handleSubmit}
                                isDisabled={!description.trim() || isLoading}
                            >
                                {isLoading ? 'Enviando...' : 'Abrir Ticket'}
                            </Button>
                            <Button
                                className="bg-zinc-700 text-white font-medium hover:opacity-90"
                                onClick={handleClose}
                                isDisabled={isLoading}
                            >
                                Cancelar
                            </Button>
                        </ModalFooter>
                    </>
                )}
            </ModalContent>
        </Modal>
    )
}

module.exports = DiscordTicketModal
