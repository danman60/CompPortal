@echo off
echo ========================================
echo  Codex Junior Dev - CompPortal
echo ========================================
echo.
echo Config: codex.config.json
echo Flags: --sandbox danger-full-access
echo.
echo When ready, say "continue" to process tasks
echo Press Ctrl+C to stop
echo.
echo ========================================
echo.

cd /d D:\ClaudeCode\CompPortal

codex --config codex.config.json --sandbox danger-full-access

pause
