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
# === 02 localhost hub IPC.sh ===
# Start HubRegistrarServer on the localhost, do some IPC.
#
# See also:
#   https://docs.google.com/document/d/1JPzTa7IXEQL0NZLoO5leCNj40e7yy1dFNMiqTtBNH2o/
#   https://www.gnu.org/software/bash/manual/bashref.html
#   https://tiswww.case.edu/php/chet/bash/bashref.html

kTHIS_NAME=${BASH_SOURCE##*/} # whatever is left after the last '/' in the script name

unset CDPATH  # To prevent unexpected 'cd' behavior.

# --- Begin: STANDARD HELPER FUNCTIONS

declare logfile="/tmp/test02.log"

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

mockHub() {
  local name=$1
  local -i llp=$((1025 + RANDOM % (65536 - 1025))) # TODO: unique llp values

  echo "- pid $$ is mocking $name llp=$llp"
  ./bin/registrar.js $llp
}

#----------------------------------
[ `pwd` != "$HOME/project/lnet" ] && die "Please run this script from $HOME/project/lnet"

#eval "`printTestPlan`" | bin/run.js "../test/rc/06 Cloud 1, Kiev - Miami.json" 2>&1
#EXIT_CODE=$?
#[[ $EXIT_CODE == 0 ]] && echo "TEST PASSED" || echo "TEST FAILED, EXIT_CODE=$EXIT_CODE"

while getopts ':u:' opt; do  # $opt will receive the option *letters* one by one; a trailing : means that an arg. is required, reported in $OPTARG.
  [[ $opt == '?' ]] && dieSyntax "Unknown option: -$OPTARG"
  [[ $opt == ':' ]] && dieSyntax "Option -$OPTARG is missing its argument."
  case "$opt" in
    u) # private option, used by the script itself
      mockHub "$OPTARG"; exit
      ;;
    *) # An unrecognized switch.
      dieSyntax "Invalid option: $opt"
      ;;
  esac
done

# Start HubRegistrarServer on the localhost, wait for it to start.
./bin/registrar.js -1 &
sleep 2

# Do some IPC.
#for hub in hub1 hub2 hub3 hub4 hub5 hub6 hub7 hub8 hub9 hub10; do
for hub in hub1 hub2; do
  "$BASH_SOURCE" -u $hub &
done
#----------------------------------
: <<'EOF_TEST_PLAN'
sleep 3
echo "hub1 git pull origin master"
sleep 30
EOF_TEST_PLAN
