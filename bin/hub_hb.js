#!/usr/bin/env node

const context = require("../conf/context.json")

setInterval(() => { console.log("heartbeat") }, context.heartbeatRateMs)

