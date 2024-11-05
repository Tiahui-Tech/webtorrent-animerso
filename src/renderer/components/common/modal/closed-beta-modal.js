const React = require('react')
const { Button, Modal, ModalContent, ModalHeader, ModalBody, ModalFooter, Divider } = require("@nextui-org/react")
const { Icon } = require("@iconify/react")
const { shell } = require('electron')
const { DISCORD_INVITE_CODE } = require('../../../../constants/config')

const appVersion = require('../../../../../package.json').version

const useGithubVersion = require('../../../hooks/useGithubVersion')

function ClosedBetaModal({ isOpen, setIsOpen }) {
    const { data: version, isLoading, error } = useGithubVersion(appVersion)

    return (
        <Modal
            isOpen={isOpen}
            onClose={() => setIsOpen(false)}
            className="dark"
        >
            <ModalContent>
                <ModalHeader className="font-bold text-2xl text-white flex items-center gap-3">
                    <Icon icon="gravity-ui:rocket"
                        width="32"
                        height="32"
                        className="text-white mt-1" />
                    {isLoading ? 'Cargando...' : `Animeton v${version?.version || appVersion}`}
                </ModalHeader>
                <Divider className="bg-zinc-700" />
                <ModalBody>
                    <div className="space-y-4 text-white">
                        <div className="space-y-2">
                            <h3 className="text-xl font-semibold">¡Bienvenido a la Beta!</h3>
                            <p className="text-zinc-300">Ayúdanos a mejorar reportando errores o sugerencias en nuestro Discord.</p>
                            <p className="text-zinc-300 pt-2">
                                <span className="text-yellow-400">¡Gana monedas!</span> Recibirás recompensas por cada reporte o sugerencia, y aún más si son implementados.
                            </p>
                        </div>

                        {!isLoading && version?.changelog && (
                            <>
                                <Divider className="bg-zinc-800" />
                                <div className="mt-4">
                                    <h4 className="text-md font-medium mb-2 text-zinc-300">Novedades actuales:</h4>
                                    <ul className="list-disc list-inside space-y-1 pl-2">
                                        {version.changelog.map((change, index) => (
                                            <li key={index} className="text-zinc-400 text-sm">{change}</li>
                                        ))}
                                    </ul>
                                </div>
                            </>
                        )}
                    </div>
                </ModalBody>
                <Divider className="bg-zinc-700" />
                <ModalFooter className="flex gap-3">
                    <Button
                        className="bg-[#5865F2] text-white font-medium hover:opacity-90"
                        startContent={<Icon icon="ic:baseline-discord" width="20" height="20" />}
                        onClick={() => shell.openExternal(`discord://-/invite/${DISCORD_INVITE_CODE}`)}
                    >
                        Animeton
                    </Button>
                    <Button
                        className="bg-white text-black font-medium hover:opacity-90"
                        onClick={() => setIsOpen(false)}
                    >
                        ¡Okay!
                    </Button>
                </ModalFooter>
            </ModalContent>
        </Modal>
    )
}

module.exports = ClosedBetaModal
