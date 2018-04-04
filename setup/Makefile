#
# Copyright 2017 Alec Missine (support@minetats.com) 
#                and the Arbitrage Logistics International (ALI) project
#
# The ALI Project licenses this file to you under the Apache License, version 2.0
# (the "License"); you may not use this file except in compliance with the License.
# You may obtain a copy of the License at:
#
#   http://www.apache.org/licenses/LICENSE-2.0
#
# Unless required by applicable law or agreed to in writing, software distributed
# under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR
# CONDITIONS OF ANY KIND, either express or implied. See the License for the
# specific language governing permissions and limitations under the License.
#
# This makefile sets up your ctlsvc account, starts the service and configures SSH.
# It also configures all ALI accounts on your box: ctl, alik, and alit - if any of 
# these already exists, nothing happens. The alik and alit accounts belong to 
# the ali group, and all three accounts
# (as well as your ctlsvc account) belong to the ctl group. If any of these two 
# groups does not exist, this makefile creates the group.
#
# See also:
#   https://docs.google.com/document/d/1JPzTa7IXEQL0NZLoO5leCNj40e7yy1dFNMiqTtBNH2o/
#   https://www.gnu.org/software/make/manual/html_node/index.html

# Check if 'make' is run from your home directory.
ifneq ($(PWD),$(HOME))
  $(error Please try 'sudo -E make' from $(HOME) directory)
endif

# Run all shell commands with bash.
SHELL := bash

.PHONY: setup

setup: /etc/ssh/ssh_config /etc/ssh/sshd_config groups accounts ctlsvc
	@rm ctlsvc groups accounts

ctlsvc: ctlsvc_distro/ctlsvc.sh # start the ctlsvc_$(SUDO_USER) service and/or its daemon $<
	@if [ `uname` = 'Linux' ]; then svc="ctlsvc_$(SUDO_USER)"; [ -x /etc/init.d/$$svc ] || { \
	  cp project/lnet/setup/ctlsvc /etc/init.d/$$svc; \
	  cd /etc/init.d; sed -i "s/@CTLSVC_ACCOUNT@/$(SUDO_USER)/" $$svc; \
	  update-rc.d $$svc defaults; }; service $$svc start; service $$svc status; \
	 else \
	  rm $<.todelete 2>/dev/null; count="`ps -ef | grep '/usr/local/bin/bash ctlsvc_distro/ctlsvc.sh' | wc -l`"; \
	  [ "$$count" = "       4" ] && echo "$< is running" || { $<; echo "Started $<"; }; \
	 fi
	@echo $@ > $@

ctlsvc_distro/ctlsvc.sh: project/lnet/setup/ctlsvc.sh
	@svc="ctlsvc_$(SUDO_USER)"; if [ `uname` = 'Linux' ]; then service $$svc stop; \
	 else pipe="/tmp/$$svc"; [ -w $$pipe ] && echo "exit" >> $$pipe; sleep 2; fi; \
	 mkdir ctlsvc_distro 2>/dev/null; cp $< $@; chmod 744 $@; \
	 cd ctlsvc_distro; bak=''; [ `uname` = "Darwin" ] && bak=".todelete";\
	 sed -i $$bak "s/@CTLSVC_ACCOUNT@/$(SUDO_USER)/" ctlsvc.sh
	@echo "Stopped ctlsvc_$(SUDO_USER) and updated $@"

/etc/ssh/ssh_config: project/lnet/setup/ssh_config
	@cp $< $@; echo "Updated $@ with $<"

/etc/ssh/sshd_config: project/lnet/setup/sshd_config
	@cp $< $@
	@if [ `uname` = 'Linux' ]; then service ssh stop; service ssh start; service ssh status; \
	 else \
	  launchctl unload  /System/Library/LaunchDaemons/ssh.plist; \
	  launchctl load -w /System/Library/LaunchDaemons/ssh.plist; \
	  echo "sshd restarted"; \
	 fi
	@echo "Updated $@"

groups:
	@for group in ctl ali; do \
		if [ `uname` = 'Darwin' ]; then \
		 [ -z "`dscl . list /Groups | grep $$group`" ] && { dscl . create /Groups/$$group; \
		  echo "Group '$$group' created"; } || echo "Group '$$group' found"; \
		else \
		 echo "TODO: check groups on a Linux box"; \
		fi; done
	@echo $@ > $@

accounts:
	@for account in ctl alik alit; do project/lnet/setup/add_nosudoer.sh $$account; done
	@if [ `uname` = 'Linux' ]; then \
		echo "TODO: check accounts on a Linux box"; \
	 fi
	@for account in ctl alik alit; do \
	  su - $$account -c "[ -s Makefile ] || ln -s $(HOME)/project/lnet/setup/$$account.mk Makefile; \
	  [ -d project ] || ln -s $(HOME)/project project; \
	  [ -s pub_key.mk ] || ln -s $(HOME)/project/lnet/setup/pub_key.mk pub_key.mk; make pub_key"; \
	 done; su - $(SUDO_USER) -c "make -f project/lnet/setup/pub_key.mk pub_key"
	@echo $@ > $@

.PHONY: run

run: setup
	@su - $(SUDO_USER) -c "cd ~/project/lnet; eval `tail -n 1 /tmp/$(SUDO_USER)$(IO_SUFFIX).out`"
