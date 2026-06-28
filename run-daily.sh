#!/bin/bash
# Move to the project workspace
cd "$(dirname "$0")"

# Execute the python automation agent and log output
echo "===========================================" >> run-daily.log
echo "Starting automation run: $(date)" >> run-daily.log
python3 agent.py >> run-daily.log 2>&1

# Auto-push updated results.json database to GitHub to refresh Pages dashboard
echo "Pushing updated database to GitHub..." >> run-daily.log
git add data/results.json >> run-daily.log 2>&1
git commit -m "Auto-update outbound intelligence data: $(date)" >> run-daily.log 2>&1
git push origin main >> run-daily.log 2>&1

echo "Automation run completed: $(date)" >> run-daily.log
echo "===========================================" >> run-daily.log
