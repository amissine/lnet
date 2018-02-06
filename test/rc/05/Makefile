INTERNAL_TARGETS = node v8 openWrt
FILE_TYPES = updated

.PHONY: all clean

all: $(INTERNAL_TARGETS)

.SECONDEXPANSION:

$(INTERNAL_TARGETS): $(addprefix $$@.,$(FILE_TYPES))

node.updated:
	git clone https://github.com/joyent/node.git
	echo $@ > $@

depot_tools.installed:
	git clone https://chromium.googlesource.com/chromium/tools/depot_tools.git

v8.updated: node.updated depot_tools.installed
	cd node/deps && rm -rf v8 && git clone https://chromium.googlesource.com/external/v8.git && cd v8 && make dependencies
	echo $@ > $@

openWrt.updated:
	echo $@ > $@

clean:
	@rm -rf node
	@rm -rf openWrt
	@rm *.updated
