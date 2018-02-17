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
# === create_nosudoer.sh ===
# Creates a nosudoer account on either Ubuntu or macOS. If the account already exists, 
# it will first be deleted completely and all its data will be lost.
#
# Accepts one argument:
# - name of the account.
#
# See also:
#   https://docs.google.com/document/d/1JPzTa7IXEQL0NZLoO5leCNj40e7yy1dFNMiqTtBNH2o/
#   https://www.gnu.org/software/bash/manual/bashref.html
#   https://tiswww.case.edu/php/chet/bash/bashref.html

unset CDPATH  # To prevent unexpected 'cd' behavior.

nosudoer_create() {
  echo -n "Creating user $1... "
  if [ `uname` = "Darwin" ]; then nosudoer_create_mac $1; return $?; fi

  local name=$1 group=$2
  mkdir -p /home/$name/.ssh
  chmod 700 /home/$name/.ssh
  useradd -d /home/$name -s /bin/bash -g $group $name
  chown -R $name /home/$name; chgrp -R $group /home/$name
  [ "$group" = "sudo" ] && echo "$name ALL = NOPASSWD: ALL" > /etc/sudoers.d/$name
}

nosudoer_create_mac() {
# https://apple.stackexchange.com/questions/274954/cannot-create-a-user-account-on-mac-using-command-line
  local name=$1
  local -i users=$(dscl . -list /Users | wc -l) user=$(dscl . -list /Users | grep $name | wc -l)
  echo -n "Starting nosudoer_create_mac... "
  [ $user -gt 0 ] && { echo " User $name found, deleting..."; return 10; }
  [ $users -gt 256 ] && { echo " Too many users=$users"; return 20; }
  dscl . -create /Users/$name
  dscl . -create /Users/$name UserShell /bin/bash
  local -i maxid=$(dscl . -list /Users UniqueID | awk '{print $2}' | sort -ug | tail -1)
  dscl . -create /Users/$name UniqueID $((maxid+1))
  dscl . create /Users/$name PrimaryGroupID 20 # This is the "staff" group
  dscl . create /Users/$name NFSHomeDirectory /Users/$name
  [ "$group" != "sudo" ] && group2use=$group
  dseditgroup -o edit -t user -a $name $group2use
  mkdir -p /Users/$name/.ssh
  chmod 700 /Users/$name/.ssh
  chown -R $name:staff /Users/$name
}

nosudoer_create $1 && echo "Nosudoer $1 created" \
 || { ec=$?; echo "=== Exiting with exit code $ec"; exit $ec; }

