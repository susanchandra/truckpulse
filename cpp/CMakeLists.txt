cmake_minimum_required(VERSION 3.16)
project(TruckPulse VERSION 1.0.0 LANGUAGES CXX)

# ── C++ standard ───────────────────────────────────────────────────────────────
set(CMAKE_CXX_STANDARD 17)
set(CMAKE_CXX_STANDARD_REQUIRED ON)
set(CMAKE_CXX_EXTENSIONS OFF)   # stick to ISO C++17, no GNU extensions

# ── Compiler warnings ──────────────────────────────────────────────────────────
if(MSVC)
    add_compile_options(/W4 /WX)
else()
    add_compile_options(-Wall -Wextra -Wpedantic -Werror)
endif()

# ── Include paths shared by all targets ───────────────────────────────────────
set(TRUCKPULSE_INCLUDE_DIR "${CMAKE_CURRENT_SOURCE_DIR}/include")

# ── Source files (header-only design — all logic is in .h files) ──────────────
# main.cpp is the only .cpp that needs compiling for the main app.
# Tests compile from tests/tests.cpp.
# This keeps the build simple and avoids .cpp stub files for header-only classes.

# ── Main executable ───────────────────────────────────────────────────────────
add_executable(truckpulse
    src/main.cpp
)

target_include_directories(truckpulse PRIVATE ${TRUCKPULSE_INCLUDE_DIR})

# Windows: link against ws2_32 if ever needed in later phases; not required now.
# MinGW win32-thread model: std::mutex is unavailable but no -lpthread needed.
# MinGW posix-thread model / POSIX systems: link pthread.
if(MINGW)
    target_link_options(truckpulse PRIVATE -static-libgcc -static-libstdc++)
    # Only link pthreads if the posix-thread MinGW is detected
    if(CMAKE_CXX_COMPILER_ID STREQUAL "GNU")
        execute_process(COMMAND ${CMAKE_CXX_COMPILER} -v
            ERROR_VARIABLE _gcc_version_info)
        if(_gcc_version_info MATCHES "posix")
            target_link_libraries(truckpulse PRIVATE -lpthread)
        endif()
    endif()
elseif(UNIX)
    target_link_libraries(truckpulse PRIVATE pthread)
endif()

# ── Test executable ───────────────────────────────────────────────────────────
enable_testing()

add_executable(truckpulse_tests
    tests/tests.cpp
)

target_include_directories(truckpulse_tests PRIVATE ${TRUCKPULSE_INCLUDE_DIR})

if(MINGW)
    target_link_options(truckpulse_tests PRIVATE -static-libgcc -static-libstdc++)
    if(CMAKE_CXX_COMPILER_ID STREQUAL "GNU")
        execute_process(COMMAND ${CMAKE_CXX_COMPILER} -v
            ERROR_VARIABLE _gcc_version_info2)
        if(_gcc_version_info2 MATCHES "posix")
            target_link_libraries(truckpulse_tests PRIVATE -lpthread)
        endif()
    endif()
elseif(UNIX)
    target_link_libraries(truckpulse_tests PRIVATE pthread)
endif()

# Register with CTest — exit code 0 = all tests passed
add_test(NAME TruckPulseSuite COMMAND truckpulse_tests)
set_tests_properties(TruckPulseSuite PROPERTIES
    PASS_REGULAR_EXPRESSION "0 failed"
)

# ── Summary ───────────────────────────────────────────────────────────────────
message(STATUS "--------------------------------------------")
message(STATUS "TruckPulse Phase 1")
message(STATUS "  Compiler     : ${CMAKE_CXX_COMPILER_ID} ${CMAKE_CXX_COMPILER_VERSION}")
message(STATUS "  Standard     : C++${CMAKE_CXX_STANDARD}")
message(STATUS "  Build type   : ${CMAKE_BUILD_TYPE}")
message(STATUS "  Include dir  : ${TRUCKPULSE_INCLUDE_DIR}")
message(STATUS "--------------------------------------------")
