#!/usr/bin/env python3
import sys
import subprocess

if __name__ == "__main__":
    cmd = " ".join(sys.argv[1:])
    # Run elevated if needed
    try:
        proc = subprocess.Popen(cmd, shell=True, stdout=subprocess.PIPE, stderr=subprocess.STDOUT)
        for line in iter(proc.stdout.readline, b''):
            print(line.decode(), end="")
        proc.stdout.close()
        proc.wait()
    except Exception as e:
        print(f"Error: {e}", file=sys.stderr)