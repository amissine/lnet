#!/usr/bin/env bash
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
# === 09 sudo svcadd ctlsvc.sh ===
# Add to the box the Cloud Trust Ltd service along with its sudoer ctlsvc

unset CDPATH  # To prevent unexpected `cd` behavior.

# Make sure the script is run by root
if [ "`id -u`" != "0" ]; then echo "Please try sudo -E '$BASH_SOURCE'"; exit 1; fi

declare CTLSVC # The name of the service and the sudoer the service is associated with

set_CTLSVC() { # Extract the service name from the script name
  local RESULT="${BASH_SOURCE##* }"
  CTLSVC="${RESULT%.*}"
}

user_add() { # Add UNIX account for the sudoer $CTLSVC (NOPASSWD) to the box
  echo -n "Adding user $1 group $2... "
  if [ `uname` = "Darwin" ]; then user_mac $@; return $?; fi

  local name=$1 group=$2
  useradd -d /home/$name -s /bin/bash -g $group $name
  chown -R $name /home/$name; chgrp -R $group /home/$name
  [ "$group" = "sudo" ] && echo "$name ALL = NOPASSWD: ALL" > /etc/sudoers.d/$name
  mkdir -p /home/$name/.ssh
  chmod 700 /home/$name/.ssh
#  cp /Users/$SUDO_USER/.ssh/id_rsa.pub /Users/$name/.ssh/authorized_keys
}

user_mac() {
  local name=$1 group=$2 group2use="admin"
  local -i users=$(dscl . -list /Users | wc -l)
  echo -n "Starting user_dscl... "
  [ $users -gt 256 ] && { echo " Too many users=$users"; return 10; }
  dscl . -create /Users/$name
  dscl . -create /Users/$name UserShell /bin/bash
  local -i maxid=$(dscl . -list /Users UniqueID | awk '{print $2}' | sort -ug | tail -1)
  dscl . -create /Users/$name UniqueID $((maxid+1))
  dscl . create /Users/$name PrimaryGroupID 20 # This is the "staff" group
  dscl . create /Users/$name NFSHomeDirectory /Users/$name; sleep 5 # wait for the dscl to complete
  chown -R $name:staff /Users/$name
  [ "$group" != "sudo" ] && group2use=$group
  dseditgroup -o edit -t user -a $name $group2use
  mkdir -p /Users/$name/.ssh
  chmod 700 /Users/$name/.ssh
#  cp /Users/$SUDO_USER/.ssh/id_rsa.pub /Users/$name/.ssh/authorized_keys
}

makefile_add2sudoer() { # Add Makefile to /home/$CTLSVC
  cp /home/$SUDO_USER/project/lnet/test/rc/Makefile /home/$CTLSVC
}

set_CTLSVC
user_add $CTLSVC sudo && echo "Sudoer $CTLSVC added" \
 || { ec=$?; echo "Exiting with exit code $ec"; exit $ec; }
#makefile_add2sudoer

#pushd /home/$CTLSVC
#su -c 'sudo -E make' - $CTLSVC
#popd