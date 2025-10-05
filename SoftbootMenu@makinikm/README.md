# Softboot Menu Cinnamon Applet

A Cinnamon panel applet for soft-rebooting into a selected kernel image using kexec.

## Features
- Tray icon opens a menu of installed kernel images
- Selecting the image prompts for admin credentials before executing (pkexec)
- Execution logged
- Newly installed kernel is marked as default (TODO)

## Requirements
- `kexec-tools`, `systemd`, `pkexec`
- Kernel images in `/boot`

## Installation (manually)
1. Checkout or copy the contents of `SoftbootMenu@makinikm/` to `~/.local/share/cinnamon/applets/softbootmenu@makinikm/`
2. Enable the applet in Cinnamon panel settings

## Usage
Click the tray icon to open menu, select a kernel to softboot, authorise

## Disclaimer
The applet is a wrapper for 'kexec-tools' and 'systemctl kexec' commands, preserving the running kernel's boot arguments (--reuse-cmdline). Using kexec for soft-booting a kernel could possibly leave your system unresponsive, potentially cause data corruption or render it unbootable. Not all hardware configurations and drivers support kexec boot, especially ones using some proprietary dkms modules (e.g. Nvidia, AMD). Highly advisable to test kexec functionality manually on your system before using this Applet.
