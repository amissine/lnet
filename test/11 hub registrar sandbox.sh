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
# === 11 hub registrar sandbox.sh ===
# Simulate hub and leaves by spawning and feeding several hub_hb processes, 
# do some IPC.
#
# See also:
#   https://docs.google.com/document/d/1JPzTa7IXEQL0NZLoO5leCNj40e7yy1dFNMiqTtBNH2o/
#   https://www.gnu.org/software/bash/manual/bashref.html
#   https://tiswww.case.edu/php/chet/bash/bashref.html

kTHIS_NAME=${BASH_SOURCE##*/} # whatever is left after the last '/' in the script name

unset CDPATH  # To prevent unexpected 'cd' behavior.

# --- Begin: STANDARD HELPER FUNCTIONS

declare logfile="/tmp/test11.log"

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

# --- Begin: TEST FUNCTIONS

simulateLeaf() {
  local name=$1
  local -i llp=$((1025 + RANDOM % (65536 - 1025))) # TODO: unique llp values

  echo "- pid $$ is simulating $name to hub data stream"
  
  "$BASH_SOURCE" -b $llp | bin/hub_hb.sh hub $llp
}

heartbeatFromLeaf() {
  local llp=$1

  sleep $((1 + RANDOM % 5)) # [1..5], 5 = 6 - 1
  while true; do            #         6 = 5 + 1
    sleep 6; # echo "heartbeat from port $llp" # on no heartbeat from a leaf the hub must exit
  done
}

readPipe() {
  local line pipe="/tmp/test11"
  rm $pipe > /dev/null 2>&1
  mkfifo $pipe

  log "Reading input lines from $pipe"
  while true; do
    if read line < $pipe; then
      log "$line"
      [[ ${line:0:4} == 'exit' ]] && break
    else break; fi
  done
  rm $pipe > /dev/null 2>&1

  pids=''
  for pid in `ps -ef | grep "test/11" | grep "hub registrar" | grep '-' | awk '{ print $2 }' -`; do
    pids="$pid $pids"
  done
  kill $pids

  log "Exiting $0..."
}

#----------------------------------
[ `pwd` != "$HOME/project/lnet" ] && die "Please run this script from $HOME/project/lnet"

#eval "`printTestPlan`" | bin/run.js "../test/rc/06 Cloud 1, Kiev - Miami.json" 2>&1
#EXIT_CODE=$?
#[[ $EXIT_CODE == 0 ]] && echo "TEST PASSED" || echo "TEST FAILED, EXIT_CODE=$EXIT_CODE"

while getopts ':b:l:' opt; do  # $opt will receive the option *letters* one by one; a trailing : means that an arg. is required, reported in $OPTARG.
  [[ $opt == '?' ]] && dieSyntax "Unknown option: -$OPTARG"
  [[ $opt == ':' ]] && dieSyntax "Option -$OPTARG is missing its argument."
  case "$opt" in
    b) # private option, used by function simulateLeaf
      heartbeatFromLeaf "$OPTARG"; exit
      ;;
    l) # private option, used by the script itself
      simulateLeaf "$OPTARG"; exit
      ;;
    *) # An unrecognized switch.
      dieSyntax "Invalid option: $opt"
      ;;
  esac
done

for leaf in leaf1 leaf2 leaf3 leaf4; do
  "$BASH_SOURCE" -l $leaf &
done

readPipe &
#----------------------------------
: <<'EOF_TEST_PLAN'
sleep 3
echo "hub1 git pull origin master"
sleep 30
EOF_TEST_PLAN
