$ErrorActionPreference = "Stop"

# Configuration
$AndroidHome = "$env:LOCALAPPDATA\Android\Sdk"
$CmdLineToolsUrl = "https://dl.google.com/android/repository/commandlinetools-win-11076708_latest.zip"
$ZipPath = "$env:TEMP\commandlinetools.zip"

Write-Host "--- Installing Android SDK ---"
Write-Host "Android Home: $AndroidHome"

# 1. Create Directory
if (-not (Test-Path $AndroidHome)) {
    New-Item -ItemType Directory -Force -Path $AndroidHome | Out-Null
    Write-Host "Created Android Sdk directory."
}

# 2. Download Command Line Tools
Write-Host "Downloading Command Line Tools..."
Invoke-WebRequest -Uri $CmdLineToolsUrl -OutFile $ZipPath
Write-Host "Download complete."

# 3. Extract
Write-Host "Extracting..."
Expand-Archive -Path $ZipPath -DestinationPath $AndroidHome -Force

# 4. Fix Directory Structure (cmdline-tools/latest/bin)
# The zip extracts to "cmdline-tools". We need to move content to "cmdline-tools/latest"
$CmdLineToolsDir = "$AndroidHome\cmdline-tools"
$LatestDir = "$CmdLineToolsDir\latest"

if (Test-Path $LatestDir) {
    Remove-Item -Recurse -Force $LatestDir
}
New-Item -ItemType Directory -Force -Path $LatestDir | Out-Null

# Move everything from cmdline-tools to latest (excluding latest itself)
Get-ChildItem -Path $CmdLineToolsDir | Where-Object { $_.Name -ne "latest" } | Move-Item -Destination $LatestDir
Write-Host "Directory structure fixed."

# 5. Set Environment Variables for Session
$env:ANDROID_HOME = $AndroidHome
$env:PATH = "$env:PATH;$LatestDir\bin;$AndroidHome\platform-tools"

# 6. Accept Licenses and Install
Write-Host "Accepting licenses and installing packages..."

# Create a stream of 'y' to accept all licenses
$YesSequence = ("y`n" * 50) 
$YesSequence | & "$LatestDir\bin\sdkmanager.bat" --licenses --sdk_root="$AndroidHome"

Write-Host "Installing Platform Tools, SDK 34, Build Tools 34.0.0..."
& "$LatestDir\bin\sdkmanager.bat" "platform-tools" "platforms;android-34" "build-tools;34.0.0" --sdk_root="$AndroidHome"

Write-Host "--- Installation Complete ---"
Write-Host "Please restart your terminal or set ANDROID_HOME manually to: $AndroidHome"
