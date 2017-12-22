#!/usr/bin/env bash
# === configureLocalBox.sh ===
# Complete the configuration of the target box on the localhost

unset CDPATH  # To prevent unexpected `cd` behavior.

CTL_HOME=/home/alec

declare -i exit_code
declare pipe="/tmp/ctl"

pushd $CTL_HOME
service ctl status; exit_code=$?
[[ $exit_code != 0 ]] && { sudo distro/ctl/ctlService.sh; sleep 3; }
# sleep 1
echo "distro copied" >> $pipe
popd
