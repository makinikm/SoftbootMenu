const Applet = imports.ui.applet;
const PopupMenu = imports.ui.popupMenu;
const Mainloop = imports.mainloop;
const Util = imports.misc.util;
const Gio = imports.gi.Gio;
const GLib = imports.gi.GLib;

function listKernels() {
    const bootDir = Gio.File.new_for_path("/boot");
    let kernels = [];

    try {
        const enumerator = bootDir.enumerate_children('standard::name,standard::type', Gio.FileQueryInfoFlags.NONE, null);
        let info;
        while ((info = enumerator.next_file(null)) !== null) {
            const name = info.get_name();
            if (name.startsWith("vmlinuz-")) {
                kernels.push(name.replace("vmlinuz-", ""));
            }
        }
        enumerator.close(null);
    } catch (e) {
        global.logError(`[SoftBootMenu] Failed to read /boot: ${e}`);
    }

    kernels.sort().reverse();
    return kernels;
}

function watchBootDirectory(callback) {
    const bootDir = Gio.File.new_for_path("/boot");
    const monitor = bootDir.monitor_directory(Gio.FileMonitorFlags.NONE, null);
    monitor.connect('changed', () => callback());
}

class SoftBootMenuApplet extends Applet.IconApplet {
    constructor(metadata, orientation, panelHeight, instanceId) {
        super(orientation, panelHeight, instanceId);
        this.set_applet_icon_symbolic_name("system-reboot-symbolic");
        this.set_applet_tooltip("Soft-boot into installed kernels...");

        this.menuManager = new PopupMenu.PopupMenuManager(this);
        this.menu = new Applet.AppletPopupMenu(this, orientation);
        this.menuManager.addMenu(this.menu);

        this.currentKernel = "(Loading...)";
        this._populateMenu();

        // Watch for /boot changes
        watchBootDirectory(() => {
            Mainloop.idle_add(() => this._populateMenu());
        });

        // Fetch current kernel asynchronously
        this._updateCurrentKernelAsync();
    }

    _updateCurrentKernelAsync() {
        try {
            let [proc, out, err] = GLib.spawn_async_with_pipes(null, ["/bin/uname", "-r"], null, GLib.SpawnFlags.SEARCH_PATH | GLib.SpawnFlags.DO_NOT_REAP_CHILD ,null);
            const output = new Gio.DataInputStream({
                base_stream: new Gio.UnixInputStream({ fd: out, close_fd: true })
            });

            GLib.child_watch_add(GLib.PRIORITY_DEFAULT, proc, () => {
                let [line] = output.read_line_utf8(null);
                this.currentKernel = line ? line.trim() : "(unknown)";
                this._populateMenu(); // refresh once result known
                try { output.close(null); } catch (e) {}
                try { GLib.spawn_close_pid(proc); } catch (e) {}
            });
        } catch (e) {
            global.logError(`[SoftBootMenu] Failed to get current kernel: ${e}`);
            this.currentKernel = "(unknown)";
            this._populateMenu();
        }
    }

    _populateMenu() {
        this.menu.removeAll();

        const kernels = listKernels();
        const current = this.currentKernel;

        if (kernels.length === 0) {
            this.menu.addMenuItem(new PopupMenu.PopupMenuItem("(Kernels not found)", { reactive: false }));
            return;
        }

        kernels.forEach(ver => {
            const label = (ver === current) ? `${ver} (current)` : ver;
            const item = new PopupMenu.PopupMenuItem(label);

            if (ver !== current) {
                item.connect("activate", () => {
                    const cmd = `pkexec bash -c "kexec -l /boot/vmlinuz-${ver} --initrd=/boot/initrd.img-${ver} --reuse-cmdline && systemctl kexec"`;
                    Util.spawnCommandLineAsync(cmd);
                    global.log(`[SoftbootMenu] Starting kexec soft-boot: ${cmd}`);
                });
            }

            this.menu.addMenuItem(item);
        });
    }

    on_applet_clicked(event) {
        this.menu.toggle();
    }
}

function main(metadata, orientation, panelHeight, instanceId) {
    return new SoftBootMenuApplet(metadata, orientation, panelHeight, instanceId);
}
