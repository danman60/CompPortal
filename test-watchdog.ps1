# Diagnostic script to find all terminal windows
Write-Host "=== Finding All Terminal Windows ==="
Write-Host ""

$names = @('powershell.exe','pwsh.exe','WindowsTerminal.exe','conhost.exe','OpenConsole.exe')
$all = Get-CimInstance Win32_Process
$procs = $all | Where-Object { $names -contains $_.Name }

Write-Host "Found $($procs.Count) terminal processes:"
Write-Host ""

foreach ($p in $procs) {
    try {
        $proc = Get-Process -Id $p.ProcessId -ErrorAction Stop
        $cmd = $p.CommandLine
        $title = $proc.MainWindowTitle
        $hasWindow = $proc.MainWindowHandle -ne 0

        Write-Host "----------------------------------------"
        Write-Host "PID: $($p.ProcessId)"
        Write-Host "Name: $($p.Name)"
        Write-Host "Has Window: $hasWindow"
        Write-Host "Window Handle: $($proc.MainWindowHandle)"
        Write-Host "Title: '$title'"
        Write-Host "CommandLine: $cmd"
        Write-Host ""

        # Check for Codex/CompPortal
        $hasCodex = ($cmd -and ($cmd -match '(?i)codex')) -or ($title -and ($title -match '(?i)codex'))
        $hasCompPortal = ($cmd -and $cmd.Contains("CompPortal")) -or ($title -and $title.Contains("CompPortal"))

        Write-Host "  Has 'codex': $hasCodex"
        Write-Host "  Has 'CompPortal': $hasCompPortal"

        if ($hasWindow) {
            Write-Host "  *** THIS WINDOW HAS A UI ***"
        }

    } catch {
        Write-Host "PID $($p.ProcessId): Error - $($_.Exception.Message)"
    }
    Write-Host ""
}

Write-Host ""
Write-Host "=== Current PowerShell Process ==="
$current = Get-Process -Id $PID
Write-Host "Current PID: $PID"
Write-Host "Current Title: '$($current.MainWindowTitle)'"
Write-Host "Current Handle: $($current.MainWindowHandle)"
