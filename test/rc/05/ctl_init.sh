#!/usr/bin/env bash

declare logfile="/tmp/lnet.log"

log() {
  local f='-Ins' timestamp=$([ `uname` == "Darwin" ] && gdate $f || date $f)
  echo "$timestamp $1" >> $logfile
}

while true; do
  if read line; then
    log "$line"
  else break; fi
done
