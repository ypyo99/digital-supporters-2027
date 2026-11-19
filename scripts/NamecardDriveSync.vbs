Set WshShell = CreateObject("WScript.Shell")
projDir = "d:\Anti Gravity\" & ChrW(50629) & ChrW(47924) & ChrW(51068) & ChrW(51648) & "-2027"
WshShell.CurrentDirectory = projDir
WshShell.Run """C:\Program Files\nodejs\node.exe"" scripts\namecard-sync-worker.mjs", 0, False
