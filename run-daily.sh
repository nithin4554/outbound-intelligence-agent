#!/bin/bash
# Move to the project workspace
cd "$(dirname "$0")"

# Execute the python automation agent and log output
echo "===========================================" >> run-daily.log
echo "Starting automation run: $(date)" >> run-daily.log
python3 agent.py >> run-daily.log 2>&1
echo "Automation run completed: $(date)" >> run-daily.log
echo "===========================================" >> run-daily.log
