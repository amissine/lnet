#!/usr/bin/env bash

EOSD=$HOME/product/eos/build/programs/eosd/eosd
TEST_DATA_DIR=test/rc/04

DATA_DIR=$TEST_DATA_DIR/$HOSTNAME

GENESIS_JSON=$DATA_DIR/genesis.json

cd $HOME/project/lnet
$EOSD --data-dir $DATA_DIR --genesis-json $GENESIS_JSON
