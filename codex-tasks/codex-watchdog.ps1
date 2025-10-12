param([int]$IntervalMinutes = 10)

Add-Type -AssemblyName System.Windows.Forms
Add-Type @"
using System;
using System.Runtime.InteropServices;
public class Win32 {
    [DllImport("user32.dll")] public static extern bool SetForegroundWindow(IntPtr hWnd);
    [DllImport("user32.dll")] public static extern bool IsWindowVisible(IntPtr hWnd);
}
"@

function Find-CodexHost {
    # Replace this path with the actual Codex directory if different
    $targetPath = "D:\\CodexCode"
    $powershells = Get-CimInstance Win32_Process -Filter "Name='powershell.exe'"
    foreach ($p in $powershells) {
        if ($p.CommandLine -match [Regex]::Escape($targetPath)) {
            try {
                $proc = Get-Process -Id $p.ProcessId -ErrorAction Stop
                if ($proc.MainWindowHandle -ne 0 -and [Win32]::IsWindowVisible($proc.MainWindowHandle)) {
                    return $proc
                }
            } catch {}
        }
    }
    return $null
}

Write-Host "Waiting for Codex CLI PowerShell window..."
$proc = $null
while (-not $proc) { $proc = Find-CodexHost; if (-not $proc) { Start-Sleep 2 } }

Write-Host "Found Codex host PowerShell PID $($proc.Id)"
Write-Host "Will send 'continue' immediately and then every $IntervalMinutes minute(s)."

# --- Immediate test send ---
if ($proc.MainWindowHandle -ne 0 -and [Win32]::IsWindowVisible($proc.MainWindowHandle)) {
    [Win32]::SetForegroundWindow($proc.MainWindowHandle) | Out-Null
    Start-Sleep -Milliseconds 200
    [System.Windows.Forms.SendKeys]::SendWait("continue")
    Start-Sleep -Milliseconds 500
    [System.Windows.Forms.SendKeys]::SendWait("{ENTER}")
    Write-Host "[WATCHDOG] Initial 'continue + Enter' sent to Codex PowerShell PID $($proc.Id) at $(Get-Date -Format HH:mm:ss)"
}

# --- Repeats ---
while (-not $proc.HasExited) {
    Start-Sleep -Seconds ($IntervalMinutes * 60)
    try {
        $proc.Refresh()
        if (-not $proc.HasExited -and $proc.MainWindowHandle -ne 0 -and [Win32]::IsWindowVisible($proc.MainWindowHandle)) {
            [Win32]::SetForegroundWindow($proc.MainWindowHandle) | Out-Null
            Start-Sleep -Milliseconds 200
            [System.Windows.Forms.SendKeys]::SendWait("continue")
            Start-Sleep -Milliseconds 500
            [System.Windows.Forms.SendKeys]::SendWait("{ENTER}")
            Write-Host "[WATCHDOG] Sent 'continue + Enter' to Codex PowerShell at $(Get-Date -Format HH:mm:ss)"
        }
    } catch { break }
}
