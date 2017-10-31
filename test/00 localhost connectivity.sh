#!/usr/bin/env bash
#
# See also: https://tiswww.case.edu/php/chet/bash/bashref.html

# Prints the embedded test plan to stdout.
printTestPlan() {
  sed -n -e $'/^: <<\'EOF_TEST_PLAN\'/,/^EOF_TEST_PLAN/ { s///; t\np;}' "$BASH_SOURCE"
}

# Attempt to set LNET_HOME and pushd there
# Resolve links: $0 may be a link
PRG="$0"
# Need this for relative symlinks.
while [ -h "$PRG" ] ; do
    ls=`ls -ld "$PRG"`
    link=`expr "$ls" : '.*-> \(.*\)$'`
    if expr "$link" : '/.*' > /dev/null; then
        PRG="$link"
    else
        PRG=`dirname "$PRG"`"/$link"
    fi
done
SAVED="`pwd`"
cd "`dirname \"$PRG\"`/.." >/dev/null
LNET_HOME="`pwd -P`"
#----------------------------------
pushd "$SAVED" >/dev/null

echo "`pwd`"
cp test/rc/00\ localhost\ connectivity.js conf/context.json
eval "`printTestPlan`" | bin/run.js

popd
#----------------------------------
: <<'EOF_TEST_PLAN'
echo "command2ignore"
sleep 60
EOF_TEST_PLAN

