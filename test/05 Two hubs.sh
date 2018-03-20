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
# === 05 Two hubs.sh ===
# Test the bridge functionality on the leaves, each leaf connected to 2 hubs
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

# Print the embedded help info to stdout.
printUsage() {
  sed -n -e $'/^: <<\'EOF_HELP\'/,/^EOF_HELP/ { s///; t\np;}' "$BASH_SOURCE"
}

# --- Begin: TEST FUNCTIONS

runAll() {
  local conf="$HOME/project/lnet/$1"
  echo "runAll: using configuration file $conf"
  local output=$(node <<EOF_JS
const conf = require("$conf")
const util = require("util")
console.log(util.inspect(conf))
EOF_JS
)
  echo "$output"
}

#----------------------------------
[ `pwd` != "$HOME/project/lnet" ] && die "Please run this script from $HOME/project/lnet"

while getopts ':ahklm' opt; do  # $opt will receive the option *letters* one by one; a trailing : means that an arg. is required, reported in $OPTARG.
  [[ $opt == '?' ]] && dieSyntax "Unknown option: -$OPTARG"
  [[ $opt == ':' ]] && dieSyntax "Option -$OPTARG is missing its argument."
  case "$opt" in
    a) # run the test on all the boxes
      runAll "test/rc/05\ Two\ hubs.json"; exit 0
      ;;
    h) # print usage
      printUsage; exit 0
      ;;
    k) # kiev leaf
      config="../test/rc/05 Two hubs, Kiev leaf.json"
      ;;
    l) # kiev hub, and the leaf on it connects to both kiev-hub and mia-hub
      config="../test/rc/05 Two hubs, kiev hub.json"
      ;;
    m) # mia leaf
      config="../test/rc/05 Two hubs, mia leaf.json"
      ;;
    *) # An unrecognized switch.
      dieSyntax "Invalid option: $opt"
      ;;
  esac
done
[ -z "$config" ] && dieSyntax "Please specify the configuration option."

pipe="/tmp/${USER}_2hubs.in"; rm $pipe 2>/dev/null; mkfifo $pipe; rm "/tmp/${USER}_2hubs.out"
cat $pipe | bin/lnet.js "$config" >> "/tmp/${USER}_2hubs.out" 2>&1 &
EXIT_CODE=$?
[[ $EXIT_CODE == 0 ]] && echo "TEST PASSED" || echo "TEST FAILED, EXIT_CODE=$EXIT_CODE"
# admin@kiev-leaf2 ~ $ echo "hub0 exit" >> /tmp/admin_2hubs.in
# admin@kiev-leaf2 ~ $ echo "hub1 exit" >> /tmp/admin_2hubs.in

#----------------------------------
: <<'EOF_HELP'

  The configuration options are:

    -a  try and run the test on all the boxes that have been configured for the test
    -h  print this message to stdout
    -k  start the test on localhost as kiev-leaf
    -l  start the test on the kiev-hub localhost as kiev-leaf and mia-leaf
    -m  start the test on localhost as mia-leaf

  See also: https://docs.google.com/document/d/1JPzTa7IXEQL0NZLoO5leCNj40e7yy1dFNMiqTtBNH2o

EOF_HELP
