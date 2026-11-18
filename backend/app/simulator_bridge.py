import os
import sys
import json
import subprocess
import threading
import logging
from typing import Optional, Dict, Any, List

logger = logging.getLogger("truckpulse.bridge")


class SimulatorBridge:
    """
    Subprocess bridge connecting the Python FastAPI backend to the
    C++ TruckPulse executable via standard input/output JSON streams.
    """

    def __init__(self, binary_path: Optional[str] = None):
        self.binary_path = binary_path or self._locate_binary()
        self.process: Optional[subprocess.Popen] = None
        self._lock = threading.Lock()
        logger.info(f"SimulatorBridge configured with binary: {self.binary_path}")

    def _locate_binary(self) -> str:
        candidates = [
            os.environ.get("TRUCKPULSE_BIN", ""),
            os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", "cpp", "build", "truckpulse.exe")),
            os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", "cpp", "build", "truckpulse")),
            os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", "cpp", "build", "Release", "truckpulse.exe")),
            "d:\\TruckPulse\\cpp\\build\\truckpulse.exe",
        ]
        for path in candidates:
            if path and os.path.exists(path):
                return path
        raise FileNotFoundError(
            f"Could not locate TruckPulse C++ binary. Searched: {candidates}"
        )

    def start(self) -> bool:
        with self._lock:
            if self.process and self.process.poll() is None:
                return True
            try:
                self.process = subprocess.Popen(
                    [self.binary_path, "--interactive"],
                    stdin=subprocess.PIPE,
                    stdout=subprocess.PIPE,
                    stderr=subprocess.PIPE,
                    text=True,
                    bufsize=1,
                )
                logger.info(f"Started C++ simulator process PID: {self.process.pid}")
                return True
            except Exception as e:
                logger.error(f"Failed to start C++ simulator: {e}")
                return False

    def is_alive(self) -> bool:
        return self.process is not None and self.process.poll() is None

    def send_command(self, cmd: str) -> Dict[str, Any]:
        with self._lock:
            if not self.is_alive():
                logger.warning("C++ simulator process not alive. Restarting...")
                if not self.start():
                    return {"status": "error", "message": "Simulator process unavailable"}

            try:
                assert self.process and self.process.stdin and self.process.stdout
                self.process.stdin.write(cmd.strip() + "\n")
                self.process.stdin.flush()
                line = self.process.stdout.readline()
                if not line:
                    logger.error("C++ process returned empty line on stdout")
                    return {"status": "error", "message": "Empty response from C++ simulator"}
                return json.loads(line.strip())
            except Exception as e:
                logger.error(f"Error communicating with C++ simulator: {e}")
                return {"status": "error", "message": str(e)}

    def tick(self) -> Dict[str, Any]:
        return self.send_command("TICK")

    def get_fleet(self) -> List[Dict[str, Any]]:
        res = self.send_command("FLEET")
        return res.get("vehicles", [])

    def inject_fault(self, vehicle_id: str, fault_type: str) -> Dict[str, Any]:
        return self.send_command(f"FAULT {vehicle_id} {fault_type}")

    def clear_fault(self, vehicle_id: str) -> Dict[str, Any]:
        return self.send_command(f"CLEAR {vehicle_id}")

    def stop(self):
        with self._lock:
            if self.process and self.process.poll() is None:
                try:
                    if self.process.stdin:
                        self.process.stdin.write("QUIT\n")
                        self.process.stdin.flush()
                    self.process.terminate()
                    self.process.wait(timeout=2)
                except Exception:
                    self.process.kill()
            self.process = None
            logger.info("C++ simulator process stopped.")


bridge = SimulatorBridge()
