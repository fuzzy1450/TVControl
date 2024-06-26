@echo off
setlocal EnableDelayedExpansion
set day=%1
set mode=%2

for /f "tokens=*" %%a in (C:/RokuControl/Schedule/%day%/%mode%.txt) do (
	set line=%%a
	
	
	
	if %mode%==Open (
		set command=PowerOn
	) ELSE (
		set command=PowerOff
	)


	if [!line!] == [] (
		echo Done
	) ELSE (
		echo !line!/!command!
		START /B curl -X POST http://localhost:3000/api/TVs/!line!/!command! > nul
	)
)



