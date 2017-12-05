# Cloud Trust, Ltd

Suppose you have a computer which you would like to use in a distributed application. You would need to configure the app software on that box, and reconfigure it each time it changes. The more boxes you have, and the more often the software changes, the less enthusiastic you get about configuring your boxes manually. The configuration process must be automated. It would also be nice if this process had as little as possible dependency on the software it configures. Then we could use this process for more than one distributed app. (Another blockchain solution, anybody?)

Here, I am going to describe one way of doing it in a private cloud. Let us first install [Ubuntu 16.04 LTS](http://releases.ubuntu.com/16.04/) on all our boxes. One nice thing about it is it runs on both 64-bit and 32-bit computers. Can you imagine a distributed app running nicely on a 32-bit computer? Imagine.

The next step is to choose an account name and to create this UNIX account on all our boxes. When you install Ubuntu, choose this account name to do it in one step.

The account setup on a box is completed when the SSH public and private keys are put into the chosen account’s `~/.ssh` directory and the `authorized_keys` file in that directory contains the public key. When this is done, there will be no need to type the password during the SSH login from one box to another. One way to do it is to manually configure a valid `~/.ssh` directory on one box and then to populate the contents of this directory to all our boxes.

The SSH configuration on each box will also have to be updated as described in this [README.md](https://github.com/amissine/lnet/blob/master/README.md). This concludes the initialization phase on a box. Some of the initialization steps are better done manually.

Let us assume that the software we are about to configure comes in a tarball. Each time our box restarts, it checks the timestamp of the tarball on a source computer. Then, if needed, it downloads the tarball and updates the local software. This concludes the brief description of the Cloud Trust configuration process. The entry point to further details (where the devil resides) is [here](https://github.com/amissine/lnet/blob/master/test/rc/05/ctl).
