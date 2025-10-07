# Softboot Menu Cinnamon Applet

A Cinnamon panel applet for soft-rebooting into a selected kernel using kexec and systemd.

## Features
- Tray icon opens a menu of installed kernel images
- Clicking on the menu item prompts for admin credentials before executing (pkexec)
- Execution logged (Cinnamon global log)
- Newly installed kernels are marked differently than currently-booted one (TODO)

## Requirements
- `kexec-tools`, `pkexec`
- Kernel images located in `/boot` (default)

## Installation (manually)
1. Checkout or download and unpack the contents of `SoftbootMenu@makinikm/` to `~/.local/share/cinnamon/applets/softbootmenu@makinikm/`
2. Enable the applet in Cinnamon Panel settings

## Usage
Click the tray icon to open menu, select a kernel to soft-boot, authorise to proceed...

## Disclaimer
This applet is a wrapper for kexec -l... --reuse-cmdline && systemctl kexec commands, preserving the running kernel's boot arguments (--reuse-cmdline). These commands in sequence provide a software reboot functionality - without a long hardware re-initialization during restart. (Also not to be confused with systemd soft-reboot.) These commands load a kernel image into memory (along the running kernel) and gracefully switch to it using systemd - services are stopped as for reboot, and the initialization is then handed over to the new kernel. Although kexec patches in the mainline kernel are over a decade old and systemd's kexec command is long stable, using kexec for such purposes without a hardware restart could possibly leave your system unresponsive, potentially cause data corruption or render it unbootable. Despite the rarity of such cases, not all hardware configurations and system setups or drivers support kexec reboot, especially ones using some proprietary dkms modules (e.g. Nvidia, AMD). Highly advisable to test kexec functionality manually on your system before using this Applet.

#v1.0 
A working prototype, tested on Mint Zara 22.2 (Cinnamon 6.4.8) Intel (Arc igpu) laptop, LMDE7 (Cinnamon 6.4.13) on same hardware (non-free i915 & shaders) and fully virtualized. Basic functionality - works with both Debian and Ubuntu kernels as expected so far. However, kernel discovery in 1.0 is all wrong - listing /boot directly also adds foreign kernels not installed via dpkg but present in /boot to the menu... If a kernel isn't configured for the system but executed via the menu (with kexec --reuse-cmdline) it may hang the boot (assuming some drivers re-initialization fails). TODO: refactor to dpkg for installed kernels discovery and then test for image file presence in /boot before adding to menu.
