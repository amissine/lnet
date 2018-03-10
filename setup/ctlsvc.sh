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
# Run ctlsvc daemon on either Ubuntu or macOS.
#
# See also:
#   https://docs.google.com/document/d/1JPzTa7IXEQL0NZLoO5leCNj40e7yy1dFNMiqTtBNH2o/
#   https://www.gnu.org/software/bash/manual/bashref.html
#   https://tiswww.case.edu/php/chet/bash/bashref.html

unset CDPATH  # To prevent unexpected 'cd' behavior.

CTLSVC_ACCOUNT=@CTLSVC_ACCOUNT@
CTLSVC_NAME="ctlsvc_$CTLSVC_ACCOUNT"

declare logfile="/tmp/$CTLSVC_NAME.log"

log() {
  local f='-Ins' timestamp=$([[ `uname` == "Darwin" ]] && gdate $f || date $f)
  echo "$timestamp $1" >> $logfile
}

check() {
  su - $CTLSVC_ACCOUNT -c "sudo -E make -f project/lnet/setup/Makefile" >> $logfile 2>/dev/null &
}

git() {
  local line="$1"
#  su - $CTLSVC_ACCOUNT -c "cd ~/project/lnet; $line; sudo su - ctl -c 'echo check >> /tmp/ctlsvc_alec'" >> $logfile 2>/dev/null &
  su - $CTLSVC_ACCOUNT -c "cd ~/project/lnet; $line; sudo su - ctl -c 'echo check >> /tmp/$CTLSVC_NAME'" >> $logfile 2>/dev/null &
}

readPipe() {
  local line pipe="/tmp/$CTLSVC_NAME"
  rm $pipe > /dev/null 2>&1
  mkfifo $pipe
  chgrp ctl $pipe; [ `uname` = 'Darwin' ] && chgrp admin $pipe; chmod 660 $pipe

  log "Reading input lines from $pipe"
  while true; do
    if read line < $pipe; then
      log "$line"
      [[ ${line:0:3} == 'git' ]] && { git "$line"; continue; }
      [[ ${line:0:5} == 'check' ]] && { check; continue; }
      [[ ${line:0:4} == 'exit' ]] && break
    else break; fi
  done
  rm $pipe > /dev/null 2>&1
  log "Exiting $0..."
}

readPipe &
