#!/usr/bin/env bash
# === configureTargetBox.sh ===
# Configure target box from a source box
#
# Accepts one argument: remote address of the target box. Examples: "73.244.212.210", "127.0.0.1:10023"

unset CDPATH  # To prevent unexpected `cd` behavior.

declare target="$1" # remote address of the target box

pushd ~/project/lnet/test/rc/05
rm distro.tar.gz 2>/dev/null
tar -czvf distro.tar.gz distro
scp distro.tar.gz $target:~/

# If there is no latest-distro.tar.gz on the target box, we assume that there is no distro dir there either.
# So let us extract the distro dir from the tarball and call the tarball latest-distro.tar.gz from now on.
# Normally, this step runs only for the first time - unless the distro/ctl/configureLocalBox.sh file gets 
# updated on the source box. In this case both latest-distro.tar.gz and the distro dir must be manually 
# removed to enable this step.
ssh $target "[[ ! -s latest-distro.tar.gz ]] && tar -xzvf distro.tar.gz && mv distro.tar.gz latest-distro.tar.gz"

ssh $target distro/ctl/configureLocalBox.sh
popd
