#!/usr/bin/env bash
#
# See also: https://tiswww.case.edu/php/chet/bash/bashref.html

N=3 # number of eosd producers
TEST_DATA_DIR=test/rc/04
YYMMDD=$([[ `uname` == "Darwin" ]] && gdate +%y%m%d || date +%y%m%d)

# Configure eosd data-dir on the remote hub
scp_hub_data() {
  mv $hub_data $hub_HOSTNAME
  scp -r $hub_HOSTNAME $hub_ip:project/lnet/$TEST_DATA_DIR
}

# Find $1 in $hub_list
in_hub_list() {
  for nh in ${hub_list[@]}; do
    nonhub_HOSTNAME=${nh%% *}; nh=${nh#* }
    nonhub_ip=${nh%% *}; nh=${nh#* }
    nonhub_lp=${nh%% *}; nh=${nh#* } # using local port forwarding
    nonhub_data=$nh
    [[ "$1" == "$nonhub_data" ]] && return 0
  done
  return 1
}

# Configure eosd data-dir on the remote non-hub box
scp_nonhub_data() {
  mv $nonhub_data $nonhub_HOSTNAME
}

# Configure eosd data-dirs, both localhost leaf and all the remote boxes
configure_eosd_dirs() {
  echo "Configuring $1 et al"
  pushd $TEST_DATA_DIR

  [[ -d "tn_data_0" ]] || $HOME/product/eos/build/programs/launcher/launcher -p$N -o o.json
  ./configure $1 > /tmp/$YYMMDD.context; EXIT_CODE=$?
  for tn_data in $(ls | grep tn_data); do
    printf '\n- tn_data == %s\n\n' $tn_data # TODO remove this line
    cp $HOME/product/eos/build/genesis.json $tn_data
    . /tmp/$YYMMDD.context
    [[ "$tn_data" == "$leaf_data" ]] && mv $tn_data $1       # leaf data-dir configured TODO: rename back
    [[ "$tn_data" == "$hub_data" ]] && scp_hub_data          # hub data-dir configured      :   until all
    in_hub_list "$tn_data"; [[ $? == 0 ]] && scp_nonhub_data # non-hub data-dir configured  :        done
  done
  popd; return $EXIT_CODE
 
#  rm genesis.json; rm o.json; rm *.dot; rm -rf tn_data_?
}

# Skip the rest of the test
work_in_progress() {
  echo "------ work in progress, EXIT_CODE == $?  ------"; popd; exit $EXIT_CODE
}

pushd "$HOME/project/lnet"

# If eosd data-dir does not exist, configure it
EOSD_DATA_DIR="$TEST_DATA_DIR/$HOSTNAME"
[[ -d "$EOSD_DATA_DIR" ]] || configure_eosd_dirs "$HOSTNAME" || work_in_progress

# Connect to the hub and run the test
cp test/rc/04\ eosd\ basics.json conf/context.json
bin/run.js
EXIT_CODE=$?
[[ $EXIT_CODE == 0 ]] && echo "TEST PASSED" || echo "TEST FAILED, EXIT_CODE=$EXIT_CODE"

# Remove the eosd data-dir
# rm -rf "$EOSD_DATA_DIR"

popd
