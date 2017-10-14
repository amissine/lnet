#!/usr/bin/env node

const context = require("../conf/context.json")

setInterval(() => { console.log("heartbeat") }, context.heartbeatRateMs)
console.log("heartbeat from " + process.argv[2])
