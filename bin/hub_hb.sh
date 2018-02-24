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
# === hub_hb.sh ===
# This is the script that gets started when a remote leaf connects to the hub on
# the localhost. It accepts two arguments:
# - the IP address of the localhost as seen by the leaf;
# - the port (unique for the localhost) assigned to the leaf by the localhost.
#
# The second argument enables localized networking on the leaf from the localhost.
# Both arguments are being passed to the javascript responsible for maintaining
# heartbeats and supporting the bridge functionality between all hubs on the
# localhost.
#
# See also:
#   https://docs.google.com/document/d/1JPzTa7IXEQL0NZLoO5leCNj40e7yy1dFNMiqTtBNH2o/

PATH="/usr/local/bin:$PATH"
cd $HOME/project/lnet/bin
./hub_hb.js "$1" "$2"
