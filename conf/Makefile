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
# This makefile initializes your box to become part of Cloud Trust Ltd.
#
# See also:
#   https://docs.google.com/document/d/1JPzTa7IXEQL0NZLoO5leCNj40e7yy1dFNMiqTtBNH2o/
#   https://www.gnu.org/software/make/manual/html_node/index.html

# Check if 'make' is run from your home directory and the makefile resides there.
ifneq ($(PWD),$(HOME))
  $(error Please try 'sudo -E make' from $(HOME) directory)
endif
$(if $(findstring /,$(MAKEFILE_LIST)),$(error Please only invoke this makefile from the directory it resides in))
# Run all shell commands with bash.
SHELL := bash

.PHONY: install

install: check_deps lnet distros ctlsvc
	@rm $^

check_deps: check_if_root check_node check_git
	@rm $^

check_if_root:
	@if [ "`id -u`" != "0" ]; then echo " "; echo "=== Please try 'sudo -E make' ==="; echo " "; exit 1; fi
	@which sshd; if [ $$? != '0' ]; then \
		[[ `uname` == 'Darwin' ]] && { echo "Please install openssh-server"; exit 1; } \
		|| apt install openssh-server; fi
	@echo $@ > $@

box_distro: /etc/ssh/ssh_config /etc/ssh/sshd_config /etc/init.d/$(SUDO_USER) .ssh/id_rsa.pub
	@echo $@ > $@

/etc/ssh/ssh_config: distro/service/ssh_config
	@cp distro/service/ssh_config /etc/ssh

/etc/ssh/sshd_config: distro/service/sshd_config
	@cp distro/service/sshd_config /etc/ssh
	@service ssh stop; service ssh start; service ssh status

/etc/init.d/$(SUDO_USER): distro/service/ctl
	@cp distro/service/ctl /etc/init.d/$(SUDO_USER)
	@update-rc.d $(SUDO_USER) defaults
	@service $(SUDO_USER) start; service $(SUDO_USER) status

.ssh/id_rsa.pub:
	@su -c "ssh-keygen -b 4096 -t rsa -f .ssh/id_rsa" - $(SUDO_USER)
	@echo " "; echo '=== Please email your .ssh/id_rsa.pub to support@minetats.com ==='

check_node:
	@curl --version || apt install curl
	@node -v || { \
          curl -sL https://deb.nodesource.com/setup_8.x | bash -; \
          apt install -y nodejs; }
	@echo $@ > $@

check_git:
	@git --version || apt install git; apt autoremove
	@[ -d project/lnet ] || { mkdir project; cd project;\
		git clone https://github.com/amissine/lnet.git; cd ../;\
		chown -R $(SUDO_USER) project; }
	@echo $@ > $@

distros:
	@cd ../; for NAME in *; do su -c "echo $$NAME; make distro" - $$NAME; done; cd $(SUDO_USER)
	@echo $@ > $@

distro: distro.tar.gz
	@echo "- configuring new distro for $(USER)"
	@rm -rf distro 2>/dev/null
	@tar -xzvf distro.tar.gz
	@cd distro; bak=''; [ `uname` = "Darwin" ] && bak="''";\
		sed -i $$bak "s/@CTLNAME@/$$USER/" service/ctl ctl/ctlService.sh

distro.tar.gz: project/lnet/test/rc/05/distro/ctl project/lnet/test/rc/05/distro/service
	@echo "- creating distro.tar.gz for $(USER)"
	@cd $</../..; tar -czvf distro.tar.gz distro; mv distro.tar.gz ~/
