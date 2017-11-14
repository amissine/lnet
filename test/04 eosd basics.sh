#!/usr/bin/env bash
#
# See also: https://tiswww.case.edu/php/chet/bash/bashref.html

# Configure eosd data-dir
configure_eosd_data_dir() {
  echo "Configuring eosd data-dir $1"
  mkdir -p $1
}

pushd "$HOME/project/lnet"

# If eosd data-dir does not exist, configure it
EOSD_DATA_DIR="test/rc/04/$HOSTNAME"
[[ -d "$EOSD_DATA_DIR" ]] || configure_eosd_data_dir "$EOSD_DATA_DIR"

# Connect to the hub and run the test
cp test/rc/04\ eosd\ basics.json conf/context.json
bin/run.js
EXIT_CODE=$?
[[ $EXIT_CODE == 0 ]] && echo "TEST PASSED" || echo "TEST FAILED, EXIT_CODE=$EXIT_CODE"

# Remove the eosd data-dir
rm -rf "$EOSD_DATA_DIR"

popd
