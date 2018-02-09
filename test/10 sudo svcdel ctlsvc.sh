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
# === 10 sudo svcdel ctlsvc.sh ===
# Delete from the box the Cloud Trust Ltd service along with its sudoer ctlsvc

unset CDPATH  # To prevent unexpected `cd` behavior.

# Make sure the script is run by root
if [ "`id -u`" != "0" ]; then echo "Please try sudo -E '$BASH_SOURCE'"; exit 1; fi

declare CTLSVC # The name of the service and the sudoer the service is associated with

set_CTLSVC() { # Extract the service name from the script name
  local RESULT="${BASH_SOURCE##* }"
  CTLSVC="${RESULT%.*}"
#  $1="${RESULT%.*}"
}

user_del() { # Delete UNIX account for the user $1 from the box
  echo -n "Deleting user $1 group $2... "
  if [ `uname` = "Darwin" ]; then user_del_mac $@; return $?; fi

  return 1 # TODO: implement
  local name=$1 group=$2
  useradd -d /home/$name -s /bin/bash -g $group $name
  chown -R $name /home/$name; chgrp -R $group /home/$name
  [ "$group" = "sudo" ] && echo "$name ALL = NOPASSWD: ALL" > /etc/sudoers.d/$name
  mkdir -p /home/$name/.ssh
  chmod 700 /home/$name/.ssh
}

user_del_mac() {
  echo -n "Starting user_del_mac... "
  local name=$1 group=$2 group2use="admin"
  local user=$(dscl . -list /Users | grep $name | wc -l)
  [ $user -eq 0 ] && { echo " User $name not found"; return 10; }
  [ "$group" != "sudo" ] && group2use=$group
  dseditgroup -o edit -t user -d $name $group2use
  rm -rf /Users/$name
  dscl . rm /Users/$name
}

makefile_add2sudoer() {
  cp /home/$SUDO_USER/project/lnet/test/rc/Makefile /home/$CTLSVC
}

#declare -n ref=CTLSVC; set_CTLSVC $ref
set_CTLSVC
user_del $CTLSVC sudo && echo "Sudoer $CTLSVC deleted" \
 || { ec=$?; echo "=== Exiting with exit code $ec"; exit $ec; }
#makefile_add2sudoer

#pushd /home/$CTLSVC
#su -c 'sudo -E make' - $CTLSVC
#popd