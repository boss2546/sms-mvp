# Backup Script for SMS Project
# Creates a timestamped backup of the entire project

param(
    [string]$BackupPath = "C:\ProjectBackups"
)

# Get current timestamp
$timestamp = Get-Date -Format "yyyyMMdd_HHmm"
$backupDir = "$BackupPath\_backup_$timestamp"

# Create backup directory if it doesn't exist
if (!(Test-Path $BackupPath)) {
    New-Item -ItemType Directory -Path $BackupPath -Force
    Write-Host "Created backup directory: $BackupPath"
}

# Create timestamped backup directory
New-Item -ItemType Directory -Path $backupDir -Force
Write-Host "Created backup directory: $backupDir"

# Copy all files except .git directory to backup
$sourcePath = Get-Location
$excludeItems = @(".git", "node_modules", "__pycache__", ".pytest_cache", "*.pyc")

Write-Host "Backing up project from: $sourcePath"
Write-Host "Backing up to: $backupDir"

# Copy files with exclusions
Get-ChildItem -Path $sourcePath -Recurse | Where-Object {
    $item = $_
    $shouldExclude = $false
    foreach ($exclude in $excludeItems) {
        if ($item.FullName -like "*$exclude*") {
            $shouldExclude = $true
            break
        }
    }
    return !$shouldExclude
} | ForEach-Object {
    $relativePath = $_.FullName.Substring($sourcePath.Length + 1)
    $destPath = Join-Path $backupDir $relativePath
    
    if ($_.PSIsContainer) {
        # Create directory
        if (!(Test-Path $destPath)) {
            New-Item -ItemType Directory -Path $destPath -Force | Out-Null
        }
    } else {
        # Copy file
        $destDir = Split-Path $destPath -Parent
        if (!(Test-Path $destDir)) {
            New-Item -ItemType Directory -Path $destDir -Force | Out-Null
        }
        Copy-Item $_.FullName $destPath -Force
    }
}

Write-Host "Backup completed successfully!"
Write-Host "Backup location: $backupDir"
