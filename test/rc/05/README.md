# Cloud Trust, Ltd

Suppose you have a computer which you would like to use in a distributed application. You would need to configure the app software on that box, and reconfigure it each time it changes. The more boxes you have, and the more often the software changes, the less enthusiastic you get about configuring your boxes manually. The configuration process must be automated. It would also be nice if this process had as little as possible dependency on the software it configures. Then we could use this process for more than one distributed app. (Another blockchain solution, anybody?)

Here, I am going to describe one way of doing it in a private cloud. Let us first install [Ubuntu 16.04 LTS](http://releases.ubuntu.com/16.04/) on all our boxes. One nice thing about it is it runs on both 64-bit and 32-bit computers. Can you imagine a distributed app running nicely on a 32-bit computer? Imagine.

The next step is to choose an account name and to create this UNIX account on all our boxes. When you install Ubuntu, choose this account name to do it in one step. From this point on, let us assume the account name is `ctl`.

The account setup on a box is completed when the SSH public and private keys are put into the chosen account’s `~/.ssh` directory and the `authorized_keys` file in that directory contains the public key. When this is done, there will be no need to type the password during the SSH login from one box to another. One way to do it is to manually configure a valid `~/.ssh` directory on one box and then to populate the contents of this directory to all our boxes, something like this:

    sudo apt install openssh-server
    scp -r 10.0.0.6:/home/alec/.ssh .
    rm .ssh/known_hosts

The SSH configuration on each box will also have to be updated as described in this [README.md](https://github.com/amissine/lnet/blob/master/README.md) file. Use `distro/service/ssh_config` and `distro/service/sshd_config` if your box requires no other changes. If this is the case, no action is required since these files are already part of the distro tarball that will be automatically copied from the source box to the target box. Also, make sure you copied the `distro/ctl/ctl_admins` file to `/etc/sudoers.d` on the target box - this needs to be done manually. When using Oracle VirtualBox, do _Settings -> Network: Bridged Adapter_. This concludes the manual initialization phase of the target box.

Let us assume that the software we are about to configure comes in a tarball. Each time the target box restarts, the `ctl` configuration service starts listening for a new tarball arrival from the source box. If the latest tarball is older than the one that has just arrived, the service updates the local software. This concludes the brief description of the Cloud Trust configuration process. The entry point to further details (where the devil resides) is [here](https://github.com/amissine/lnet/blob/master/test/rc/05/distro/service/ctl).

## Discussion

One way to implement our configuration process is to run a service that gets notified when a new tarball is being copied to our box. And it is quite tempting to make the service itself configurable in the same manner. But configuring and restarting the service requires `sudo` access to the box. This means all the participants of the private cloud must trust each other with their boxes. Presently, any `ctl` user can easily disrupt the cloud severely. It is very probable then that any cloud supporting our configuration process will alvays remain very private. While it may be OK for the time being, this restriction must be stated explicitly and understood thoroughly:

**All the participants of our private cloud must trust each other with their boxes.**

Configuring a public cloud may require a totally different implementation.
