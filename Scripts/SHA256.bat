@echo off
setlocal enabledelayedexpansion

rem Check if a file path was passed as an argument.
if "%~1"=="" (
    echo Error: No file specified.
    pause
    exit /b
)

rem Check if the file actually exists.
if not exist "%~1" (
    echo Error: The specified file does not exist.
    pause
    exit /b
)

echo Calculating SHA256 hash for "%~nx1"...

set "lineCount=0"
set "sha256Hash="

rem Use a for loop to iterate through each line of certutil output.
for /f "tokens=*" %%a in ('certutil -hashfile "%~1" SHA256') do (
    set /a lineCount+=1
    rem The hash is always the second line of output.
    if !lineCount! equ 2 (
        set "sha256Hash=%%a"
        goto :foundHash
    )
)

:foundHash
if defined sha256Hash (
    echo.
    echo SHA256 Hash: %sha256Hash%
    echo.
    echo The hash has been copied to your clipboard.
    echo %sha256Hash% | clip
) else (
    echo Error: Failed to calculate the SHA256 hash.
)

pause
endlocal