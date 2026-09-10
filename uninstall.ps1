# release-list Spicetify uninstaller
# One-liner: iwr -useb "https://raw.githubusercontent.com/daviidpaark/release-list/main/uninstall.ps1" | iex

$ErrorActionPreference = "Stop"

if (-not (Get-Command spicetify -ErrorAction SilentlyContinue)) {
    Write-Error "spicetify not found in PATH."
    exit 1
}

$spiceConfigPath = & spicetify -c 2>$null
if ($spiceConfigPath -and (Test-Path $spiceConfigPath)) {
    $spicePath  = Split-Path $spiceConfigPath -Parent
    $configFile = $spiceConfigPath
} else {
    $spicePath  = "$env:APPDATA\spicetify"
    $configFile = "$spicePath\config-xpui.ini"
}

$appsToRemove = @("release-list")

# ── 1. Remove app folders ────────────────────────────────────────────────────
foreach ($app in $appsToRemove) {
    $dest = Join-Path $spicePath "CustomApps\$app"
    if (Test-Path $dest) {
        Remove-Item $dest -Recurse -Force
        Write-Host "Removed $dest" -ForegroundColor Cyan
    } else {
        Write-Host "'$app' folder not found, skipping." -ForegroundColor Yellow
    }
}

# ── 2. Deregister from config-xpui.ini ──────────────────────────────────────
if (Test-Path $configFile) {
    $config = Get-Content $configFile -Raw

    if ($config -match "(?m)^(custom_apps\s*=\s*)(.*)$") {
        $key    = $Matches[1]
        $values = $Matches[2] -split "\|" | ForEach-Object { $_.Trim() } | Where-Object { $_ -ne "" -and $appsToRemove -notcontains $_ }
        $newLine = "$key$($values -join '|')"
        $config  = $config -replace "(?m)^custom_apps\s*=.*$", $newLine
        Set-Content $configFile $config -NoNewline
        Write-Host "Deregistered apps from config-xpui.ini" -ForegroundColor Green
    }
}

# ── 3. Apply ─────────────────────────────────────────────────────────────────
Write-Host "`nApplying spicetify..." -ForegroundColor Cyan
spicetify apply
Write-Host "`nDone! Restart Spotify if it's already open." -ForegroundColor Green
