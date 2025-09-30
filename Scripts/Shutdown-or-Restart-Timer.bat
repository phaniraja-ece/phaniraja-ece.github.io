@echo off
cls
echo Schedule Shutdown/Restart
echo 1. Shutdown
echo 2. Restart
set /p choice="Enter your choice (1 or 2):"
if "%choice%=="1" goto :shutdown
if "%choice%=="2" goto :restart
echo invalid choice
pause
exit

:shutdown
set /p delay="Enter delay in seconds for shutdown:"
shutdown /s /t %delay%
echo System will shut down in %delay% seconds.
pause
exit

:restart
set /p delay="Enter delay in seconds for restart:"
shutdown /r /t %delay%
echo System will restart in %delay% seconds.
pause
exit
