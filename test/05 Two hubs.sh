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
# Test the bridge functionality on the leaves, with one leaf on kiev-hub
# connected to both kiev-hub and mia-hub.
#
# See also:
#   https://docs.google.com/document/d/1JPzTa7IXEQL0NZLoO5leCNj40e7yy1dFNMiqTtBNH2o/
#   https://www.gnu.org/software/bash/manual/bashref.html
#   https://tiswww.case.edu/php/chet/bash/bashref.html

kTHIS_NAME=${BASH_SOURCE##*/} # whatever is left after the last '/' in the script name

unset CDPATH  # To prevent unexpected `cd` behavior.

# --- Begin: STANDARD HELPER FUNCTIONS

declare logfile="/tmp/test05.log" EXIT_CODE

log() {
  local f='-Ins' timestamp=$([[ `uname` == "Darwin" ]] && gdate $f || date $f)
  echo "$timestamp $1" >> $logfile
}

die() { echo "$kTHIS_NAME: ${1:-"ABORTING due to unexpected error."}" 1>&2; exit ${2:-1}; }
dieSyntax() { echo "$kTHIS_NAME: ARGUMENT ERROR: ${1:-"Invalid argument(s) specified."} Use -h for help." 1>&2; exit 2; }

# Print the embedded help info to stdout.
printUsage() {
  sed -n -e $'/^: <<\'EOF_HELP\'/,/^EOF_HELP/ { s///; t\np;}' "$BASH_SOURCE"
}

# --- Begin: TEST FUNCTIONS

runAll() { # run from mia macOS 
  [ -f ./hkac.t05 ] || { cat <<EOF_HKAC

  Please run the host key authentication check as follows:

    "$0" -c

  Having run it successfully, you are good to go with '"$0" -a'.

EOF_HKAC
    EXIT_CODE=1
    return $EXIT_CODE
  }
  local announcement="Hub Registry Server restarted, press Ctrl-C to continue."
  local command="\"{ cd ~/project/lnet; test/12\ Hub\ Registry\ Server\ ctl.sh; echo $announcement; }\""
  for hub in "ssh ctl@176.37.63.2 $command" "ssh ctl@10.0.0.10 $command"; do
    echo "Running '$hub'..."; eval "$hub"; EXIT_CODE=$?; [ $EXIT_CODE != 255 ] && break
  done
  [ $EXIT_CODE = 255 ] && EXIT_CODE=0 || return $EXIT_CODE

  echo "Starting the leaves..." # starting the leaves
  local cmdPrefix="{ cd ~/project/lnet; test/05\ Two\ hubs.sh" cmdSuffix="sleep 2; tail -f /tmp/admin_2hubs.out; }"
  ttab -w -t "kiev-leaf0" ssh admin@176.37.63.2 "${cmdPrefix} -l; ${cmdSuffix}"
  sleep 10
  #ttab -w -t "kiev-leaf1" ssh admin@176.37.63.2 ssh 192.168.1.51 "\"${cmdPrefix} -k; ${cmdSuffix}\""
  ttab -w -t "kiev-leaf2" ssh admin@176.37.63.2 ssh 192.168.1.52 "\"${cmdPrefix} -k; ${cmdSuffix}\""
  cmdSuffix="sleep 2; tail -f /tmp/alec_2hubs.out; }"
  ttab -w -t "mia-leaf0" ssh 10.0.0.10 "${cmdPrefix} -n; ${cmdSuffix}"
  ttab -w -t "mia-leaf1" ssh 10.0.0.6 "${cmdPrefix} -m; ${cmdSuffix}"
  ttab -w -t "mia-leaf2" ssh 10.0.0.18 "${cmdPrefix} -m; ${cmdSuffix}"
  sleep 15
  ttab -w -t "mia-leaf3" "test/05\ Two\ hubs.sh -m; sleep 2; tail -f /tmp/alec_2hubs.out"
}

runHkac() { # run from mia macOS
  for hub in "ssh admin@176.37.63.2 \"cd ~/project/lnet; test/05\ Two\ hubs.sh -A\"" \
             "ssh 10.0.0.10 \"cd ~/project/lnet; test/05\ Two\ hubs.sh -B\""; do
    echo "Running '$hub'..."; eval "$hub"; EXIT_CODE=$?; [ $EXIT_CODE != 0 ] && break
  done
  [ $EXIT_CODE = 0 ] && echo SUCCESS >> ./hkac.t05
  return $EXIT_CODE
}

kievHubHkac() {
  for leaf in "ssh ctl@localhost echo SUCCESS" "ssh 192.168.1.52 ssh ctl@192.168.1.50 echo SUCCESS"; do
    echo "  Running '$leaf'..."; eval "$leaf"; EXIT_CODE=$?; [ $EXIT_CODE != 0 ] && break
  done
  return $EXIT_CODE
}

miaHubHkac() {
  for leaf in "ssh admin@176.37.63.2 ssh ctl@73.244.212.210 echo SUCCESS" \
    "ssh 10.0.0.6 ssh ctl@10.0.0.10 echo SUCCESS" "ssh 10.0.0.18 ssh ctl@10.0.0.10 echo SUCCESS" \
    "ssh 10.0.0.20 ssh ctl@10.0.0.10 echo SUCCESS"; do
    echo "  Running '$leaf'..."; eval "$leaf"; EXIT_CODE=$?; [ $EXIT_CODE != 0 ] && break
  done
  return $EXIT_CODE
}

#----------------------------------
[ `pwd` != "$HOME/project/lnet" ] && die "Please run this script from $HOME/project/lnet"

while getopts ':aABchklmn' opt; do  # $opt will receive the option *letters* one by one; a trailing : means that an arg. is required, reported in $OPTARG.
  [[ $opt == '?' ]] && dieSyntax "Unknown option: -$OPTARG"
  [[ $opt == ':' ]] && dieSyntax "Option -$OPTARG is missing its argument."
  case "$opt" in
    a) # run the test on all the boxes
      runAll "test/rc/05\ Two\ hubs.json" && die "TEST STARTED" 0 || die "EXIT_CODE=$EXIT_CODE" $EXIT_CODE
      ;;
    A) # private switch, used to check host key authentication of kiev-hub
      kievHubHkac && die "SUCCESS" 0 || die "EXIT_CODE=$EXIT_CODE" $EXIT_CODE
      ;;
    B) # private switch, used to check host key authentication of mia-hub
      miaHubHkac && die "SUCCESS" 0 || die "EXIT_CODE=$EXIT_CODE" $EXIT_CODE
      ;;
    c) # run the host key authentication check on all the boxes
      runHkac && die "SUCCESS" 0 || die "EXIT_CODE=$EXIT_CODE" $EXIT_CODE
      ;;
    h) # print usage
      printUsage; exit 0
      ;;
    k) # kiev leaf 1 or 2; connects to kiev-hub
      config="../test/rc/05 Two hubs, Kiev leaf.json"
      ;;
    l) # kiev leaf 0; connects to both kiev-hub and mia-hub
      config="../test/rc/05 Two hubs, kiev hub.json"
      ;;
    m) # mia leaf 1, 2, or 3; connects to mia-hub
      config="../test/rc/05 Two hubs, mia leaf.json"
      ;;
    n) # mia leaf 0; connects to mia-hub only
      config="../test/rc/05 Two hubs, mia hub.json"
      ;;
    *) # An unrecognized switch.
      dieSyntax "Invalid option: $opt"
      ;;
  esac
done
[ -z "$config" ] && dieSyntax "Please specify the configuration option."

pipe="/tmp/${USER}_2hubs.in"; rm $pipe 2>/dev/null; mkfifo $pipe; rm "/tmp/${USER}_2hubs.out" 2>/dev/null
cat $pipe | gitdesc=`git describe` IO_SUFFIX=_2hubs bin/lnet.js "$config" >> "/tmp/${USER}_2hubs.out" 2>&1 &
EXIT_CODE=$?
[[ $EXIT_CODE == 0 ]] && echo "TEST PASSED" || echo "TEST FAILED, EXIT_CODE=$EXIT_CODE"

#----------------------------------
: <<'EOF_HELP'

  The configuration options are:

    -a  try and run the test on all the boxes that have been configured for the test
    -c  run the host key authentication check on all the boxes
    -h  print this message to stdout
    -k  start the test on localhost as kiev-leaf
    -l  start the test on the kiev-hub localhost, connect to both kiev-hub and mia-hub
    -m  start the test on localhost as mia-leaf
    -n  start the test on the mia-hub localhost, connect to mia-hub only

  See also: https://docs.google.com/document/d/1JPzTa7IXEQL0NZLoO5leCNj40e7yy1dFNMiqTtBNH2o

EOF_HELP
