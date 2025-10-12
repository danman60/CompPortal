param(
  [int]$PID,  # REQUIRED: Process ID of Codex PowerShell window
  [int]$IntervalMinutes = 5,
  [switch]$DryRun,
  [switch]$Verbose
)

if (-not $PID -or $PID -eq 0) {
  Write-Error "ERROR: You must provide the PID of your Codex PowerShell window"
  Write-Host ""
  Write-Host "Usage: .\codex-watchdog-simple.ps1 -PID <process_id>"
  Write-Host ""
  Write-Host "To find your Codex PowerShell PID:"
  Write-Host "  1. In your Codex terminal, run: `$PID"
  Write-Host "  2. Note the number (e.g., 12345)"
  Write-Host "  3. Run: .\codex-watchdog-simple.ps1 -PID 12345"
  Write-Host ""
  exit 1
}

# Load required UI assemblies
Add-Type -AssemblyName System.Windows.Forms | Out-Null

# User32 helpers
Add-Type @"
using System;
using System.Runtime.InteropServices;
public static class Win32 {
    [DllImport("user32.dll")] public static extern bool SetForegroundWindow(IntPtr hWnd);
    [DllImport("user32.dll")] public static extern bool IsWindowVisible(IntPtr hWnd);
    [DllImport("user32.dll")] public static extern bool ShowWindowAsync(IntPtr hWnd, int nCmdShow);
    [DllImport("user32.dll")] public static extern bool IsIconic(IntPtr hWnd);
    [DllImport("user32.dll")] public static extern IntPtr GetForegroundWindow();
    [DllImport("user32.dll")] public static extern bool BringWindowToTop(IntPtr hWnd);
    [DllImport("user32.dll")] public static extern uint GetWindowThreadProcessId(IntPtr hWnd, out uint lpdwProcessId);
    [DllImport("user32.dll")] public static extern bool AttachThreadInput(uint idAttach, uint idAttachTo, bool fAttach);
}
public static class Keyboard {
    [DllImport("user32.dll")] public static extern void keybd_event(byte bVk, byte bScan, uint dwFlags, UIntPtr dwExtraInfo);
}
"@ | Out-Null

function Set-Foreground {
    param([IntPtr]$Hwnd)
    if ($Hwnd -eq [IntPtr]::Zero) { return $false }
    try {
        if ([Win32]::IsIconic($Hwnd)) { [Win32]::ShowWindowAsync($Hwnd, 9) | Out-Null }

        $fg = [Win32]::GetForegroundWindow()
        [UInt32]$fgPid = 0
        $fgTid = [Win32]::GetWindowThreadProcessId($fg, [ref]$fgPid)
        [UInt32]$twPid = 0
        $twTid = [Win32]::GetWindowThreadProcessId($Hwnd, [ref]$twPid)

        if ($fgTid -ne 0 -and $twTid -ne 0) {
            [Win32]::AttachThreadInput($fgTid, $twTid, $true) | Out-Null
            try {
                [Win32]::BringWindowToTop($Hwnd) | Out-Null
                [Win32]::SetForegroundWindow($Hwnd) | Out-Null
            } finally {
                [Win32]::AttachThreadInput($fgTid, $twTid, $false) | Out-Null
            }
        } else {
            [Win32]::SetForegroundWindow($Hwnd) | Out-Null
        }

        Start-Sleep -Milliseconds 100
        return ([Win32]::GetForegroundWindow() -eq $Hwnd)
    } catch { return $false }
}

function Send-Continue {
    param([System.Diagnostics.Process]$proc)
    if (-not $proc -or $proc.HasExited) { return $false }

    $ok = Set-Foreground -Hwnd $proc.MainWindowHandle
    if (-not $ok) {
        Write-Warning "[WATCHDOG] Failed to set foreground window"
        return $false
    }

    Start-Sleep -Milliseconds 300

    if ($DryRun) {
        Write-Host ("[WATCHDOG] DryRun: would send 'continue' to PID {0}" -f $proc.Id)
        return $true
    }

    try {
        [System.Windows.Forms.SendKeys]::SendWait("continue{ENTER}")
        if ($Verbose) { Write-Host "[WATCHDOG] Sent 'continue' via SendKeys" }
        return $true
    } catch {
        if ($Verbose) { Write-Warning "[WATCHDOG] SendKeys failed, trying keybd_event: $($_.Exception.Message)" }
        foreach ($ch in 'c','o','n','t','i','n','u','e') {
            $vk = switch ($ch) {
                'c' { 0x43 }
                'o' { 0x4F }
                'n' { 0x4E }
                't' { 0x54 }
                'i' { 0x49 }
                'u' { 0x55 }
                'e' { 0x45 }
            }
            if ($vk) {
                [Keyboard]::keybd_event($vk,0,0,[UIntPtr]::Zero)
                [Keyboard]::keybd_event($vk,0,2,[UIntPtr]::Zero)
                Start-Sleep -Milliseconds 10
            }
        }
        [Keyboard]::keybd_event(0x0D,0,0,[UIntPtr]::Zero)
        Start-Sleep -Milliseconds 20
        [Keyboard]::keybd_event(0x0D,0,2,[UIntPtr]::Zero)
        if ($Verbose) { Write-Host "[WATCHDOG] Sent 'continue' via keybd_event" }
        return $true
    }
}

# Find the process
try {
    $proc = Get-Process -Id $PID -ErrorAction Stop
} catch {
    Write-Error "ERROR: Cannot find process with PID $PID"
    Write-Host "Make sure Codex is running and you have the correct PID"
    exit 1
}

if ($proc.MainWindowHandle -eq 0) {
    Write-Error "ERROR: Process $PID has no visible window"
    Write-Host "Make sure the Codex PowerShell window is visible (not minimized)"
    exit 1
}

Write-Host "============================================"
Write-Host "[WATCHDOG] Codex Auto-Continue (Simple Mode)"
Write-Host "============================================"
Write-Host "[WATCHDOG] Target PID: $($proc.Id)"
Write-Host "[WATCHDOG] Window Title: '$($proc.MainWindowTitle)'"
Write-Host "[WATCHDOG] Process: $($proc.ProcessName)"
Write-Host "[WATCHDOG] Interval: $IntervalMinutes minutes"
Write-Host "[WATCHDOG] Dry run: $DryRun"
Write-Host "============================================"
Write-Host ""
Write-Host "[WATCHDOG] Starting auto-continue loop..."
Write-Host "[WATCHDOG] Press Ctrl+C to stop"
Write-Host ""

# Initial send
Write-Host "[WATCHDOG] Sending initial 'continue'..."
if (Set-Foreground -Hwnd $proc.MainWindowHandle) {
  Start-Sleep -Milliseconds 200
  $sent = Send-Continue -proc $proc
  if ($sent) {
    Write-Host ("[WATCHDOG] [OK] Initial 'continue' sent at {0}" -f (Get-Date -Format "HH:mm:ss"))
  } else {
    Write-Warning "[WATCHDOG] [FAIL] Initial send failed"
  }
} else {
  Write-Warning "[WATCHDOG] Could not focus window on start"
}

Write-Host ""
Write-Host "[WATCHDOG] Monitoring loop started..."
Write-Host ""

# Main loop
$cycleCount = 0
while ($true) {
  Start-Sleep -Seconds ([int]($IntervalMinutes * 60))
  $cycleCount++

  Write-Host "--------------------------------------------"
  Write-Host "[WATCHDOG] Cycle #$cycleCount at $(Get-Date -Format 'HH:mm:ss')"

  try {
    # Refresh process
    $proc = Get-Process -Id $PID -ErrorAction Stop

    if ($proc.HasExited) {
      Write-Error "[WATCHDOG] Target process exited!"
      break
    }

    if ($proc.MainWindowHandle -eq 0 -or -not [Win32]::IsWindowVisible($proc.MainWindowHandle)) {
      Write-Warning "[WATCHDOG] Window not visible, skipping"
      continue
    }

    if (Set-Foreground -Hwnd $proc.MainWindowHandle) {
      Start-Sleep -Milliseconds 200
      $sent = Send-Continue -proc $proc

      if ($sent) {
        Write-Host ("[WATCHDOG] [OK] Sent 'continue' at {0}" -f (Get-Date -Format "HH:mm:ss"))
      } else {
        Write-Warning "[WATCHDOG] [FAIL] Failed to send"
      }
    } else {
      Write-Warning "[WATCHDOG] Could not focus window"
    }

  } catch {
    Write-Warning "[WATCHDOG] Error: $($_.Exception.Message)"
  }

  Write-Host "[WATCHDOG] Next check in $IntervalMinutes minutes..."
  Write-Host ""
}
