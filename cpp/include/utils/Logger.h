#pragma once
/**
 * Logger.h
 * A lightweight logger for TruckPulse.
 *
 * Supports INFO, WARNING, and ERROR levels. Each message is prefixed
 * with a wall-clock timestamp so that log entries are ordered and
 * traceable during a simulation run.
 *
 * Thread-safety note:
 *   On compilers that support std::mutex (POSIX-thread MinGW, MSVC,
 *   GCC/Clang on Linux/macOS) a real mutex is used.  On win32-thread
 *   MinGW builds where std::mutex is unavailable, locking is a no-op —
 *   Phase 1 is single-threaded so this is safe.  Phase 2 will require
 *   a POSIX-thread or MSVC toolchain.
 *
 * Design note: the logger is a plain class rather than a singleton so
 * callers can inject it, test it, or suppress it in unit tests.
 */

#include <iostream>
#include <string>
#include <ctime>
#include <cstring>
#include <sstream>

// Guard: std::mutex and lock_guard require POSIX threading on MinGW.
// _GLIBCXX_HAS_GTHREADS is defined by GCC's libstdc++ when POSIX
// threading is available.
#if defined(_GLIBCXX_HAS_GTHREADS) || (!defined(__MINGW32__) && !defined(__MINGW64__))
    #include <mutex>
    #define TP_HAS_MUTEX 1
#else
    #define TP_HAS_MUTEX 0
#endif

namespace TruckPulse {

enum class LogLevel {
    INFO,
    WARNING,
    ERR   // ERROR is a Windows macro; use ERR internally
};

class Logger {
public:
    explicit Logger(std::ostream& out = std::cout) : m_out(out) {}

    void info(const std::string& msg)    { log(LogLevel::INFO,    msg); }
    void warning(const std::string& msg) { log(LogLevel::WARNING, msg); }
    void error(const std::string& msg)   { log(LogLevel::ERR,     msg); }

private:
    std::ostream& m_out;
#if TP_HAS_MUTEX
    std::mutex    m_mutex;
#endif

    void log(LogLevel level, const std::string& msg) {
#if TP_HAS_MUTEX
        std::lock_guard<std::mutex> lock(m_mutex);
#endif
        m_out << "[" << timestamp() << "] "
              << levelTag(level) << " " << msg << "\n";
    }

    static std::string levelTag(LogLevel lvl) {
        switch (lvl) {
            case LogLevel::INFO:    return "[INFO   ]";
            case LogLevel::WARNING: return "[WARNING]";
            case LogLevel::ERR:     return "[ERROR  ]";
        }
        return "[UNKNOWN]";
    }

    // Returns wall-clock time formatted as "YYYY-MM-DD HH:MM:SS"
    static std::string timestamp() {
        std::time_t t = std::time(nullptr);
        // std::localtime is used as a portable fallback.  The result is
        // consumed immediately and protected by the mutex above in
        // multi-threaded builds, so the static-buffer race is not an issue.
        std::tm* ptm = std::localtime(&t);
        char buf[20] = "0000-00-00 00:00:00";
        if (ptm) {
            std::strftime(buf, sizeof(buf), "%Y-%m-%d %H:%M:%S", ptm);
        }
        return std::string(buf);
    }
};

} // namespace TruckPulse
