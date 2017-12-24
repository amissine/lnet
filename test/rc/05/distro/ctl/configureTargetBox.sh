#!/usr/bin/env bash
# === configureTargetBox.sh ===
# Configure target box from a source box
#
# Accepts two arguments: 
# - remote address of the target box; examples: "73.244.212.210", "127.0.0.1:10023"
# - command to pass to the ctl service on the target box; commands known so far:
#   - "distro copied" (default)
#   - "exit"
#   - "useradd <name>"  - WORK IN PROGRESS

unset CDPATH  # To prevent unexpected `cd` behavior.

declare target="$1"                     # remote address of the target box
declare ctl_cmd="${2:-"distro copied"}" # command to pass to the ctl service on the target box

CTL_HOME=/home/alec

pushd ~/project/lnet/test/rc/05
rm distro.tar.gz 2>/dev/null
tar -czvf distro.tar.gz distro
scp distro.tar.gz $target:$CTL_HOME

# If there is no latest-distro.tar.gz on the target box, we assume that there is no distro dir there either.
# So let us extract the distro dir from the tarball and call the tarball latest-distro.tar.gz from now on.
# Normally, this step runs only for the first time - unless the distro/ctl/configureLocalBox.sh file gets 
# updated on the source box. In this case both latest-distro.tar.gz and the distro dir must be manually 
# removed to enable this step.
ssh $target "[[ ! -s latest-distro.tar.gz ]] && tar -xzvf distro.tar.gz && mv distro.tar.gz latest-distro.tar.gz"

ssh $target distro/ctl/configureLocalBox.sh "$ctl_cmd"
popd
