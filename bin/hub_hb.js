#!/usr/bin/env node
/*
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
# === hub_hb.js ===
# This javascript gets started when a remote leaf connects to the hub on
# the localhost.
#
# See also:
#   https://docs.google.com/document/d/1JPzTa7IXEQL0NZLoO5leCNj40e7yy1dFNMiqTtBNH2o/
*/
const cloud = require(`../conf/cloud-${process.argv[3]}.json`)
const Hub   = require("../lib/hub")

new Hub( { heartbeatRateMs: cloud.heartbeatRateMs, hip: process.argv[2], 
  branch: process.argv[3], mock: process.argv[4] } )
