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

.PHONY: install distro
	
install:
	@if [ "`id -u`" != "0" ]; then echo "Please try 'sudo -E make'"; exit 1; fi
	@which sshd || apt install openssh-server
	@git --version || apt install git
	@curl --version || apt install curl
	@node -v || { \
          curl -sL https://deb.nodesource.com/setup_8.x | bash -; \
          apt install -y nodejs; }; apt autoremove
	@[ -d project/lnet ] || { mkdir project; cd project;\
		git clone https://github.com/amissine/lnet.git; cd ../;\
		chown -R $(SUDO_USER) project; }
	@[ -f /etc/init.d/$(SUDO_USER) ] || \
		project/lnet/test/rc/05/install_ctl.sh $(SUDO_USER)
	@[ -f .ssh/id_rsa.pub ] || \
		su -c "ssh-keygen -b 4096 -t rsa -f .ssh/id_rsa" - $(SUDO_USER)
	@[ -f .ssh/id_rsa.pub.printed ] || { echo " ";\
		echo '=== Here is your SSH public key: ==============';\
		echo " "; cat .ssh/id_rsa.pub; echo " ";\
		echo '=== Please email it to support@minetats.com ===';\
		echo 'id_rsa.pub printed' > .ssh/id_rsa.pub.printed; }

distro:
	@echo "goal distro started for $(USER)"
