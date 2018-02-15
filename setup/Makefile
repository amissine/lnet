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
# It also configures the CTL accounts on your box: ctl, alik, and alit - if any of 
# these already exists, it will first be deleted completely and all its data will
# be lost.
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

setup: ctlsvc ssh
	@rm $^

ctlsvc: ctlsvc_distro/ctlsvc.sh
	@if [ `uname` = 'Linux' ]; then svc="ctlsvc_$(SUDO_USER)"; [ -x /etc/init.d/$$svc ] || { \
		cp project/lnet/setup/ctlsvc /etc/init.d/$$svc; \
	  cd /etc/init.d; sed -i "s/@CTLSVC_ACCOUNT@/$(SUDO_USER)/" $$svc; \
		update-rc.d $$svc defaults; service $$svc start; }; service $$svc status; \
	 else \
	  rm $<.todelete 2>/dev/null; count="`ps -ef | grep 'ctlsvc.sh' | wc -l`"; \
	  [ "$$count" = "       4" ] && echo "$< is running" || { $<; echo "Started $<"; }; \
	 fi
	@echo $@ > $@

ctlsvc_distro/ctlsvc.sh: project/lnet/bin/ctlsvc.sh
	@mkdir ctlsvc_distro 2>/dev/null; cp $< $@
	@cd ctlsvc_distro; bak=''; [ `uname` = "Darwin" ] && bak=".todelete";\
		sed -i $$bak "s/@CTLSVC_ACCOUNT@/$(SUDO_USER)/" ctlsvc.sh
	@svc="ctlsvc_$(SUDO_USER)"; if [ `uname` = 'Linux' ]; then service $$svc stop; \
	 else pipe="/tmp/$$svc"; [ -w $$pipe ] && echo "exit" >> $$pipe; fi
	@echo "Updated $@ and stopped ctlsvc_$(SUDO_USER)"


ssh: /etc/ssh/ssh_config /etc/ssh/sshd_config .ssh/id_rsa.pub
	@echo " "; echo '=== Please email your ~/.ssh/id_rsa.pub to support@minetats.com ==='
	@echo " "; echo $@ > $@

/etc/ssh/ssh_config: project/lnet/setup/ssh_config
	@cp project/lnet/setup/ssh_config /etc/ssh
	@echo "Updated $@"

/etc/ssh/sshd_config: project/lnet/setup/sshd_config
	@cp project/lnet/setup/sshd_config /etc/ssh
	@if [ `uname` = 'Linux' ]; then service ssh stop; service ssh start; service ssh status; \
	 else \
	  launchctl unload  /System/Library/LaunchDaemons/ssh.plist; \
	  launchctl load -w /System/Library/LaunchDaemons/ssh.plist; \
	  echo "sshd restarted";
	 fi
	@echo "Updated $@"

.ssh/id_rsa.pub:
	@su -c "ssh-keygen -b 4096 -t rsa -f .ssh/id_rsa" - $(SUDO_USER)
	@echo "Generated new key pair"
