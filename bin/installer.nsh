!macro customHeader
  !system "echo 'Animeton Installer Header' > ${BUILD_RESOURCES_DIR}/customHeader"
!macroend

!macro preInit
  ; Este macro se inserta al inicio del callback .OnInit de NSIS
  !system "echo 'Inicializando el instalador de Animeton...' > ${BUILD_RESOURCES_DIR}/preInit"
!macroend

!macro customInit
  !system "echo 'Configuración personalizada para Animeton' > ${BUILD_RESOURCES_DIR}/customInit"
!macroend

!macro customInstall
  !system "echo 'Instalando Animeton, por favor espere...' > ${BUILD_RESOURCES_DIR}/customInstall"
!macroend

!macro customInstallMode
  # Establecer $isForceMachineInstall o $isForceCurrentInstall
  # para forzar uno u otro modo.
!macroend

!macro customWelcomePage
  !define MUI_WELCOMEPAGE_TITLE "Bienvenido a Animeton"
  !define MUI_WELCOMEPAGE_TEXT "Gracias por elegir Animeton. Haga clic en Siguiente para comenzar la instalación."
  !insertMacro MUI_PAGE_WELCOME
!macroend

!macro customUnWelcomePage
  !define MUI_WELCOMEPAGE_TITLE "Desinstalación de Animeton"
  !define MUI_WELCOMEPAGE_TEXT "Está a punto de desinstalar Animeton. Haga clic en Siguiente para continuar."
  !insertmacro MUI_UNPAGE_WELCOME
!macroend