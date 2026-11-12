# SmartVote Backend Auto-Start Setup Script
# Run this as Administrator

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  SmartVote Backend Auto-Start Setup" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Check if running as administrator
$isAdmin = ([Security.Principal.WindowsPrincipal] [Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)

if (-not $isAdmin) {
    Write-Host "⚠️  This script should be run as Administrator for best results." -ForegroundColor Yellow
    Write-Host "   Right-click PowerShell and select 'Run as Administrator'" -ForegroundColor Yellow
    Write-Host ""
}

# Get script directory
$backendPath = Split-Path -Parent $MyInvocation.MyCommand.Path

Write-Host "📁 Backend Path: $backendPath" -ForegroundColor Green
Write-Host ""

# Check if Node.js is installed
Write-Host "🔍 Checking Node.js installation..." -ForegroundColor Yellow
try {
    $nodeVersion = node --version
    Write-Host "✅ Node.js is installed: $nodeVersion" -ForegroundColor Green
} catch {
    Write-Host "❌ Node.js is not installed!" -ForegroundColor Red
    Write-Host "   Please install Node.js from: https://nodejs.org" -ForegroundColor Yellow
    pause
    exit
}
Write-Host ""

# Check if dist folder exists
if (-not (Test-Path "$backendPath\dist\server.js")) {
    Write-Host "⚠️  Compiled code not found. Compiling TypeScript..." -ForegroundColor Yellow
    Set-Location $backendPath
    npx tsc
    Write-Host "✅ TypeScript compiled successfully!" -ForegroundColor Green
}
Write-Host ""

# Ask user which method to use
Write-Host "Choose auto-start method:" -ForegroundColor Cyan
Write-Host "1. PM2 (Recommended - Easy to manage, auto-restart)" -ForegroundColor White
Write-Host "2. Windows Startup Folder (Simple - Starts on login)" -ForegroundColor White
Write-Host "3. Task Scheduler (Control when it starts)" -ForegroundColor White
Write-Host "4. Exit" -ForegroundColor White
Write-Host ""

$choice = Read-Host "Enter your choice (1-4)"

switch ($choice) {
    "1" {
        Write-Host ""
        Write-Host "📦 Setting up PM2..." -ForegroundColor Cyan
        
        # Check if PM2 is installed
        try {
            $pm2Version = pm2 --version
            Write-Host "✅ PM2 is already installed: $pm2Version" -ForegroundColor Green
        } catch {
            Write-Host "📥 Installing PM2..." -ForegroundColor Yellow
            npm install -g pm2
            npm install -g pm2-windows-startup
            Write-Host "✅ PM2 installed successfully!" -ForegroundColor Green
        }
        
        Write-Host ""
        Write-Host "🚀 Starting backend with PM2..." -ForegroundColor Yellow
        Set-Location $backendPath
        
        # Stop if already running
        pm2 delete smartvote-backend 2>$null
        
        # Start with PM2
        pm2 start ecosystem.config.js
        pm2 save
        
        Write-Host ""
        Write-Host "🔧 Setting up startup on boot..." -ForegroundColor Yellow
        pm2-startup install
        
        Write-Host ""
        Write-Host "✅ PM2 setup complete!" -ForegroundColor Green
        Write-Host ""
        Write-Host "Useful PM2 commands:" -ForegroundColor Cyan
        Write-Host "  pm2 list              - View all processes" -ForegroundColor White
        Write-Host "  pm2 logs              - View logs" -ForegroundColor White
        Write-Host "  pm2 restart all       - Restart server" -ForegroundColor White
        Write-Host "  pm2 stop all          - Stop server" -ForegroundColor White
        Write-Host "  pm2 monit             - Monitor dashboard" -ForegroundColor White
    }
    
    "2" {
        Write-Host ""
        Write-Host "📂 Setting up Windows Startup Folder..." -ForegroundColor Cyan
        
        $startupFolder = [Environment]::GetFolderPath('Startup')
        $shortcutPath = "$startupFolder\SmartVote Backend.lnk"
        $batPath = "$backendPath\start-backend.bat"
        $vbsPath = "$backendPath\start-backend-hidden.vbs"
        
        # Create shortcut
        $WshShell = New-Object -ComObject WScript.Shell
        $Shortcut = $WshShell.CreateShortcut($shortcutPath)
        $Shortcut.TargetPath = "wscript.exe"
        $Shortcut.Arguments = "`"$vbsPath`" `"$batPath`""
        $Shortcut.WorkingDirectory = $backendPath
        $Shortcut.Description = "SmartVote Backend Server"
        $Shortcut.Save()
        
        Write-Host "✅ Startup shortcut created!" -ForegroundColor Green
        Write-Host ""
        Write-Host "📍 Location: $shortcutPath" -ForegroundColor White
        Write-Host ""
        Write-Host "The backend will start automatically when you login to Windows." -ForegroundColor Yellow
        Write-Host ""
        Write-Host "To stop the server, run in PowerShell:" -ForegroundColor Cyan
        Write-Host "  Stop-Process -Name node -Force" -ForegroundColor White
    }
    
    "3" {
        Write-Host ""
        Write-Host "📅 Setting up Task Scheduler..." -ForegroundColor Cyan
        
        if (-not $isAdmin) {
            Write-Host "❌ Task Scheduler requires Administrator privileges!" -ForegroundColor Red
            Write-Host "   Please run this script as Administrator." -ForegroundColor Yellow
            pause
            exit
        }
        
        $taskName = "SmartVote Backend Server"
        $nodePath = (Get-Command node).Path
        
        # Remove existing task if it exists
        Unregister-ScheduledTask -TaskName $taskName -Confirm:$false -ErrorAction SilentlyContinue
        
        # Create new task
        $action = New-ScheduledTaskAction -Execute $nodePath -Argument "dist\server.js" -WorkingDirectory $backendPath
        $trigger = New-ScheduledTaskTrigger -AtLogOn
        $settings = New-ScheduledTaskSettingsSet -AllowStartIfOnBatteries -DontStopIfGoingOnBatteries -StartWhenAvailable
        $principal = New-ScheduledTaskPrincipal -UserId $env:USERNAME -LogonType Interactive -RunLevel Highest
        
        Register-ScheduledTask -TaskName $taskName -Action $action -Trigger $trigger -Settings $settings -Principal $principal
        
        Write-Host "✅ Task Scheduler setup complete!" -ForegroundColor Green
        Write-Host ""
        Write-Host "The backend will start automatically when you login to Windows." -ForegroundColor Yellow
        Write-Host ""
        Write-Host "To manage the task:" -ForegroundColor Cyan
        Write-Host "  1. Press Win+R and type: taskschd.msc" -ForegroundColor White
        Write-Host "  2. Find: $taskName" -ForegroundColor White
    }
    
    "4" {
        Write-Host "Exiting..." -ForegroundColor Yellow
        exit
    }
    
    default {
        Write-Host "❌ Invalid choice!" -ForegroundColor Red
        pause
        exit
    }
}

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  Testing Backend Server..." -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Wait for server to start
Start-Sleep -Seconds 3

# Test connection
try {
    $response = Invoke-RestMethod -Uri "http://localhost:3000/api/departments" -ErrorAction Stop
    Write-Host "✅ Backend is running successfully!" -ForegroundColor Green
    Write-Host ""
    Write-Host "🌐 API URL: http://localhost:3000/api" -ForegroundColor Cyan
    Write-Host ""
} catch {
    Write-Host "⚠️  Could not connect to backend yet." -ForegroundColor Yellow
    Write-Host "   The server might still be starting..." -ForegroundColor Yellow
    Write-Host "   Wait a few seconds and test: http://localhost:3000/api/departments" -ForegroundColor White
    Write-Host ""
}

# Show firewall instructions
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  Accessing from Phone/Other Devices" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

Write-Host "📱 To access from your phone:" -ForegroundColor Yellow
Write-Host ""
Write-Host "1. Find your computer's IP address:" -ForegroundColor White

$ipAddress = (Get-NetIPAddress -AddressFamily IPv4 | Where-Object {$_.InterfaceAlias -like "*Wi-Fi*" -or $_.InterfaceAlias -like "*Ethernet*"}).IPAddress | Select-Object -First 1

if ($ipAddress) {
    Write-Host "   Your IP: $ipAddress" -ForegroundColor Green
    Write-Host ""
    Write-Host "2. Update Flutter app config to use: http://${ipAddress}:3000/api" -ForegroundColor White
} else {
    Write-Host "   Run: ipconfig" -ForegroundColor White
    Write-Host "   Look for 'IPv4 Address'" -ForegroundColor White
}

Write-Host ""
Write-Host "3. Allow through Windows Firewall:" -ForegroundColor White
Write-Host "   Run as Admin: netsh advfirewall firewall add rule name=`"SmartVote Backend`" dir=in action=allow protocol=TCP localport=3000" -ForegroundColor Cyan

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "✅ Setup Complete!" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

pause
