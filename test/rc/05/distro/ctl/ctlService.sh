#!/usr/bin/env bash
#
# The service waits for input on a named pipe /tmp/@CTLNAME@.
#
# TODO: update the comments below
#
# When the service reads a line that starts with 'distro',
# it checks if $CTL_HOME/distro.tar.gz should be used as the latest distro on the box. If yes, the old
# distro is completely removed before extracting the new one from the tarball.
#
# We assume here that whenever a new tarball gets created on the source box, the source box
# copies it to the target box (the localhost) and runs $CTL_HOME/distro/ctl/configureLocalBox.sh here. It is the 
# $CTL_HOME/distro/ctl/configureLocalBox.sh script that writes a 'distro copied' line into the /tmp/ctl pipe.

#su -c 'echo "`set`" > /tmp/ctlService.log' - alec # TODO: remove this comment

unset CDPATH  # To prevent unexpected `cd` behavior.

CTLNAME=@CTLNAME@

declare logfile="/tmp/$CTLNAME.log"

log() {
  local f='-Ins' timestamp=$([[ `uname` == "Darwin" ]] && gdate $f || date $f)
  echo "$timestamp $1" >> $logfile
}

makeDistro() {
  su -c 'make distro' - $CTLNAME
  service $CTLNAME stop; service $CTLNAME start; service $CTLNAME status
}

readPipe() {
  local line pipe="/tmp/$CTLNAME"
  rm $pipe > /dev/null 2>&1
  mkfifo $pipe
  chown $CTLNAME $pipe

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