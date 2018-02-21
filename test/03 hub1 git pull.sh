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
# === 03 hub1 git pull.sh ===
# Remotely execute 'git pull' on hub1
#
# See also:
#   https://docs.google.com/document/d/1JPzTa7IXEQL0NZLoO5leCNj40e7yy1dFNMiqTtBNH2o/
#   https://www.gnu.org/software/bash/manual/bashref.html
#   https://tiswww.case.edu/php/chet/bash/bashref.html

unset CDPATH  # To prevent unexpected `cd` behavior.

#----------------------------------
pushd "$HOME/project/lnet"

#
# IMPORTANT: the first time, we MUST connect to the hub manually - to add it to known_hosts
#
pipe="/tmp/${USER}_mia-hub.in"; rm $pipe 2>/dev/null; mkfifo $pipe
cat $pipe | bin/run.js "../test/rc/06 Cloud 1, Kiev - Miami.json" >> "/tmp/${USER}_mia-hub.out" 2>&1 &
EXIT_CODE=$?
sleep 30; echo 'hub1 git pull origin master' >> $pipe
[[ $EXIT_CODE == 0 ]] && echo "TEST PASSED" || echo "TEST FAILED, EXIT_CODE=$EXIT_CODE"
# alec@mba ~ $ echo "hub1 exit" >> /tmp/alec_mia-hub.in

popd
#----------------------------------
