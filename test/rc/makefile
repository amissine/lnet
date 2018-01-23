# Check if 'make' is run from your home directory and the makefile resides there.
ifneq ($(PWD),$(HOME))
  $(error Please try 'sudo -E make' from $(HOME) directory)
endif
$(if $(findstring /,$(MAKEFILE_LIST)),$(error Please only invoke this makefile from the directory it resides in))

.PHONY: install
install:
	@if [ "`id -u`" != "0" ]; then echo "Please try 'sudo -E make'"; exit 1; fi
	@echo "Checking dependencies (git and node)... \c"
	@echo "`git --version`\c"
	@echo "; node `node -v`\c"
	@echo " ...ok"
