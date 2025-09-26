const Applet = imports.ui.applet;
const PopupMenu = imports.ui.popupMenu;
const St = imports.gi.St;
const Gio = imports.gi.Gio;
const GLib = imports.gi.GLib;
const Main = imports.ui.main;
const Util = imports.misc.util;

const ICON_PATH = imports.ui.appletManager.appletMeta['softboot@makinikm'].path + '/icons/icon.png';

class SoftbootApplet extends Applet.TextIconApplet {
    constructor(metadata, orientation, panel_height, instance_id) {
        super(orientation, panel_height, instance_id);

        this.set_applet_icon_path(ICON_PATH);
        this.set_applet_tooltip(_("Softboot Menu"));

        this.menuManager = new PopupMenu.PopupMenuManager(this);
        this.menu = new PopupMenu.PopupMenu(this.actor, 0.0, St.Side.TOP);
        this.menuManager.addMenu(this.menu);

        this._populateMenu();
    }

    // Find installed kernel images
    _getKernelImages() {
        let kernels = [];
        try {
            let [ok, out, err, exit] = GLib.spawn_command_line_sync("ls /boot/vmlinuz-*"
);
            if (ok && out) {
                let files = out.toString().trim().split('\n');
                for (let file of files) {
                    let name = file.split('/').pop();
                    if (name.startsWith('vmlinuz-')) {
                        kernels.push({
                            path: file,
                            name: name,
                            version: name.replace('vmlinuz-', ''),
                            isNew: false // placeholder, will mark new later
                        });
                    }
                }
            }
        } catch (e) {
            global.logError("Softboot: Unable to list kernels: " + e);
        }
        return kernels;
    }

    // Populate menu with kernel images
    _populateMenu() {
        this.menu.removeAll();

        let kernels = this._getKernelImages();
        // TODO: Mark new kernel (e.g. compare with last booted kernel)
        for (let kernel of kernels) {
            let menuItem = new PopupMenu.PopupMenuItem(kernel.name);
            menuItem.connect('activate', () => {
                this._promptSoftboot(kernel);
            });
            this.menu.addMenuItem(menuItem);
        }
        if (kernels.length === 0) {
            this.menu.addMenuItem(new PopupMenu.PopupMenuItem(_("No kernel images found."), {reactive: false}));
        }
    }

    // Prompt for password and run softboot command
    _promptSoftboot(kernel) {
        let initrd = `/boot/initrd.img-${kernel.version}`;
        let cmd = `pkexec bash -c \"kexec -l ${kernel.path} --initrd=${initrd} --reuse-cmdline && systemctl kexec\"`;

        // Show a GTK dialog and run command (see mintinstall/mintupdate for reference)
        Util.spawnCommandLine(cmd);
        // TODO: capture output and show in a message window
    }

    on_applet_clicked(event) {
        this.menu.toggle();
    }
}

function main(metadata, orientation, panel_height, instance_id) {
    return new SoftbootApplet(metadata, orientation, panel_height, instance_id);
}