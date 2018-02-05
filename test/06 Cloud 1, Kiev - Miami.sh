#!/usr/bin/env bash
# === 06 Cloud 1, Kiev - Miami.sh ===
# Test joining the Cloud Trust Ltd as a leaf

unset CDPATH  # To prevent unexpected `cd` behavior.

# Print the embedded test plan to stdout.
printTestPlan() {
  sed -n -e $'/^: <<\'EOF_TEST_PLAN\'/,/^EOF_TEST_PLAN/ { s///; t\np;}' "$BASH_SOURCE"
}

#----------------------------------
pushd "$HOME/project/lnet"

# Ignore the testplan
#eval "`printTestPlan`" | bin/run.js "../test/rc/06 Cloud 1, Kiev - Miami.json"
#
# IMPORTANT: the first time, we MUST connect to the hub manually - to add it to known_hosts
#
pipe="/tmp/${USER}_mia-hub.in"
rm $pipe 2>/dev/null
mkfifo $pipe
cat $pipe | bin/run.js "../test/rc/06 Cloud 1, Kiev - Miami.json" >> "/tmp/${USER}_mia-hub.out" 2>&1 &
EXIT_CODE=$?
[[ $EXIT_CODE == 0 ]] && echo "TEST PASSED" || echo "TEST FAILED, EXIT_CODE=$EXIT_CODE"
# alec@mba ~ $ echo "hub1 exit" >> /tmp/alec_mia-hub.in
popd
#----------------------------------
: <<'EOF_TEST_PLAN'
sleep 60
echo "hub1 stop heartbeat"
sleep 180
EOF_TEST_PLAN
