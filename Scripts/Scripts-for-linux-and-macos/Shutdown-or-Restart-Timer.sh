#!/bin/bash

# Clear the screen (equivalent to 'cls' in batch)
clear

echo "Schedule Shutdown/Restart"
echo "1. Shutdown"
echo "2. Restart"

# Prompt for choice (equivalent to 'set /p choice="...")
read -p "Enter your choice (1 or 2): " choice

# Use 'case' for cleaner conditional logic than multiple 'if' statements
case "$choice" in
    1)
        # Go to the shutdown logic
        read -p "Enter delay in minutes for shutdown: " delay
        
        # Linux/macOS shutdown command uses minutes by default,
        # or 'now' for immediate action.
        if [ "$delay" -gt 0 ]; then
            # 'shutdown -h' for halt (shutdown)
            # The time format can be 'h:m' or '+m' for minutes from now
            shutdown -h "+$delay" "System scheduled to shut down in $delay minutes."
            echo "System will shut down in $delay minutes."
        else
            # Immediate shutdown
            shutdown -h now "System shutting down immediately."
            echo "System is shutting down immediately."
        fi
        ;;
    2)
        # Go to the restart logic
        read -p "Enter delay in minutes for restart: " delay
        
        if [ "$delay" -gt 0 ]; then
            # 'shutdown -r' for reboot (restart)
            shutdown -r "+$delay" "System scheduled to restart in $delay minutes."
            echo "System will restart in $delay minutes."
        else
            # Immediate restart
            shutdown -r now "System restarting immediately."
            echo "System is restarting immediately."
        fi
        ;;
    *)
        # Invalid choice
        echo "Invalid choice"
        ;;
esac

# Simulate 'pause' if the script is run in an interactive terminal.
# The shutdown command will typically exit the script anyway, but this is good practice.
if [ -t 0 ]; then read -p "Press Enter to continue..." ; fi

# Exit the script
exit 0
