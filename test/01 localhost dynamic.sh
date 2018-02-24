#!/usr/bin/env bash
#
# See also: https://tiswww.case.edu/php/chet/bash/bashref.html

unset CDPATH  # To prevent unexpected `cd` behavior.

# Print the embedded test plan to stdout.
printTestPlan() {
  sed -n -e $'/^: <<\'EOF_TEST_PLAN\'/,/^EOF_TEST_PLAN/ { s///; t\np;}' "$BASH_SOURCE"
}

#----------------------------------
pushd "$HOME/project/lnet"

eval "`printTestPlan`" | bin/run.js "../test/rc/01 localhost dynamic.json"
EXIT_CODE=$?
[[ $EXIT_CODE == 0 ]] && echo "TEST PASSED" || echo "TEST FAILED, EXIT_CODE=$EXIT_CODE"

popd
#----------------------------------
: <<'EOF_TEST_PLAN'
sleep 30
echo "hub1 stop heartbeat"
sleep 50
EOF_TEST_PLAN

