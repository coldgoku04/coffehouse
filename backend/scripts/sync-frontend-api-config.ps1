param(
    [string]$BackendPropertiesPath = "src/main/resources/application.properties",
    [string]$FrontendConfigPath = "D:/intellj/full_stack/src/config/api.js",
    [string]$DefaultHost = "localhost",
    [int]$DefaultPort = 8080
)

$resolvedBackendPath = Resolve-Path -Path $BackendPropertiesPath -ErrorAction Stop
$properties = Get-Content -Path $resolvedBackendPath

$serverHost = $DefaultHost
$serverPort = $DefaultPort

foreach ($line in $properties) {
    if ($line -match '^\s*server\.address\s*=\s*(.+)\s*$') {
        $serverHost = $Matches[1].Trim()
    }
    elseif ($line -match '^\s*server\.port\s*=\s*(\d+)\s*$') {
        $serverPort = [int]$Matches[1]
    }
}

$apiBaseUrl = "http://$serverHost`:$serverPort"
$frontendDir = Split-Path -Path $FrontendConfigPath -Parent

if (-not (Test-Path -Path $frontendDir)) {
    New-Item -ItemType Directory -Path $frontendDir -Force | Out-Null
}

$contentTemplate = @'
export const API_BASE_URL = "__API_BASE_URL__";

export const apiUrl = (path) => {
    if (!path.startsWith("/")) {
        return `${API_BASE_URL}/${path}`;
    }
    return `${API_BASE_URL}${path}`;
};
'@

$content = $contentTemplate.Replace("__API_BASE_URL__", $apiBaseUrl)

[System.IO.File]::WriteAllText($FrontendConfigPath, $content, [System.Text.UTF8Encoding]::new($false))
Write-Output "Synced frontend API config to $FrontendConfigPath with API base URL: $apiBaseUrl"
