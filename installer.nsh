!define checkInstOldGUIDFormat "!insertmacro checkInstOldGUIDFormat"
!macro checkInstOldGUIDFormat
	; check whether there is a user installation with the old GUID format in registry, abort if found
	ReadRegStr $0 HKCU "Software\Microsoft\Windows\CurrentVersion\Uninstall\${UNINSTALL_APP_KEY}" "QuietUninstallString"
	StrCmp $0 "" 0 askForUninstall
	; check whether there is an admin installation with the old GUID format in registry, abort if found
	ReadRegStr $0 HKLM "Software\Microsoft\Windows\CurrentVersion\Uninstall\${UNINSTALL_APP_KEY}" "QuietUninstallString"
	StrCmp $0 "" proceed askForUninstall
	askForUninstall:
		; display info message and abort
		MessageBox MB_OK|MB_ICONEXCLAMATION "Aplikasi wacsa sudah diinstall. Mohon Uninstall terlebih dahulu,$\r$\nLalu restart installer.$\r$\nPastikan data log sudah dibackup ke lokasi selain dari lokasi instalasi.$\r$\n$\r$\n$\r$\n$\r$\nCSA Computer"
		Abort
	proceed:
!macroend

!macro customInit
  ; check whether there is an existing installation with the old GUID in registry
	${checkInstOldGUIDFormat}
  StrCpy $INSTDIR "C:\wacsa"
!macroend