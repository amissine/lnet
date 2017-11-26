#!/usr/bin/env bash
#
# See also: https://tiswww.case.edu/php/chet/bash/bashref.html

N=3 # number of eosd producers
TERMINAL="$HOME/project/lnet/bin/terminal"
TEST_DATA_DIR=test/rc/04
YYMMDD=$([[ `uname` == "Darwin" ]] && gdate +%y%m%d || date +%y%m%d)

EOSD_SH="project/lnet/$TEST_DATA_DIR/eosd.sh"

# Configure eosd data-dir on the local leaf, then run eosd in a separate terminal window
mv_leaf_data() {
  echo " "
  echo "- mv_leaf_data: mv $leaf_data $HOSTNAME"
  mv $leaf_data $HOSTNAME
  $TERMINAL "$HOME/$EOSD_SH"
}

# Configure eosd data-dir on the remote hub
scp_hub_data() {
  echo " "
  echo "- scp_hub_data:"
  echo "    mv $hub_data $hub_HOSTNAME"
  mv $hub_data $hub_HOSTNAME
  echo "    scp -r $hub_HOSTNAME $hub_ip:project/lnet/$TEST_DATA_DIR"
  scp -r $hub_HOSTNAME $hub_ip:project/lnet/$TEST_DATA_DIR
}

# Find $1 in $hub_list
in_hub_list() {
  local nh
  for nonhub in "${hub_list[@]}"; do
    nh=${nonhub}
    nonhub_HOSTNAME=${nh%% *}; nh=${nh#* }
    nonhub_ip=${nh%% *}; nh=${nh#* }
    nonhub_lp=${nh%% *}; nh=${nh#* } # using local port forwarding
    nonhub_data=$nh
    [[ "$1" == "$nonhub_data" ]] && return 0
  done
  return 1
}

# Configure eosd data-dir on the remote non-hub box, then run eosd there
# in a separate local terminal window
scp_nonhub_data() {
  echo " "
  echo "- scp_nonhub_data:"
  echo "    mv $nonhub_data $nonhub_HOSTNAME"
  mv $nonhub_data $nonhub_HOSTNAME
  echo "    ssh -L $nonhub_lp:$nonhub_ip:22 $hub_ip sleep 15 &"
  ssh -L $nonhub_lp:$nonhub_ip:22 $hub_ip sleep 15 &
#  ssh_pid=$!
  local -i scp_result=1
  while [ $scp_result -ne 0 ]; do
    sleep 1
    echo "    scp -r -P $nonhub_lp $nonhub_HOSTNAME localhost:project/lnet/$TEST_DATA_DIR"
    scp -r -P $nonhub_lp $nonhub_HOSTNAME localhost:project/lnet/$TEST_DATA_DIR
    scp_result=$?
  done
#  kill $ssh_pid
  $TERMINAL "ssh -p $nonhub_lp localhost "'"'"~/$EOSD_SH"'"'
}

# Configure eosd data-dirs, both localhost leaf and all the remote boxes
configure_eosd_dirs() {
  echo "- configuring $HOSTNAME et al"
  pushd $TEST_DATA_DIR

  [[ -d "tn_data_0" ]] || $HOME/product/eos/build/programs/launcher/launcher -p$N -o o.json
  ./configure $HOSTNAME > /tmp/$YYMMDD.context; EXIT_CODE=$?
  . /tmp/$YYMMDD.context
  for tn_data in $(ls | grep tn_data); do
    cp $HOME/product/eos/build/genesis.json $tn_data
    if [ "$tn_data" == "$leaf_data" ]; then mv_leaf_data
    elif [ "$tn_data" == "$hub_data" ]; then scp_hub_data
    else in_hub_list "$tn_data"; [[ $? == 0 ]] && scp_nonhub_data
    fi
  done
  popd; return $EXIT_CODE
}

# Skip the rest of the test
work_in_progress() {
  echo "------ work in progress, EXIT_CODE == $?  ------"; popd; exit $EXIT_CODE
}

pushd "$HOME/project/lnet"

# If eosd data-dir does not exist, configure it
EOSD_DATA_DIR="$TEST_DATA_DIR/$HOSTNAME"
[[ -d "$EOSD_DATA_DIR" ]] || configure_eosd_dirs || work_in_progress

# Connect to the hub and run the test
cp test/rc/04\ eosd\ basics.json conf/context.json
bin/run.js
EXIT_CODE=$?
[[ $EXIT_CODE == 0 ]] && echo "TEST PASSED" || echo "TEST FAILED, EXIT_CODE=$EXIT_CODE"

popd
