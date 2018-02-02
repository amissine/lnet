#!/usr/bin/env bash
# === 07 sudo svcadd ctl_admin1.sh ===
# Add to the box the Cloud Trust Ltd service along with its admin - sudoer ctl_admin1

unset CDPATH  # To prevent unexpected `cd` behavior.

# Make sure the script is run by root
if [ "`id -u`" != "0" ]; then echo "Please try sudo -E '$BASH_SOURCE'"; exit 1; fi

declare CTLNAME # The name of the service and the sudoer the service is associated with

set_CTLNAME() { # Extract the service name from the script name
  local RESULT="${BASH_SOURCE##* }"
  CTLNAME="${RESULT%.*}"
}

sudoer_add() { # Add UNIX account for the sudoer $CTLNAME (NOPASSWD) to the box
  useradd -d /home/$CTLNAME -s /bin/bash -g sudo $CTLNAME
  mkdir -p /home/$CTLNAME/.ssh
  chown -R $CTLNAME /home/$CTLNAME; chgrp -R sudo /home/$CTLNAME
  echo "$CTLNAME ALL = NOPASSWD: ALL" > /etc/sudoers.d/$CTLNAME
  chmod 700 /home/$CTLNAME/.ssh
}

makefile_add2sudoer() { # Add Makefile to /home/$CTLNAME
  cp /home/$SUDO_USER/project/lnet/test/rc/Makefile /home/$CTLNAME
}

set_CTLNAME
sudoer_add && echo "Sudoer $CTLNAME added" || exit 1
makefile_add2sudoer
pushd /home/$CTLNAME
su -c 'sudo -E make' - $CTLNAME
popd
