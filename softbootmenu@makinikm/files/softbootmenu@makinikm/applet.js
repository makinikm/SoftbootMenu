const Applet = imports.ui.applet;
const PopupMenu = imports.ui.popupMenu;
const Mainloop = imports.mainloop;
const Util = imports.misc.util;
const Gio = imports.gi.Gio;
const GLib = imports.gi.GLib;
const Gettext = imports.gettext;

// l10n/translation support
const UUID = "softbootmenu@makinikm";
Gettext.bindtextdomain(UUID, GLib.get_home_dir() + "/.local/share/locale");

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

/* Return a monitor object so caller can keep a reference.
 * callback is called when a relevant file event happens in /boot.
 */
function watchBootDirectory(callback) {
    const bootDir = Gio.File.new_for_path("/boot");
    let monitor;
    let debounceId = null;  // store the timer ID

    try {
        monitor = bootDir.monitor_directory(Gio.FileMonitorFlags.NONE, null);

        monitor.connect('changed', (mon, file, other, event) => {
            // Filter only relevant file events
            if (event === Gio.FileMonitorEvent.CREATED ||
                event === Gio.FileMonitorEvent.DELETED ||
                event === Gio.FileMonitorEvent.MOVED ||
                event === Gio.FileMonitorEvent.CHANGED) {

                // cancel any pending refresh timer
                if (debounceId !== null) {
                    Mainloop.source_remove(debounceId);
                    debounceId = null;
                }

                // schedule refresh after 1 second of quiet
                debounceId = Mainloop.timeout_add_seconds(1, () => {
                    debounceId = null;
                    try {
                        callback();
                    } catch (e) {
                        global.logError(`[SoftBootMenu] Error in boot-dir callback: ${e}`);
                    }
                    return false; // don't repeat
                });
            }
        });
    } catch (e) {
        global.logError(`[SoftBootMenu] Failed to create /boot monitor: ${e}`);
    }

    return monitor;
}

class SoftBootMenuApplet extends Applet.IconApplet {
    constructor(metadata, orientation, panelHeight, instanceId) {
        super(orientation, panelHeight, instanceId);
        this.set_applet_icon_symbolic_name("system-reboot-symbolic");
        this.set_applet_tooltip("Soft-reboot installed kernel (kexec)...");

        this.menuManager = new PopupMenu.PopupMenuManager(this);
        this.menu = new Applet.AppletPopupMenu(this, orientation);
        this.menuManager.addMenu(this.menu);

        this.currentKernel = "(Loading...)";
        this._populateMenu();

        // Keep a reference to the monitor on the instance so it's not GC'd
        this._bootMonitor = watchBootDirectory(() => this._populateMenu());

        // Fetch current kernel asynchronously (non-blocking)
        this._updateCurrentKernelAsync();
    }

    _updateCurrentKernelAsync() {
        try {
            // Properly parse argv into an array
            let [ok, argv] = GLib.shell_parse_argv("uname -r");
            if (!ok) throw new Error("Failed to parse uname argv");

            // Spawn async with pipes
            let [success, pid, stdinFd, stdoutFd, stderrFd] =
                GLib.spawn_async_with_pipes(
                    null,
                    argv,
                    null,
                    GLib.SpawnFlags.SEARCH_PATH | GLib.SpawnFlags.DO_NOT_REAP_CHILD,
                    null
                );

            if (!success) throw new Error("Failed to spawn uname");

            const stdoutStream = new Gio.DataInputStream({
                base_stream: new Gio.UnixInputStream({ fd: stdoutFd, close_fd: true })
            });

            GLib.child_watch_add(GLib.PRIORITY_DEFAULT, pid, () => {
                try {
                    let [line] = stdoutStream.read_line_utf8(null);
                    this.currentKernel = line ? line.trim() : "(unknown)";
                } catch (e) {
                    global.logError(`[SoftBootMenu] Error reading uname output: ${e}`);
                    this.currentKernel = "(unknown)";
                } finally {
                    try { stdoutStream.close(null); } catch (e) {}
                    try { GLib.spawn_close_pid(pid); } catch (e) {}
                    this._populateMenu(); // refresh menu now we know current kernel
                }
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

    /* clean up when the applet is removed from the panel */
    on_applet_removed_from_panel() {
        try {
            if (this._bootMonitor && typeof this._bootMonitor.cancel === 'function') {
                this._bootMonitor.cancel();
                this._bootMonitor = null;
            }
        } catch (e) {
            global.logError(`[SoftBootMenu] Error canceling boot monitor: ${e}`);
        }
    }
}

function main(metadata, orientation, panelHeight, instanceId) {
    return new SoftBootMenuApplet(metadata, orientation, panelHeight, instanceId);
}
