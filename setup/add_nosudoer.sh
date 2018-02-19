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
# === add_nosudoer.sh ===
# Adds a nosudoer account on either Ubuntu or macOS. If the account already exists, 
# nothing happens.
#
# Accepts one argument:
# - name of the account.
#
# See also:
#   https://docs.google.com/document/d/1JPzTa7IXEQL0NZLoO5leCNj40e7yy1dFNMiqTtBNH2o/
#   https://www.gnu.org/software/bash/manual/bashref.html
#   https://tiswww.case.edu/php/chet/bash/bashref.html

unset CDPATH  # To prevent unexpected 'cd' behavior.

nosudoer_add() {
  echo -n "Adding user $1... "
  if [ `uname` = "Darwin" ]; then nosudoer_add_mac $1; return $?; fi

  local name=$1
  [ -d /home/$name ] && { echo " User $name found"; return; }
  mkdir -p /home/$name/.ssh
  chmod 700 /home/$name/.ssh
  useradd -d /home/$name -s /bin/bash $name
  chown -R $name /home/$name
}

nosudoer_add_mac() {
# https://apple.stackexchange.com/questions/274954/cannot-create-a-user-account-on-mac-using-command-line
  local name=$1
  local -i users=$(dscl . -list /Users | wc -l) user=$(dscl . -list /Users | grep $name | wc -l)
  echo -n "Starting nosudoer_add_mac... "
  [ $user -gt 0 ] && { echo " User $name found"; return 1; }
  [ $users -gt 256 ] && { echo " Too many users=$users"; return 2; }
  dscl . -create /Users/$name
  dscl . -create /Users/$name UserShell /bin/bash
  local -i maxid=$(dscl . -list /Users UniqueID | awk '{print $2}' | sort -ug | tail -1)
  dscl . -create /Users/$name UniqueID $((maxid+1))
  dscl . create /Users/$name PrimaryGroupID 20 # This is the "staff" group
  dscl . create /Users/$name NFSHomeDirectory /Users/$name
  mkdir -p /Users/$name/.ssh
  chmod 700 /Users/$name/.ssh
  chown -R $name:staff /Users/$name
}

nosudoer_add $1 && echo "Nosudoer $1 added" \
 || { ec=$?; echo "=== Exiting with exit code $ec"; exit $ec; }
