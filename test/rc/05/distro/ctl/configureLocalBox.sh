#!/usr/bin/env bash
# === configureLocalBox.sh ===
# Complete the configuration of the target box on the localhost
#
# Accepts one argument:
# - command to pass to the ctl service on the target box; commands known so far:
#   - "distro copied" (default)
#   - "exit"
#   - "useradd <name>"  - WORK IN PROGRESS

unset CDPATH  # To prevent unexpected `cd` behavior.

declare ctl_cmd="$@" # command (with arguments) to pass to the ctl service on the target box

CTL_HOME=/home/alec

declare -i exit_code
declare pipe="/tmp/ctl"

pushd $CTL_HOME
service ctl status; exit_code=$?
[[ $exit_code != 0 ]] && { 
  sudo distro/ctl/ctlService.sh &
  sleep 3
}
echo "$ctl_cmd" >> $pipe
[[ $exit_code != 0 ]] && { sleep 3; echo "exit" >> $pipe; }
popd
