#!/usr/bin/env bash
# === 05 Cloud Trust, Ltd.sh ===
# Test the Cloud Trust configuration process

# In this test, we will initially configure and be updating in the future
# the ctl service itself - the service that runs the Cloud Trust configuration process
# on all our boxes in the cloud. This script, '05 Cloud Trust, Ltd.sh', runs on the
# source box, and the source box is not part of the cloud. This script invokes the
# '05 Cloud Trust, Ltd.js' file. In turn, the javascript file reads the cloud configuration
# from '05 Cloud Trust, Ltd.json' and uses this JSON file to configure the shell script's
# environment.