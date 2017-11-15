#!/usr/bin/env bash
#
# See also: https://tiswww.case.edu/php/chet/bash/bashref.html

TEST_DATA_DIR=test/rc/04

# Configure eosd data-dir
configure_eosd_data_dir() {
  echo "Configuring eosd data-dir $1"
  pushd $TEST_DATA_DIR

  rm genesis.json; rm o.json; rm *.dot; rm -rf tn_data_?

  cp $HOME/product/eos/build/genesis.json .
  $HOME/product/eos/build/programs/launcher/launcher -p3 -o o.json
  ./configure
 
  rm genesis.json; rm o.json; rm *.dot; rm -rf tn_data_?

  popd; return   # work in progress

  mkdir $1; popd # ready to run the test
}

# Skip the rest of the test
work_in_progress() {
  echo "------ work in progress ------"; popd; exit
}

pushd "$HOME/project/lnet"

# If eosd data-dir does not exist, configure it
EOSD_DATA_DIR="$TEST_DATA_DIR/$HOSTNAME"
[[ -d "$EOSD_DATA_DIR" ]] || configure_eosd_data_dir "$HOSTNAME"

# Allow for work in progress
[[ -d "$EOSD_DATA_DIR" ]] || work_in_progress

# Connect to the hub and run the test
cp test/rc/04\ eosd\ basics.json conf/context.json
bin/run.js
EXIT_CODE=$?
[[ $EXIT_CODE == 0 ]] && echo "TEST PASSED" || echo "TEST FAILED, EXIT_CODE=$EXIT_CODE"

# Remove the eosd data-dir
rm -rf "$EOSD_DATA_DIR"

popd
