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

: <<'EOF_hub_history'
   70  groupadd ctl_leaves
   71  useradd -d /home/ctl -s /bin/bash -g ctl_leaves ctl
   72  ls -la /home/
   73  mkdir -p /home/ctl
   74  chown ctl /home/ctl
   75  chgrp ctl_leaves /home/ctl
   76  su ctl

    2  cd $HOME
    3  mkdir project
    4  cd project/
    6  ln -s /home/alec/project/lnet/ lnet
    9  ls -lLa lnet
   12  cd ~/
   13  mkdir .ssh
   14  cd .ssh/
   15  cp /home/alec/.ssh/id_rsa.pub .
   16  cp /home/alec/id_rsa.pub .
   17  mv id_rsa.pub authorized_keys
   18  ls -la
   19  cd ..
   21  chmod 700 .ssh/
EOF_hub_history