param(
    [string]$WatchPath = "src/main",
    [string]$SyncScriptPath = "scripts/sync-frontend-api-config.ps1"
)

$resolvedWatchPath = Resolve-Path -Path $WatchPath -ErrorAction Stop
$resolvedSyncScriptPath = Resolve-Path -Path $SyncScriptPath -ErrorAction Stop

Write-Output "Watching backend path: $resolvedWatchPath"
Write-Output "Sync script: $resolvedSyncScriptPath"
Write-Output "Press Ctrl+C to stop."

& powershell -ExecutionPolicy Bypass -File $resolvedSyncScriptPath

$watcher = New-Object System.IO.FileSystemWatcher
$watcher.Path = $resolvedWatchPath
$watcher.IncludeSubdirectories = $true
$watcher.NotifyFilter = [System.IO.NotifyFilters]'FileName, LastWrite, DirectoryName'
$watcher.Filter = "*.*"

$lastRun = Get-Date "2000-01-01"
$debounceMs = 600

$action = {
    $now = Get-Date
    $elapsed = ($now - $script:lastRun).TotalMilliseconds
    if ($elapsed -lt $script:debounceMs) {
        return
    }

    $script:lastRun = $now
    & powershell -ExecutionPolicy Bypass -File $event.MessageData | Out-Host
}

$created = Register-ObjectEvent $watcher Created -Action $action -MessageData $resolvedSyncScriptPath
$changed = Register-ObjectEvent $watcher Changed -Action $action -MessageData $resolvedSyncScriptPath
$renamed = Register-ObjectEvent $watcher Renamed -Action $action -MessageData $resolvedSyncScriptPath
$deleted = Register-ObjectEvent $watcher Deleted -Action $action -MessageData $resolvedSyncScriptPath

$watcher.EnableRaisingEvents = $true

try {
    while ($true) {
        Start-Sleep -Seconds 1
    }
}
finally {
    $watcher.EnableRaisingEvents = $false
    Unregister-Event -SourceIdentifier $created.SourceIdentifier
    Unregister-Event -SourceIdentifier $changed.SourceIdentifier
    Unregister-Event -SourceIdentifier $renamed.SourceIdentifier
    Unregister-Event -SourceIdentifier $deleted.SourceIdentifier
    $watcher.Dispose()
}
