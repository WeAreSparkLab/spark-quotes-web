# Simple icon generator using .NET System.Drawing
Add-Type -AssemblyName System.Drawing

$bgColor = [System.Drawing.Color]::FromArgb(102, 114, 231)  # Purple background
$accentColor = [System.Drawing.Color]::FromArgb(255, 215, 0)  # Gold accent
$white = [System.Drawing.Color]::White

function Create-Icon {
    param(
        [int]$Size,
        [bool]$IsMaskable = $false
    )
    
    $bitmap = New-Object System.Drawing.Bitmap($Size, $Size)
    $graphics = [System.Drawing.Graphics]::FromImage($bitmap)
    $graphics.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
    $graphics.TextRenderingHint = [System.Drawing.Text.TextRenderingHint]::AntiAlias
    
    # Background
    $graphics.Clear($bgColor)
    
    # Calculate sizes
    $padding = if ($IsMaskable) { $Size * 0.2 } else { $Size * 0.1 }
    $contentSize = $Size - ($padding * 2)
    $center = $Size / 2
    
    # Draw gradient circle
    $radius = $contentSize / 2
    $rect = New-Object System.Drawing.RectangleF(($center - $radius), ($center - $radius), ($radius * 2), ($radius * 2))
    $brush = New-Object System.Drawing.Drawing2D.LinearGradientBrush(
        $rect,
        [System.Drawing.Color]::FromArgb(80, 90, 220),
        [System.Drawing.Color]::FromArgb(120, 130, 240),
        45
    )
    $graphics.FillEllipse($brush, $rect)
    
    # Draw quotes
    $fontSize = $Size * 0.25
    $font = New-Object System.Drawing.Font("Georgia", $fontSize, [System.Drawing.FontStyle]::Bold)
    $stringFormat = New-Object System.Drawing.StringFormat
    $stringFormat.Alignment = [System.Drawing.StringAlignment]::Center
    $stringFormat.LineAlignment = [System.Drawing.StringAlignment]::Center
    
    $goldBrush = New-Object System.Drawing.SolidBrush($accentColor)
    
    # Left quote
    $quotePoint1 = New-Object System.Drawing.PointF(($Size * 0.3), ($Size * 0.4))
    $graphics.DrawString('"', $font, $goldBrush, $quotePoint1, $stringFormat)
    
    # Right quote
    $quotePoint2 = New-Object System.Drawing.PointF(($Size * 0.7), ($Size * 0.6))
    $graphics.DrawString('"', $font, $goldBrush, $quotePoint2, $stringFormat)
    
    # Draw small stars (simplified as circles)
    $starSize = $Size * 0.03
    $starBrush = New-Object System.Drawing.SolidBrush($accentColor)
    
    $offset = $contentSize * 0.35
    $graphics.FillEllipse($starBrush, ($center - $offset - $starSize), ($center - $offset - $starSize), ($starSize * 2), ($starSize * 2))
    $graphics.FillEllipse($starBrush, ($center + $offset - $starSize), ($center - $offset - $starSize), ($starSize * 2), ($starSize * 2))
    $graphics.FillEllipse($starBrush, ($center + $offset - $starSize), ($center + $offset - $starSize), ($starSize * 2), ($starSize * 2))
    
    # Cleanup
    $graphics.Dispose()
    $brush.Dispose()
    $font.Dispose()
    $goldBrush.Dispose()
    $starBrush.Dispose()
    
    return $bitmap
}

# Generate icons
$iconsDir = Join-Path $PSScriptRoot "public\icons"
if (!(Test-Path $iconsDir)) {
    New-Item -ItemType Directory -Path $iconsDir | Out-Null
}

$sizes = @(192, 512)
foreach ($size in $sizes) {
    # Regular icon
    $img = Create-Icon -Size $size -IsMaskable $false
    $path = Join-Path $iconsDir "icon-$size.png"
    $img.Save($path, [System.Drawing.Imaging.ImageFormat]::Png)
    $fileSize = [math]::Round((Get-Item $path).Length / 1KB)
    Write-Host "Generated icon-$size.png ($fileSize KB)" -ForegroundColor Green
    $img.Dispose()
    
    # Maskable icon
    $imgMaskable = Create-Icon -Size $size -IsMaskable $true
    $path = Join-Path $iconsDir "maskable-$size.png"
    $imgMaskable.Save($path, [System.Drawing.Imaging.ImageFormat]::Png)
    $fileSize = [math]::Round((Get-Item $path).Length / 1KB)
    Write-Host "Generated maskable-$size.png ($fileSize KB)" -ForegroundColor Green
    $imgMaskable.Dispose()
}

# Apple touch icon
$appleImg = Create-Icon -Size 180 -IsMaskable $false
$applePath = Join-Path $iconsDir "apple-touch-icon.png"
$appleImg.Save($applePath, [System.Drawing.Imaging.ImageFormat]::Png)
$fileSize = [math]::Round((Get-Item $applePath).Length / 1KB)
Write-Host "Generated apple-touch-icon.png ($fileSize KB)" -ForegroundColor Green
$appleImg.Dispose()

Write-Host "`nAll icons generated successfully!" -ForegroundColor Cyan
