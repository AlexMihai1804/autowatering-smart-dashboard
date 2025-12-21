#!/usr/bin/env python3
import argparse
import json
import os
import shutil
import socket
import subprocess
import sys
import threading
import time
import urllib.request
from pathlib import Path
from typing import Optional

# Try to import websocket for CDP console capture
try:
    import websocket
    HAS_WEBSOCKET = True
except ImportError:
    HAS_WEBSOCKET = False


def resolve_cmd(name: str) -> str:
    if os.name == "nt":
        cmd = f"{name}.cmd"
        if shutil.which(cmd):
            return cmd
    return name


def wait_for_port(host: str, port: int, timeout_s: float) -> bool:
    start = time.time()
    while time.time() - start < timeout_s:
        try:
            with socket.create_connection((host, port), timeout=1):
                return True
        except OSError:
            time.sleep(0.5)
    return False


def find_free_port(host: str, start_port: int, tries: int = 20) -> int:
    """Find an available TCP port on host, starting from start_port."""
    for port in range(start_port, start_port + max(1, tries)):
        with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
            s.setsockopt(socket.SOL_SOCKET, socket.SO_REUSEADDR, 1)
            try:
                s.bind((host, port))
                return port
            except OSError:
                continue
    return start_port


def stream_output(proc: subprocess.Popen, prefix: str, line_filter=None):
    if proc.stdout is None:
        return None

    def pump():
        try:
            for line in proc.stdout:
                if not line:
                    continue
                if line_filter is None or line_filter(line):
                    print(f"{prefix}{line.rstrip()}", flush=True)
        except Exception as e:
            print(f"{prefix}Error reading stream: {e}", flush=True)

    thread = threading.Thread(target=pump, daemon=True)
    thread.start()
    return thread


def read_app_id(project_root: Path) -> Optional[str]:
    config_path = project_root / "capacitor.config.json"
    if not config_path.exists():
        return None
    try:
        data = json.loads(config_path.read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError):
        return None
    return data.get("appId")


def get_app_pid(adb_cmd: str, cwd: Path, app_id: str) -> Optional[int]:
    try:
        result = subprocess.run(
            [adb_cmd, "shell", "pidof", "-s", app_id],
            cwd=cwd,
            check=False,
            capture_output=True,
            text=True,
            timeout=10,
        )
    except subprocess.TimeoutExpired:
        return None
    except OSError:
        return None

    pid_text = result.stdout.strip()
    if not pid_text:
        return None
    try:
        return int(pid_text.split()[0])
    except ValueError:
        return None


def wait_for_pid(adb_cmd: str, cwd: Path, app_id: str, timeout_s: int) -> Optional[int]:
    deadline = time.time() + timeout_s
    while time.time() < deadline:
        pid = get_app_pid(adb_cmd, cwd, app_id)
        if pid:
            return pid
        time.sleep(1)
    return None


def parse_threadtime_pid(line: str) -> Optional[int]:
    parts = line.split()
    if len(parts) < 5:
        return None
    try:
        return int(parts[2])
    except ValueError:
        return None


def is_console_line(line: str) -> bool:
    upper = line.upper()
    # Broad filter to catch all potential web/app logs
    # CAPACITOR: Standard Capacitor logs
    # CHROMIUM: WebView internal logs
    # CONSOLE: Generic console logs
    # WEBVIEW: Some devices use this
    return any(tag in upper for tag in [
        "CAPACITOR", "CHROMIUM", "CONSOLE", "WEBVIEW", "SYSTEMWEBCHROMECLIENT"
    ])


def get_cdp_websocket_url(port: int = 9222) -> Optional[str]:
    """Get the WebSocket URL for Chrome DevTools Protocol."""
    try:
        with urllib.request.urlopen(f"http://localhost:{port}/json", timeout=5) as resp:
            data = json.loads(resp.read().decode("utf-8"))
            for target in data:
                if target.get("type") == "page":
                    return target.get("webSocketDebuggerUrl")
    except Exception:
        pass
    return None


def start_cdp_console_stream(adb_cmd: str, cwd: Path, target: Optional[str]):
    """Start streaming console logs via Chrome DevTools Protocol."""
    if not HAS_WEBSOCKET:
        print("Warning: websocket-client not installed. Run: pip install websocket-client")
        return None

    # Set up port forwarding for CDP
    forward_cmd = [adb_cmd]
    if target:
        forward_cmd.extend(["-s", target])
    forward_cmd.extend(["forward", "tcp:9222", "localabstract:chrome_devtools_remote"])
    
    try:
        subprocess.run(
            forward_cmd,
            cwd=cwd,
            check=False,
            capture_output=True,
            timeout=10,
        )
    except subprocess.TimeoutExpired:
        print("Warning: adb forward timed out (CDP).", flush=True)
        return None
    except OSError:
        print("Warning: Failed to set up CDP port forwarding.")
        return None

    def cdp_pump():
        ws = None
        retry_count = 0
        max_retries = 30  # Wait up to 30 seconds for WebView to be ready
        
        while retry_count < max_retries:
            ws_url = get_cdp_websocket_url()
            if ws_url:
                break
            retry_count += 1
            time.sleep(1)
        
        if not ws_url:
            print("[cdp] Warning: Could not connect to WebView DevTools. Console logs unavailable.")
            return

        try:
            # Newer Chromium/WebView builds may reject WS connections based on Origin.
            # Best effort: suppress Origin header entirely, then try common origins.
            last_err: Optional[Exception] = None

            try:
                ws = websocket.create_connection(
                    ws_url,
                    timeout=10,
                    suppress_origin=True,
                )
                print("[cdp] Connected to WebView DevTools (no Origin)", flush=True)
            except Exception as e:
                last_err = e
                ws = None

            if ws is None:
                try:
                    ws = websocket.create_connection(
                        ws_url,
                        timeout=10,
                        origin="chrome://inspect",
                    )
                    print("[cdp] Connected to WebView DevTools (Origin chrome://inspect)", flush=True)
                except Exception as e:
                    last_err = e
                    ws = None

            if ws is None:
                try:
                    ws = websocket.create_connection(
                        ws_url,
                        timeout=10,
                        origin="http://localhost:9222",
                    )
                    print("[cdp] Connected to WebView DevTools (Origin http://localhost:9222)", flush=True)
                except Exception as e:
                    last_err = e
                    ws = None

            if ws is None:
                raise last_err if last_err is not None else RuntimeError("CDP websocket connect failed")
            
            # Enable Runtime to receive console messages
            ws.send(json.dumps({"id": 1, "method": "Runtime.enable"}))
            # Also enable Log domain for additional messages
            ws.send(json.dumps({"id": 2, "method": "Log.enable"}))
            
            while True:
                try:
                    msg = ws.recv()
                    if not msg:
                        continue
                    data = json.loads(msg)
                    method = data.get("method", "")
                    
                    if method == "Runtime.consoleAPICalled":
                        params = data.get("params", {})
                        log_type = params.get("type", "log")
                        args = params.get("args", [])
                        
                        # Format the log message
                        parts = []
                        for arg in args:
                            val = arg.get("value")
                            if val is not None:
                                parts.append(str(val))
                            elif arg.get("type") == "object":
                                desc = arg.get("description", arg.get("className", "[object]"))
                                parts.append(desc)
                            elif arg.get("type") == "undefined":
                                parts.append("undefined")
                            else:
                                parts.append(str(arg))
                        
                        message = " ".join(parts)
                        prefix = f"[console.{log_type}]"
                        print(f"{prefix} {message}", flush=True)
                    
                    elif method == "Log.entryAdded":
                        params = data.get("params", {})
                        entry = params.get("entry", {})
                        level = entry.get("level", "info")
                        text = entry.get("text", "")
                        print(f"[log.{level}] {text}", flush=True)
                        
                except websocket.WebSocketTimeoutException:
                    continue
                except Exception as e:
                    print(f"[cdp] Error: {e}", flush=True)
                    break
        except Exception as e:
            print(f"[cdp] Connection error: {e}", flush=True)
        finally:
            if ws:
                try:
                    ws.close()
                except Exception:
                    pass

    thread = threading.Thread(target=cdp_pump, daemon=True)
    thread.start()
    return thread


def list_adb_devices(adb_cmd: str, cwd: Path):
    try:
        result = subprocess.run(
            [adb_cmd, "devices"],
            cwd=cwd,
            check=False,
            capture_output=True,
            text=True,
            timeout=10,
        )
    except subprocess.TimeoutExpired:
        print(
            "Warning: `adb devices` timed out. Device detection disabled. "
            "Unlock the phone and accept USB debugging prompt, or pass --target.",
            flush=True,
        )
        return []
    except OSError:
        return []

    devices = []
    for line in result.stdout.splitlines():
        line = line.strip()
        if not line or line.startswith("List of devices"):
            continue
        parts = line.split()
        if len(parts) < 2:
            continue
        serial, state = parts[0], parts[1]
        if state != "device":
            continue
        is_emulator = serial.startswith("emulator-")
        devices.append((serial, is_emulator))
    return devices


def choose_target(adb_cmd: str, cwd: Path):
    devices = list_adb_devices(adb_cmd, cwd)
    if not devices:
        return None
    if len(devices) == 1:
        return devices[0][0]

    for serial, is_emulator in devices:
        if not is_emulator:
            return serial
    return devices[0][0]


def start_logcat(
    adb_cmd: str,
    cwd: Path,
    target: Optional[str],
    tags: Optional[str],
    all_logs: bool,
):
    if not shutil.which(adb_cmd):
        print("Warning: adb not found in PATH. Logcat disabled.")
        return None

    cmd = [adb_cmd]
    if target:
        cmd.extend(["-s", target])
    cmd.append("logcat")
    cmd.extend(["-v", "threadtime"])
    if not all_logs and tags:
        cmd.append("-s")
        cmd.extend(tags.split())

    try:
        return subprocess.Popen(
            cmd,
            cwd=cwd,
            stdout=subprocess.PIPE,
            stderr=subprocess.STDOUT,
            text=True,
            bufsize=1,
            encoding="utf-8",
            errors="replace",
        )
    except OSError:
        print("Warning: failed to start adb logcat.")
        return None


def run():
    parser = argparse.ArgumentParser(
        description="Run Android live reload with Capacitor and Vite."
    )
    parser.add_argument(
        "--mode",
        choices=["usb", "wifi"],
        default="usb",
        help="Connection mode. Use usb for adb reverse, wifi for LAN access.",
    )
    parser.add_argument(
        "--host",
        help="PC IPv4 for wifi mode (example: 192.168.1.50).",
    )
    parser.add_argument(
        "--port",
        type=int,
        default=5173,
        help="Vite dev server port.",
    )
    parser.add_argument(
        "--target",
        help="Android device ID from `adb devices`.",
    )
    parser.add_argument(
        "--app-id",
        help="Android applicationId (default: capacitor.config.json appId).",
    )
    parser.add_argument(
        "--no-logcat",
        dest="logcat",
        action="store_false",
        help="Disable adb logcat streaming.",
    )
    parser.add_argument(
        "--logcat-mode",
        choices=["console", "app", "all"],
        default="console",
        help="Logcat view: console (JS logs), app (only app pid), or all.",
    )
    parser.add_argument(
        "--logcat-tags",
        default=None,
        help="Space-separated logcat tags to include (optional).",
    )
    parser.add_argument(
        "--logcat-all",
        action="store_true",
        default=None,
        help="Show all logcat output (overrides console/app filtering).",
    )
    parser.add_argument(
        "--devtools",
        action="store_true",
        help="Set up Chrome DevTools remote debugging (open chrome://inspect).",
    )
    parser.set_defaults(logcat=True)
    args = parser.parse_args()

    if args.mode == "wifi" and not args.host:
        print("Error: --host is required for wifi mode.")
        return 2

    # Ensure Vite + Capacitor use the same port.
    # Vite can auto-bump ports when busy; that breaks live reload if Capacitor still points to the old port.
    chosen_port = find_free_port("127.0.0.1", args.port, tries=20)
    if chosen_port != args.port:
        print(f"Port {args.port} is busy; using {chosen_port} instead.", flush=True)

    project_root = Path(__file__).resolve().parents[1]
    npm_cmd = resolve_cmd("npm")
    npx_cmd = resolve_cmd("npx")
    adb_cmd = resolve_cmd("adb")

    if not shutil.which(npm_cmd):
        print("Error: npm not found in PATH.")
        return 2
    if not shutil.which(npx_cmd):
        print("Error: npx not found in PATH.")
        return 2

    adb_available = shutil.which(adb_cmd) is not None
    auto_target = None
    if adb_available:
        auto_target = choose_target(adb_cmd, project_root)
        if auto_target:
            print(f"Using device: {auto_target}")
        else:
            print("Warning: No ready Android devices found.")
    else:
        print("Warning: adb not found in PATH. Device detection may fail.")

    # Setup Chrome DevTools port forwarding for remote debugging (opt-in)
    if adb_available and args.devtools:
        try:
            # Forward Chrome DevTools debugging port
            subprocess.run(
                [adb_cmd, "forward", "tcp:9222", "localabstract:chrome_devtools_remote"],
                cwd=project_root,
                check=False,
                capture_output=True,
            )
        except OSError:
            pass

    target = args.target or auto_target
    app_id = args.app_id or read_app_id(project_root)
    logcat_mode = "all" if args.logcat_all else args.logcat_mode
    logcat_all = logcat_mode == "all"

    print("Starting Vite dev server...", flush=True)
    dev_cmd = [
        npm_cmd,
        "run",
        "dev",
        "--",
        "--host",
        "0.0.0.0",
        "--strictPort",
        "--port",
        str(chosen_port),
    ]
    dev_proc = subprocess.Popen(
        dev_cmd,
        cwd=project_root,
        stdout=subprocess.PIPE,
        stderr=subprocess.STDOUT,
        text=True,
        bufsize=1,
    )
    stream_output(dev_proc, "[dev] ")
    logcat_proc = None
    app_pid_holder = None

    try:
        print(f"Waiting for Vite on 127.0.0.1:{chosen_port}...", flush=True)
        ready = wait_for_port("127.0.0.1", chosen_port, timeout_s=30)
        if not ready:
            print("Warning: dev server not ready yet, continuing anyway.")

        if args.logcat:
            if logcat_mode == "app" and not app_id:
                print("Warning: appId not found; showing all logs.", flush=True)
                logcat_mode = "all"
                logcat_all = True

            app_pid_holder = {"pid": None}
            
            # Clear logcat buffer to avoid showing old logs
            try:
                subprocess.run([adb_cmd, "logcat", "-c"], cwd=project_root, check=False)
            except OSError:
                pass

            print("Starting adb logcat...", flush=True)
            logcat_proc = start_logcat(
                adb_cmd=adb_cmd,
                cwd=project_root,
                target=target,
                tags=args.logcat_tags,
                all_logs=logcat_all,
            )
            if logcat_proc:
                if logcat_mode == "all":
                    stream_output(logcat_proc, "[logcat] ")
                elif logcat_mode == "app":
                    stream_output(
                        logcat_proc,
                        "[logcat] ",
                        lambda line: app_pid_holder["pid"] is None
                        or parse_threadtime_pid(line) == app_pid_holder["pid"],
                    )
                else:
                    # For console mode, we do NOT filter by PID because WebView renderers
                    # often run in separate processes (sandboxed) that have different PIDs
                    # than the main app process. Filtering by main app PID would hide
                    # the web console logs we want to see.
                    stream_output(
                        logcat_proc,
                        "[logcat] ",
                        lambda line: is_console_line(line),
                    )

        cap_host = args.host if args.mode == "wifi" else "localhost"
        cap_cmd = [
            npx_cmd,
            "cap",
            "run",
            "android",
            "-l",
            "--host",
            cap_host,
            "--port",
            str(chosen_port),
        ]
        if args.mode == "usb":
            cap_cmd.extend(["--forwardPorts", f"{chosen_port}:{chosen_port}"])
        if target:
            cap_cmd.extend(["--target", target])

        print("Starting Capacitor run...", flush=True)
        cap_proc = subprocess.Popen(
            cap_cmd,
            cwd=project_root,
            stdout=subprocess.PIPE,
            stderr=subprocess.STDOUT,
            text=True,
            bufsize=1,
        )
        stream_output(cap_proc, "[cap] ")

        if args.logcat:
            # Only app-mode needs the PID filter. Console-mode should never block here.
            if (
                logcat_mode == "app"
                and app_id
                and adb_available
                and app_pid_holder is not None
            ):
                print("Waiting for app process for logcat (app mode)...", flush=True)
                try:
                    app_pid_holder["pid"] = wait_for_pid(
                        adb_cmd, project_root, app_id, timeout_s=60
                    )
                except KeyboardInterrupt:
                    # Some terminals can send a spurious interrupt; don't kill the wrapper.
                    app_pid_holder["pid"] = None
                if app_pid_holder["pid"]:
                    print(f"App PID: {app_pid_holder['pid']}", flush=True)
                else:
                    print("Warning: app pid not found; logcat may be noisy.", flush=True)

        # CDP console capture is opt-in (use --devtools). Default is to rely on the
        # Vite /__console forwarder for terminal logs.
        cdp_thread = None
        if adb_available and args.devtools:
            print("Starting Chrome DevTools Protocol console capture...", flush=True)
            cdp_thread = start_cdp_console_stream(adb_cmd, project_root, target)

        print(
            "Live reload running. Logs will appear here (Ctrl+C to stop).",
            flush=True,
        )
        try:
            while True:
                # Some Capacitor versions/flags return immediately even though the app
                # is deployed and live reload keeps working. Don't exit the wrapper
                # process just because `cap run` ended.
                if cap_proc is not None and cap_proc.poll() is not None:
                    print(
                        f"[cap] process exited with code {cap_proc.returncode}; keeping wrapper alive.",
                        flush=True,
                    )
                    cap_proc = None

                # On Windows, `npm` can sometimes exit while leaving the underlying
                # dev server process running. Never auto-exit the wrapper.
                if dev_proc is not None and dev_proc.poll() is not None:
                    print(
                        f"[dev] process exited with code {dev_proc.returncode}; keeping wrapper alive.",
                        flush=True,
                    )
                    dev_proc = None
                time.sleep(0.5)
        except KeyboardInterrupt:
            return 0
    finally:
        if logcat_proc and logcat_proc.poll() is None:
            logcat_proc.terminate()
            try:
                logcat_proc.wait(timeout=5)
            except subprocess.TimeoutExpired:
                logcat_proc.kill()
        if dev_proc is not None:
            dev_proc.terminate()
            try:
                dev_proc.wait(timeout=10)
            except subprocess.TimeoutExpired:
                dev_proc.kill()


if __name__ == "__main__":
    sys.exit(run())
