$ErrorActionPreference = "Stop"

$Repo       = "Walon-Foundation/blast"
$Bin        = "blast"
$InstallDir = if ($env:BLAST_INSTALL_DIR) { $env:BLAST_INSTALL_DIR } else { "$env:USERPROFILE\.local\bin" }

function Write-Info { param($msg) Write-Host "info  $msg" -ForegroundColor Cyan }
function Write-Ok   { param($msg) Write-Host "ok    $msg" -ForegroundColor Green }
function Write-Err  { param($msg) Write-Host "error $msg" -ForegroundColor Red; exit 1 }

$arch = [System.Runtime.InteropServices.RuntimeInformation]::OSArchitecture
if ($arch -ne "X64") { Write-Err "unsupported architecture: $arch" }
$Target = "x86_64-pc-windows-msvc"

Write-Info "fetching latest release..."
$release = Invoke-RestMethod "https://api.github.com/repos/$Repo/releases/latest"
$version = $release.tag_name
if (-not $version) { Write-Err "could not fetch latest version" }

$archive = "$Bin-$version-$Target.zip"
$url     = "https://github.com/$Repo/releases/download/$version/$archive"

Write-Info "downloading $Bin $version ($Target)..."
$tmp = Join-Path $env:TEMP ([System.IO.Path]::GetRandomFileName())
New-Item -ItemType Directory -Path $tmp | Out-Null

$archivePath = Join-Path $tmp $archive
Invoke-WebRequest $url -OutFile $archivePath -UseBasicParsing

Write-Info "extracting..."
Expand-Archive $archivePath -DestinationPath $tmp -Force

$exe = Get-ChildItem $tmp -Filter "$Bin.exe" -Recurse | Select-Object -First 1
if (-not $exe) { Write-Err "binary not found in archive" }

if (-not (Test-Path $InstallDir)) { New-Item -ItemType Directory -Path $InstallDir | Out-Null }
Move-Item $exe.FullName (Join-Path $InstallDir "$Bin.exe") -Force
Remove-Item $tmp -Recurse -Force

Write-Ok "$Bin $version installed to $InstallDir\$Bin.exe"

$currentPath = [Environment]::GetEnvironmentVariable("PATH", "User")
if ($currentPath -notlike "*$InstallDir*") {
  [Environment]::SetEnvironmentVariable("PATH", "$currentPath;$InstallDir", "User")
  Write-Host "`n  Added $InstallDir to your PATH. Restart your terminal." -ForegroundColor Yellow
}
Write-Host "`n  Run: blast --help`n"
