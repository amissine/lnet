#!/usr/local/bin/bash
#
# Copyright 2017 Alec Missine (support@minetats.com) 
#                and the Arbitrage Logistics International (ALI) project
#
# The ALI Project licenses this file to you under the Apache License, version 2.0
# (the "License"); you may not use this file except in compliance with the License.
# You may obtain a copy of the License at:
#
#   http://www.apache.org/licenses/LICENSE-2.0
#
# Unless required by applicable law or agreed to in writing, software distributed
# under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR
# CONDITIONS OF ANY KIND, either express or implied. See the License for the
# specific language governing permissions and limitations under the License.
#
# === 05 Two hubs, Kiev leaf.sh ===
# Test the bridge functionality on the leaves
#
# See also:
#   https://docs.google.com/document/d/1JPzTa7IXEQL0NZLoO5leCNj40e7yy1dFNMiqTtBNH2o/
#   https://www.gnu.org/software/bash/manual/bashref.html
#   https://tiswww.case.edu/php/chet/bash/bashref.html

unset CDPATH  # To prevent unexpected `cd` behavior.

# --- Begin: STANDARD HELPER FUNCTIONS

declare logfile="/tmp/test05.log"

log() {
  local f='-Ins' timestamp=$([[ `uname` == "Darwin" ]] && gdate $f || date $f)
  echo "$timestamp $1" >> $logfile
}

die() { echo "$kTHIS_NAME: ERROR: ${1:-"ABORTING due to unexpected error."}" 1>&2; exit ${2:-1}; }
dieSyntax() { echo "$kTHIS_NAME: ARGUMENT ERROR: ${1:-"Invalid argument(s) specified."} Use -h for help." 1>&2; exit 2; }

# Print the embedded test plan to stdout.
printTestPlan() {
  sed -n -e $'/^: <<\'EOF_TEST_PLAN\'/,/^EOF_TEST_PLAN/ { s///; t\np;}' "$BASH_SOURCE"
}


#----------------------------------
[ `pwd` != "$HOME/project/lnet" ] && die "Please run this script from $HOME/project/lnet"

pipe="/tmp/${USER}_kiev-leaf.in"; rm $pipe 2>/dev/null; mkfifo $pipe
cat $pipe | bin/lnet.js "../test/rc/05 Two hubs, Kiev leaf.json" >> "/tmp/${USER}_kiev-leaf.out" 2>&1 &
EXIT_CODE=$?
[[ $EXIT_CODE == 0 ]] && echo "TEST PASSED" || echo "TEST FAILED, EXIT_CODE=$EXIT_CODE"
# admin@kiev-leaf2 ~ $ echo "hub0 exit" >> /tmp/admin_kiev-leaf.in
# admin@kiev-leaf2 ~ $ echo "hub1 exit" >> /tmp/admin_kiev-leaf.in

#----------------------------------
