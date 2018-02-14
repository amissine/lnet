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
# === ctlsvc.sh ===
# Run ctlsvc daemon
#
# See also:
#   https://docs.google.com/document/d/1JPzTa7IXEQL0NZLoO5leCNj40e7yy1dFNMiqTtBNH2o/
#   https://www.gnu.org/software/bash/manual/bashref.html
#   https://tiswww.case.edu/php/chet/bash/bashref.html

unset CDPATH  # To prevent unexpected `cd` behavior.

CTLSVC_ACCOUNT=@CTLSVC_ACCOUNT@
CTLSVC_NAME="ctlsvc_$CTLSVC_ACCOUNT"

declare logfile="/tmp/$CTLSVC_NAME.log"

log() {
  local f='-Ins' timestamp=$([[ `uname` == "Darwin" ]] && gdate $f || date $f)
  echo "$timestamp $1" >> $logfile
}

makeDistro() {
  su -c 'make distro' - $CTLSVC_ACCOUNT
  service $CTLSVC_ACCOUNT stop; service $CTLSVC_ACCOUNT start; service $CTLSVC_ACCOUNT status
}

readPipe() {
  local line pipe="/tmp/$CTLSVC_NAME"
  rm $pipe > /dev/null 2>&1
  mkfifo $pipe
  chown $CTLSVC_ACCOUNT $pipe

  log "Reading input lines from $pipe"
  while true; do
    if read line < $pipe; then
      log "$line"
      [[ ${line:0:6} == 'distro' ]] && { makeDistro; continue; }
      [[ ${line:0:4} == 'exit' ]] && break
    else break; fi
  done
}

readPipe &