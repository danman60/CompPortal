param(
  [int]$IntervalMinutes = 5,  # Reduced from 10 to 5 minutes
  [string]$TargetDir,
  [switch]$CodexOnly = $true,
  [switch]$Strict = $false,  # Changed to false - less strict path matching
  [switch]$DryRun,
  [switch]$Verbose
)

# Load required UI assemblies
Add-Type -AssemblyName System.Windows.Forms | Out-Null

# User32 helpers for reliable window focusing and visibility checks
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

# Resolve and normalize the exact target directory; default to script directory (CompPortal root)
if (-not $TargetDir -or $TargetDir.Trim().Length -eq 0) {
  try {
    # Default to script's directory (CompPortal root where Codex runs)
    $TargetDir = (Resolve-Path -LiteralPath $PSScriptRoot).Path
  } catch {
    $TargetDir = (Resolve-Path -LiteralPath (Get-Location)).Path
  }
}
$TargetDir = [IO.Path]::GetFullPath($TargetDir)

function New-PathRegex {
  param([string]$Path)
  $norm = $Path.Trim().Trim('"')
  $norm = [IO.Path]::GetFullPath($norm)
  $escaped = [Regex]::Escape($norm)
  # allow either slash in matching (\\ or /)
  $escaped = $escaped -replace '\\\\', '(?:\\\\|/)'
  return $escaped
}
function Contains-Path {
  param([string]$Text,[string]$Path)
  if (-not $Text) { return $false }
  $rx = New-PathRegex -Path $Path
  return ($Text -match $rx)
}

# Try to find the target terminal window hosting the Codex CLI
function Find-CodexHost {
    param([string]$Dir,[switch]$CodexOnly,[switch]$Strict,[switch]$Verbose)

    $names = @('powershell.exe','pwsh.exe','WindowsTerminal.exe','conhost.exe','OpenConsole.exe')
    $all = Get-CimInstance Win32_Process
    $procs = $all | Where-Object { $names -contains $_.Name }

    if ($Verbose) {
        Write-Host "[WATCHDOG] Searching among $($procs.Count) terminal processes..."
    }

    # 1) Prefer child shells (powershell/pwsh) whose command line/title matches both conditions,
    #    then resolve their visible host window by walking up the parent chain.
    $shells = $procs | Where-Object { $_.Name -in @('powershell.exe','pwsh.exe') }
    foreach ($p in $shells) {
        try {
            $cmd = $p.CommandLine
            $title = (Get-Process -Id $p.ProcessId -ErrorAction Stop).MainWindowTitle
            $hasCodex = (($cmd -and ($cmd -match '(?i)codex')) -or ($title -and ($title -match '(?i)codex')))

            # More lenient path matching - check if Dir is substring of path or vice versa
            $inDir = $false
            if ($cmd -or $title) {
                $inDir = (Contains-Path -Text $cmd -Path $Dir) -or
                         (Contains-Path -Text $title -Path $Dir) -or
                         ($cmd -and $cmd.Contains("CompPortal")) -or
                         ($title -and $title.Contains("CompPortal")) -or
                         ($cmd -and $cmd.Contains("codex-tasks")) -or
                         ($title -and $title.Contains("codex-tasks"))
            }

            if ($Verbose) {
                Write-Host "[WATCHDOG]   Shell PID $($p.ProcessId): Codex=$hasCodex InDir=$inDir Title='$title'"
            }

            if ($CodexOnly -and -not $hasCodex) { continue }
            if ($Strict -and -not $inDir) { continue }

            # Walk parents to find a process with a visible window
            $cur = $p
            for ($i=0; $i -lt 5 -and $cur; $i++) {
                try {
                    $gp = Get-Process -Id $cur.ProcessId -ErrorAction Stop
                    if ($gp.MainWindowHandle -ne 0 -and [Win32]::IsWindowVisible($gp.MainWindowHandle)) {
                        if ($Verbose) {
                            Write-Host "[WATCHDOG]   Found visible window: PID $($gp.Id) Title='$($gp.MainWindowTitle)'"
                        }
                        return $gp
                    }
                } catch {}
                $cur = $all | Where-Object { $_.ProcessId -eq $cur.ParentProcessId }
            }
        } catch {}
    }

    # 2) Fallback: visible host processes that themselves match (title/cmdline)
    foreach ($p in $procs) {
        try {
            $proc = Get-Process -Id $p.ProcessId -ErrorAction Stop
            if ($proc.MainWindowHandle -eq 0) { continue }
            $visible = [Win32]::IsWindowVisible($proc.MainWindowHandle)
            if (-not $visible) { continue }

            $cmd = $p.CommandLine
            $title = $proc.MainWindowTitle
            $hasCodex = (($cmd -and ($cmd -match '(?i)codex')) -or ($title -and ($title -match '(?i)codex')))

            # More lenient path matching
            $inDir = (Contains-Path -Text $cmd -Path $Dir) -or
                     (Contains-Path -Text $title -Path $Dir) -or
                     ($cmd -and $cmd.Contains("CompPortal")) -or
                     ($title -and $title.Contains("CompPortal")) -or
                     ($cmd -and $cmd.Contains("codex-tasks")) -or
                     ($title -and $title.Contains("codex-tasks"))

            if ($Verbose) {
                Write-Host "[WATCHDOG]   Host PID $($proc.Id): Codex=$hasCodex InDir=$inDir Visible=$visible Title='$title'"
            }

            if ($CodexOnly -and -not $hasCodex) { continue }
            if ($Strict -and -not $inDir) { continue }

            if ($hasCodex) { return $proc }  # Return if has Codex, regardless of dir in non-strict mode
        } catch {}
    }
    return $null
}

function Set-Foreground {
    param([IntPtr]$Hwnd)
    if ($Hwnd -eq [IntPtr]::Zero) { return $false }
    try {
        if ([Win32]::IsIconic($Hwnd)) { [Win32]::ShowWindowAsync($Hwnd, 9) | Out-Null } # SW_RESTORE

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

    Start-Sleep -Milliseconds 300  # Increased wait time for window to settle

    if ($DryRun) {
        Write-Host ("[WATCHDOG] DryRun: would send 'continue' to PID {0} Title '{1}'" -f $proc.Id, $proc.MainWindowTitle)
        return $true
    }

    try {
        [System.Windows.Forms.SendKeys]::SendWait("continue{ENTER}")
        Write-Host "[WATCHDOG] Sent 'continue' via SendKeys"
        return $true
    } catch {
        Write-Warning "[WATCHDOG] SendKeys failed, trying keybd_event fallback: $($_.Exception.Message)"
        # fallback: type 'continue' via keybd_event if SendKeys fails
        foreach ($ch in 'c','o','n','t','i','n','u','e') {
            $vk = [byte][System.Windows.Forms.Keys]::None
            switch ($ch) {
                'c' { $vk = 0x43 }
                'o' { $vk = 0x4F }
                'n' { $vk = 0x4E }
                't' { $vk = 0x54 }
                'i' { $vk = 0x49 }
                'u' { $vk = 0x55 }
                'e' { $vk = 0x45 }
            }
            if ($vk -ne 0) {
                [Keyboard]::keybd_event($vk,0,0,[UIntPtr]::Zero)
                [Keyboard]::keybd_event($vk,0,2,[UIntPtr]::Zero)
                Start-Sleep -Milliseconds 10
            }
        }
        [Keyboard]::keybd_event(0x0D,0,0,[UIntPtr]::Zero)
        Start-Sleep -Milliseconds 20
        [Keyboard]::keybd_event(0x0D,0,2,[UIntPtr]::Zero)
        Write-Host "[WATCHDOG] Sent 'continue' via keybd_event"
        return $true
    }
}

Write-Host "============================================"
Write-Host "[WATCHDOG] Codex Auto-Continue Watchdog"
Write-Host "============================================"
Write-Host "[WATCHDOG] Target directory: $TargetDir"
Write-Host "[WATCHDOG] Interval: $IntervalMinutes minutes"
Write-Host "[WATCHDOG] Strict mode: $Strict"
Write-Host "[WATCHDOG] Dry run: $DryRun"
Write-Host "============================================"

# Block until first match is found
Write-Host "[WATCHDOG] Searching for Codex terminal window..."
$proc = $null
$attempts = 0
do {
  $proc = Find-CodexHost -Dir $TargetDir -CodexOnly:$CodexOnly -Strict:$Strict -Verbose:$Verbose
  if (-not $proc) {
    $attempts++
    Write-Host "[WATCHDOG] Attempt $attempts - No Codex window found, retrying in 3 seconds..."
    Start-Sleep -Seconds 3
  }
} while (-not $proc)

Write-Host ""
Write-Host "============================================"
Write-Host "[WATCHDOG] ✓ Found Codex window!"
Write-Host "[WATCHDOG]   PID: $($proc.Id)"
Write-Host "[WATCHDOG]   Title: '$($proc.MainWindowTitle)'"
Write-Host "[WATCHDOG]   Process: $($proc.ProcessName)"
Write-Host "============================================"
Write-Host ""
Write-Host "[WATCHDOG] Starting auto-continue loop..."
Write-Host "[WATCHDOG] Will send 'continue' now and every $IntervalMinutes minutes"
Write-Host "[WATCHDOG] Press Ctrl+C to stop"
Write-Host ""

# Immediate send to verify (with focus check)
$initialSent = $false
Write-Host "[WATCHDOG] Sending initial 'continue' command..."
if (Set-Foreground -Hwnd $proc.MainWindowHandle) {
  Start-Sleep -Milliseconds 200
  if ([Win32]::GetForegroundWindow() -eq $proc.MainWindowHandle) {
    $initialSent = Send-Continue -proc $proc
  } else {
    Write-Warning "[WATCHDOG] Focus verification failed; skipping initial send."
  }
} else {
  Write-Warning "[WATCHDOG] Could not focus target window on start; skipping initial send."
}

if ($initialSent) {
  Write-Host ("[WATCHDOG] ✓ Initial 'continue' sent at {0}" -f (Get-Date -Format "HH:mm:ss"))
} else {
  Write-Warning "[WATCHDOG] ✗ Initial send failed; will retry on next interval"
}

Write-Host ""
Write-Host "[WATCHDOG] Entering monitoring loop..."
Write-Host ""

# Main loop: re-resolve target each cycle to handle restarts or tab changes
$cycleCount = 0
while ($true) {
  Start-Sleep -Seconds ([int]($IntervalMinutes * 60))
  $cycleCount++

  Write-Host "--------------------------------------------"
  Write-Host "[WATCHDOG] Cycle #$cycleCount at $(Get-Date -Format 'HH:mm:ss')"

  try {
    # Re-find each tick in case the window changed
    $current = Find-CodexHost -Dir $TargetDir -CodexOnly:$CodexOnly -Strict:$Strict -Verbose:$Verbose
    if ($current) {
      $proc = $current
      if ($Verbose) {
        Write-Host "[WATCHDOG] Re-confirmed target: PID $($proc.Id)"
      }
    } else {
      Write-Warning "[WATCHDOG] Could not re-find Codex window, using previous reference"
    }

    if ($proc -and -not $proc.HasExited -and $proc.MainWindowHandle -ne 0 -and [Win32]::IsWindowVisible($proc.MainWindowHandle)) {
      # Verify foreground ends up being the same window before sending
      $sent = $false
      if (Set-Foreground -Hwnd $proc.MainWindowHandle) {
        Start-Sleep -Milliseconds 200
        if ([Win32]::GetForegroundWindow() -eq $proc.MainWindowHandle) {
          $sent = Send-Continue -proc $proc
        } else {
          Write-Warning "[WATCHDOG] Focus verification failed after Set-Foreground"
        }
      } else {
        Write-Warning "[WATCHDOG] Could not focus target window"
      }

      if ($sent) {
        Write-Host ("[WATCHDOG] ✓ Sent 'continue' at {0} to PID {1}" -f (Get-Date -Format "HH:mm:ss"), $proc.Id)
      } else {
        Write-Warning "[WATCHDOG] ✗ Failed to send 'continue', will retry next cycle"
      }
    } else {
      Write-Warning "[WATCHDOG] Target window not ready or exited, searching again..."
      # Try to find a new window
      $proc = Find-CodexHost -Dir $TargetDir -CodexOnly:$CodexOnly -Strict:$Strict -Verbose:$Verbose
      if ($proc) {
        Write-Host "[WATCHDOG] Found new Codex window: PID $($proc.Id)"
      } else {
        Write-Warning "[WATCHDOG] No Codex window found"
      }
    }
  } catch {
    Write-Warning "[WATCHDOG] Error in cycle #$($cycleCount): $($_.Exception.Message)"
  }

  Write-Host "[WATCHDOG] Next check in $IntervalMinutes minutes..."
  Write-Host ""
}
