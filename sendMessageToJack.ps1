# filepath: C:\Users\osmirnov\Documents\projects\sendMessageToJack.ps1
<#
.SYNOPSIS
    Opens Facebook Messenger and sends a message to a specific conversation.

.DESCRIPTION
    This script automates the process of opening a Facebook Messenger conversation in Chrome,
    and sending a message to Jack. It uses SendKeys to simulate keyboard input.

.PARAMETER Message
    The message to send. Defaults to "Hey Jack!".

.PARAMETER ChromePath
    The file path to the Google Chrome executable. Defaults to standard installation paths.

.PARAMETER MessengerUrl
    The Facebook Messenger conversation URL. Defaults to the specified e2ee conversation.

.EXAMPLE
    .\sendMessageToJack.ps1 -Message "How are you doing?"

.EXAMPLE
    .\sendMessageToJack.ps1

.NOTES
    Requires Google Chrome to be installed.
    Requires being logged into Facebook.
    Relies on SendKeys, so the computer should not be used while the script is running.
#>
param(
    [string]$Message = "Hey Jack!",
    [string]$ChromePath = "C:\Program Files\Google\Chrome\Application\chrome.exe",
    [string]$MessengerUrl = "https://www.facebook.com/messages/e2ee/t/6623316171125603/"
)

# Start Chrome with Messenger URL
Write-Host "Opening Facebook Messenger..." -ForegroundColor Green
Start-Process -FilePath $ChromePath -ArgumentList $MessengerUrl

# Wait for page to load
Write-Host "Waiting for page to load..." -ForegroundColor Yellow
Start-Sleep -Seconds 6

# Load Windows Forms for SendKeys
Add-Type -AssemblyName System.Windows.Forms

# Activate Chrome window
$wshell = New-Object -ComObject wscript.shell
Start-Sleep -Seconds 2
$wshell.AppActivate("Chrome")
Start-Sleep -Seconds 2

# Click in the message input field and type the message
Write-Host "Typing message: '$Message'" -ForegroundColor Green
[System.Windows.Forms.SendKeys]::SendWait($Message)
Start-Sleep -Seconds 1

# Press Enter to send
Write-Host "Sending message..." -ForegroundColor Green
[System.Windows.Forms.SendKeys]::SendWait("{ENTER}")

Write-Host "`nMessage sent successfully!" -ForegroundColor Cyan