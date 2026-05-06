# Script to download Noto Sans Georgian font (TTF)
$fontsDir = "public\fonts"
New-Item -ItemType Directory -Force -Path $fontsDir | Out-Null

$fontUrl = "https://raw.githubusercontent.com/google/fonts/main/ofl/notosansgeorgian/NotoSansGeorgian%5Bwdth%2Cwght%5D.ttf"
$fontPath = "$fontsDir\NotoSansGeorgian.ttf"

Write-Host "Downloading Noto Sans Georgian font..."
try {
    $ProgressPreference = 'SilentlyContinue'
    [Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12
    Invoke-WebRequest -Uri $fontUrl -OutFile $fontPath -UseBasicParsing
    Write-Host "Font downloaded successfully to $fontPath"
} catch {
    Write-Host "Failed to download font. Please manually download from:"
    Write-Host "https://fonts.google.com/noto/specimen/Noto+Sans+Georgian"
    Write-Host "And place it in: $fontsDir\NotoSansGeorgian.ttf"
    exit 1
}

