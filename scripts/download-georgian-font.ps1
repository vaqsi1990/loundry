# Script to download Noto Sans Georgian font
$fontsDir = "public\fonts"
New-Item -ItemType Directory -Force -Path $fontsDir | Out-Null

$fontUrl = "https://github.com/google/fonts/raw/main/ofl/notosansgeorgian/NotoSansGeorgian-Regular.ttf"
$fontPath = "$fontsDir\NotoSansGeorgian-Regular.ttf"

Write-Host "Downloading Noto Sans Georgian font..."
try {
    $ProgressPreference = 'SilentlyContinue'
    Invoke-WebRequest -Uri $fontUrl -OutFile $fontPath -UseBasicParsing
    Write-Host "Font downloaded successfully to $fontPath"
} catch {
    Write-Host "Failed to download font. Please manually download from:"
    Write-Host "https://fonts.google.com/noto/specimen/Noto+Sans+Georgian"
    Write-Host "And place it in: $fontsDir\NotoSansGeorgian-Regular.ttf"
    exit 1
}

