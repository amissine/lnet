#!/usr/bin/env node

const context = require("../conf/context.json")
const hub = process.argv[2]
const hbMsg = "heartbeat from " + hub

setInterval(() => { console.log(hbMsg) }, context.heartbeatRateMs)
console.log(hbMsg)
