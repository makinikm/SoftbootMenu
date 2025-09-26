# Softboot Menu Cinnamon Applet

A Cinnamon panel applet for soft-rebooting into a selected kernel using kexec.

## Features
- Tray icon opens a menu of available kernel images.
- Select image to softboot; prompts for admin credentials.
- Outputs command result in GTK message window.
- Newly installed kernel is marked as default.
- Themed for Cinnamon environment.

## Requirements
- Cinnamon Desktop
- `kexec-tools`, `systemd`, `pkexec`
- Kernel images in `/boot`

## Installation
1. Copy `SoftbootMenu@makinikm/` to `~/.local/share/cinnamon/applets/`
2. Enable applet in Cinnamon panel settings.

## Usage
- Click the tray icon to open menu.
- Select a kernel to softboot.

## Security
- Uses `pkexec` for admin privileges.