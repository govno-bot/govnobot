# GovnoBot - Telegram Bot for ultimate vibecoding experience.
# Experimental project
# Version: 2.4.6
#
# Changelog v2.4.6 (2026-01-08):
# - 🎯 Turn-based controls: Buttons disabled when not player's turn; player X cannot move for O
# - 💾 State persistence: TTT game state saved to JSON files to survive crashes/restarts
# - 🔄 Cron-ready: State loads/saves automatically on each poll cycle (NoLoop compatible)
# - 🎮 Win/draw messages: Both players now receive final game result properly
#
# Changelog v2.4.5 (2026-01-08):
# - 🎮 Tic-Tac-Toe: Global game list (array) with simple Join/New flow
# - 👥 Cross-chat PvP: Players can join from their own chats; both sides receive edits
# - 🧭 Simpler UX: Show Join button if a free game exists, otherwise New Game
# - 🧹 Removed group-chat requirement hints; per-player message tracking added
# - 🔧 UTF-8 Fix: Replaced emoji literals with Unicode escape sequences to prevent encoding issues
#
# Changelog v2.4.3 (2026-01-08):
# - 🩹 Robustness: Guard edit-in-place with runtime check; fallback to send to avoid errors if function isn’t loaded in a running instance
# - ✨ UX: /ttt now edits the existing board message when possible (no extra duplicates)
#
# Changelog v2.4.2 (2026-01-08):
# - 🧹 Tic-Tac-Toe: Edit-in-place board updates via `editMessageText` (reduced spam)
# - 🧭 Cleaner UX: Reuse mode-selection message for the first board render
# - 🧨 Quit flow: Edits last board to "Game ended" instead of posting a new message
# - 🔧 Internal: Track per-chat `messageId` to synchronize updates for all players
#
# Changelog v2.4.1 (2026-01-07):
# - 🎮 Feature: Added Tic-Tac-Toe `/ttt` with PvP/AI modes, inline keyboards, and callback handling
# - 🧾 Admin audit log: Persistent `admin_audit.log` entries for privileged commands
# - 🛡️ /sh hardening: Strict whitelist, alias mapping, and metacharacter blocking
# - 🔐 /jack sanitization: Safe parameterized invocation via `sendMessageToJack.ps1`
# - 🔧 Minor improvements: Help text updates and callback response resilience
#
# Changelog v2.3.1 (2026-01-05):
# - 🛡️ Security fix: Prevented admin check output leakage causing unauthorized execution of admin commands
# - ✅ Suppressed Send-TelegramMessage output in RestrictToAdmin to ensure clean boolean return
# - 🔄 Applied equivalent hardening to Node.js version (`govnobot.js`)
#
# Changelog v2.3.0 (2026-01-01):
# - Added "NoLoop" flag, so the script is possible to call by cron/scheduler
# Changelog v2.2.6 (2025-12-31):
# - Restrict all potentialy harmful commands to be accesseble by Admin only
# Changelog v2.2.5 (2025-12-31):
# - ✅ Fixed govnodeploy.ps1 path resolution issues
# - ✅ Improved script root detection with PSScriptRoot fallback
# - ✅ Added absolute path conversion for log and backup directories
# - ✅ Enhanced null safety for path parameters
# - ✅ Created comprehensive feedback improvement suggestions document
#
# Changelog v2.2.4 (2025-12-31):
# - ✅ Code refactoring and optimization
# - ✅ Improved error handling and logging
# - ✅ Performance improvements
# - ✅ Documentation updates
#
# Changelog v2.2.3 (2025-12-31):
# - ✅ Added /jack command for sending messages to Facebook Messenger
# - ✅ Integrated sendMessageToJack.ps1 automation script
# - ✅ Fixed /ask command enhancentPrompt issue
# - ✅ Env variable renamed
#
# Changelog v2.2.2 (2025-12-31):
# - ✅ Added GitHub agent-task command support (primary AI fallback)
# - ✅ Updated fallback chain: agent-task → Copilot CLI → OpenAI API → Ollama
# - ✅ Better integration with GitHub's preview agent capabilities
# - ✅ Improved error handling for GitHub CLI operations
#
# Changelog v2.2.1 (2025-12-31):
# - ✅ Updated to GitHub Copilot CLI (deprecated gh copilot extension removed)
# - ✅ Added fallback chain: copilot CLI → legacy gh-copilot → OpenAI API → Ollama
# - ✅ Improved error messages with installation links
# - ✅ Better detection of copilot command availability
#
# Changelog v2.2.0 (2025-12-31):
# - ✅ Added conversation history per user (in-memory and file-based persistence)
# - ✅ Implemented custom system prompts per user (/settings command)
# - ✅ Added /history command to review conversation context
# - ✅ Implemented response caching to reduce API calls
# - ✅ Added /model command to switch between AI models
# - ✅ Integrated conversation context into /ask and /fix commands
# - ✅ Improved prompt formatting with history context
# - ✅ Added persistent user settings storage
#
# Changelog v2.1.0 (2025-12-31):
# - ✅ Enhanced NoLamma mode with multi-tier AI fallback system
# - ✅ Added GitHub Copilot CLI integration (primary fallback)
# - ✅ Added OpenAI API integration (secondary fallback)
# - ✅ Created Invoke-AI-Fallback helper function for code reuse
# - ✅ All /ask, /fix, /agent commands now return actual responses in NoLamma mode
# - ✅ Improved error handling with clear user guidance
#
# Changelog v2.0.0 (2025-12-31):
# - Implemented /fix command for debugging and error analysis
# - Implemented /agent command for complex multi-step tasks
# - Added real-time statistics tracking (commands, prompts, uptime)
# - Improved admin security with AdminUsers list
# - Added message chunking for Telegram's 4096 character limit
# - Enhanced error handling with exponential backoff
# - Added /ping command for responsiveness testing
# - Added /status command for bot health monitoring
# - Added /version command with detailed version info
# - Improved logging with structure
# - Added Ollama connection test at startup
# - Better help text with structure

param(
    [string]$BotToken = $env:TELEGRAM_GOVNOBOT_TOKEN,
    [string]$BotAdminUserName = $env:TELEGRAM_GOVNOBOT_ADMIN_USERNAME,
    [int]$BotAdminChatId = $env:TELEGRAM_GOVNOBOT_ADMIN_CHATID,
    [int]$PollInterval = 30,
    [switch]$NoLamma,
    [switch]$NoLoop,
    [switch]$Debug
)

# Version info
$script:Version = "2.4.6"
$script:VersionDate = "2026-01-08"

# Configuration
$script:LastUpdateId = 0
# Emojis map for encoding-safe usage
$script:E = @{
    Game = [char]::ConvertFromUtf32(0x1F3AE)
    Bot = [char]::ConvertFromUtf32(0x1F916)
    Tile = [char]0x2B1C
    X = [char]0x274C
    Refresh = [char]::ConvertFromUtf32(0x1F504)
    Plus = [char]0x2795
    Handshake = [char]::ConvertFromUtf32(0x1F91D)
    Tada = [char]::ConvertFromUtf32(0x1F389)
    Users = [char]::ConvertFromUtf32(0x1F465)
    Hourglass = [char]0x23F3
    Gear = [char]0x2699
    NoEntry = [char]::ConvertFromUtf32(0x1F6AB)
    Warn = [char]0x26A0
}

# Persistence paths
$script:DataDirectory = Join-Path $PSScriptRoot "govnobot_data"
$script:HistoryDirectory = Join-Path $script:DataDirectory "history"
$script:SettingsDirectory = Join-Path $script:DataDirectory "settings"
$script:CacheDirectory = Join-Path $script:DataDirectory "cache"

# Create data directories if they don't exist
if (-not (Test-Path $script:DataDirectory)) {
    New-Item -ItemType Directory -Path $script:DataDirectory -Force | Out-Null
    New-Item -ItemType Directory -Path $script:HistoryDirectory -Force | Out-Null
    New-Item -ItemType Directory -Path $script:SettingsDirectory -Force | Out-Null
    New-Item -ItemType Directory -Path $script:CacheDirectory -Force | Out-Null
}

# Load Tic-Tac-Toe subsystem
$tttModulePath = Join-Path $PSScriptRoot "tickTackToe.prompt.ps1"
if (Test-Path $tttModulePath) { 
    $content = Get-Content $tttModulePath -Encoding UTF8 -Raw
    Invoke-Expression $content
    # Load persisted game state
    $null = Load-TicTacToeState
}

# Statistics
$script:Stats = @{
    TotalPrompts = 0
    TotalCommands = 0
    CommandCounts = @{}
    StartTime = Get-Date
    LastActivity = Get-Date
}

# In-memory conversation history cache
$script:ConversationHistory = @{}

# In-memory user settings cache
$script:UserSettings = @{}

# Rate limiting per user (chat_id -> @{ count, resetTime })
$script:RateLimits = @{}
$script:RateLimitConfig = @{
    requestsPerMinute = 10
    requestsPerHour = 100
}
# Load bot token from environment or use default (NOT RECOMMENDED for production)
if (-not $BotToken) {
   Write-Error "TELEGRAM_GOVNOBOT_TOKEN is not set. Please set it (recommended) or pass -BotToken explicitly."
   exit 1
}

$script:BaseUrl = "https://api.telegram.org/bot$BotToken"

function Write-Log {
    param([string]$Message, [string]$Level = "INFO")
    $timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
    $logMessage = "[$timestamp] [$Level] $Message"
    Write-Host $logMessage
    if ($Debug) {
        Add-Content -Path "govnobot.log" -Value $logMessage
    }
}

function Get-HistoryFile {
    param(
        [Parameter(Mandatory=$true)]
        [long]$ChatId
    )
    return Join-Path $script:HistoryDirectory "$ChatId.json"
}

function Get-SettingsFile {
    param(
        [Parameter(Mandatory=$true)]
        [long]$ChatId
    )
    return Join-Path $script:SettingsDirectory "$ChatId.json"
}

function Get-ConversationHistory {
    param(
        [Parameter(Mandatory=$true)]
        [long]$ChatId,
        [int]$Limit = 10
    )
    
    # Try in-memory cache first
    if ($script:ConversationHistory.ContainsKey($ChatId)) {
        $history = $script:ConversationHistory[$ChatId]
        return @($history | Select-Object -Last $Limit)
    }
    
    # Load from file
    $historyFile = Get-HistoryFile -ChatId $ChatId
    if (Test-Path $historyFile) {
        try {
            $history = Get-Content -Path $historyFile | ConvertFrom-Json
            if ($history) {
                $script:ConversationHistory[$ChatId] = @($history)
                return @($history | Select-Object -Last $Limit)
            }
        }
        catch {
            Write-Log "Failed to load history for chat $ChatId : $_" "WARN"
        }
    }
    
    return @()
}

function Add-ToHistory {
    param(
        [Parameter(Mandatory=$true)]
        [long]$ChatId,
        [Parameter(Mandatory=$true)]
        [string]$Role,
        [Parameter(Mandatory=$true)]
        [string]$Content
    )
    
    $historyEntry = @{
        timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
        role = $Role
        content = $Content
    }
    
    # Update in-memory cache
    if (-not $script:ConversationHistory.ContainsKey($ChatId)) {
        $script:ConversationHistory[$ChatId] = @()
    }
    
    $script:ConversationHistory[$ChatId] += $historyEntry
    
    # Keep max 100 entries per chat
    if ($script:ConversationHistory[$ChatId].Count -gt 100) {
        $script:ConversationHistory[$ChatId] = @($script:ConversationHistory[$ChatId] | Select-Object -Last 100)
    }
    
    # Persist to file
    $historyFile = Get-HistoryFile -ChatId $ChatId
    try {
        $script:ConversationHistory[$ChatId] | ConvertTo-Json | Set-Content -Path $historyFile -Force
    }
    catch {
        Write-Log "Failed to save history for chat $ChatId : $_" "WARN"
    }
}

function Get-UserSettings {
    param(
        [Parameter(Mandatory=$true)]
        [long]$ChatId
    )
    
    # Try in-memory cache first
    if ($script:UserSettings.ContainsKey($ChatId)) {
        return $script:UserSettings[$ChatId]
    }
    
    # Load from file
    $settingsFile = Get-SettingsFile -ChatId $ChatId
    if (Test-Path $settingsFile) {
        try {
            $settings = Get-Content -Path $settingsFile | ConvertFrom-Json | ConvertPSObjectToHashtable
            $script:UserSettings[$ChatId] = $settings
            return $settings
        }
        catch {
            Write-Log "Failed to load settings for chat $ChatId : $_" "WARN"
        }
    }
    
    # Return defaults
    $defaults = @{
        model = $script:OllamaModel
        systemPrompt = "You are a helpful assistant."
        maxHistoryContext = 5
    }
    
    $script:UserSettings[$ChatId] = $defaults
    return $defaults
}

function Save-UserSettings {
    param(
        [Parameter(Mandatory=$true)]
        [long]$ChatId,
        [Parameter(Mandatory=$true)]
        [hashtable]$Settings
    )
    
    # Update cache
    $script:UserSettings[$ChatId] = $Settings
    
    # Persist to file
    $settingsFile = Get-SettingsFile -ChatId $ChatId
    try {
        $Settings | ConvertTo-Json | Set-Content -Path $settingsFile -Force
    }
    catch {
        Write-Log "Failed to save settings for chat $ChatId : $_" "WARN"
    }
}

function ConvertPSObjectToHashtable {
    param($Object)
    
    $hash = @{}
    foreach ($prop in $Object.PSObject.Properties) {
        $hash[$prop.Name] = $prop.Value
    }
    return $hash
}

function Check-RateLimit {
    param(
        [Parameter(Mandatory=$true)]
        [long]$ChatId
    )
    
    $now = Get-Date
    
    # Initialize if needed
    if (-not $script:RateLimits.ContainsKey($ChatId)) {
        $script:RateLimits[$ChatId] = @{
            minuteCount = 0
            minuteResetTime = $now.AddMinutes(1)
            hourCount = 0
            hourResetTime = $now.AddHours(1)
        }
    }
    
    $limit = $script:RateLimits[$ChatId]
    
    # Reset minute counter if needed
    if ($now -gt $limit.minuteResetTime) {
        $limit.minuteCount = 0
        $limit.minuteResetTime = $now.AddMinutes(1)
    }
    
    # Reset hour counter if needed
    if ($now -gt $limit.hourResetTime) {
        $limit.hourCount = 0
        $limit.hourResetTime = $now.AddHours(1)
    }
    
    # Check limits
    if ($limit.minuteCount -ge $script:RateLimitConfig.requestsPerMinute) {
        return @{
            allowed = $false
            reason = "Minute limit exceeded"
            resetIn = ($limit.minuteResetTime - $now).TotalSeconds
        }
    }
    
    if ($limit.hourCount -ge $script:RateLimitConfig.requestsPerHour) {
        return @{
            allowed = $false
            reason = "Hour limit exceeded"
            resetIn = ($limit.hourResetTime - $now).TotalSeconds
        }
    }
    
    # Increment counters
    $limit.minuteCount++
    $limit.hourCount++
    
    return @{ allowed = $true }
}

function Get-CachedResponse {
    param(
        [Parameter(Mandatory=$true)]
        [string]$Prompt,
        [Parameter(Mandatory=$true)]
        [string]$Model
    )
    
    $hash = [System.Security.Cryptography.MD5]::Create().ComputeHash([System.Text.Encoding]::UTF8.GetBytes("$Model|$Prompt"))
    $cacheKey = [System.BitConverter]::ToString($hash).Replace("-", "").Substring(0, 16)
    $cacheFile = Join-Path $script:CacheDirectory "$cacheKey.cache"
    
    if (Test-Path $cacheFile) {
        try {
            $cached = Get-Content -Path $cacheFile | ConvertFrom-Json
            # Cache valid for 24 hours
            $cacheAge = (Get-Date) - [datetime]$cached.timestamp
            if ($cacheAge.TotalHours -lt 24) {
                Write-Log "Cache hit for prompt hash $cacheKey" "DEBUG"
                return $cached.response
            }
        }
        catch {
            Write-Log "Failed to read cache: $_" "WARN"
        }
    }
    
    return $null
}

function Save-CachedResponse {
    param(
        [Parameter(Mandatory=$true)]
        [string]$Prompt,
        [Parameter(Mandatory=$true)]
        [string]$Model,
        [Parameter(Mandatory=$true)]
        [string]$Response
    )
    
    $hash = [System.Security.Cryptography.MD5]::Create().ComputeHash([System.Text.Encoding]::UTF8.GetBytes("$Model|$Prompt"))
    $cacheKey = [System.BitConverter]::ToString($hash).Replace("-", "").Substring(0, 16)
    $cacheFile = Join-Path $script:CacheDirectory "$cacheKey.cache"
    
    try {
        $cacheEntry = @{
            timestamp = (Get-Date).ToString("yyyy-MM-dd HH:mm:ss")
            response = $Response
        }
        $cacheEntry | ConvertTo-Json | Set-Content -Path $cacheFile -Force
        Write-Log "Cached response with hash $cacheKey" "DEBUG"
    }
    catch {
        Write-Log "Failed to save cache: $_" "WARN"
    }
}

function Send-TelegramMessage {
    param(
        [Parameter(Mandatory=$true)]
        [long]$ChatId,
        [Parameter(Mandatory=$true)]
        [string]$Text,
        [string]$ParseMode = "Markdown",
        [object]$ReplyMarkup = $null
    )
    
    try {
        # Telegram message limit is 4096 characters
        $maxLength = 4000  # Leave some buffer
        
        if ($Text.Length -gt $maxLength) {
            # Split message into chunks
            $chunks = @()
            $currentPos = 0
            
            while ($currentPos -lt $Text.Length) {
                $chunkLength = [Math]::Min($maxLength, $Text.Length - $currentPos)
                $chunk = $Text.Substring($currentPos, $chunkLength)
                $chunks += $chunk
                $currentPos += $chunkLength
            }
            
            # Send chunks sequentially
            foreach ($chunk in $chunks) {
                $body = @{
                    chat_id = $ChatId
                    text = $chunk
                    parse_mode = $ParseMode
                }
                
                $jsonBody = $body | ConvertTo-Json -Depth 10
                
                $response = Invoke-RestMethod -Uri "$script:BaseUrl/sendMessage" `
                    -Method Post `
                    -ContentType "application/json; charset=utf-8" `
                    -Body $jsonBody
                
                Start-Sleep -Milliseconds 500  # Rate limiting
            }
            
            return $response
        }
        
        $body = @{
            chat_id = $ChatId
            text = $Text
            parse_mode = $ParseMode
        }
        
        if ($ReplyMarkup) {
            $body.reply_markup = $ReplyMarkup
        }
        
        $jsonBody = $body | ConvertTo-Json -Depth 10
        
        $response = Invoke-RestMethod -Uri "$script:BaseUrl/sendMessage" `
            -Method Post `
            -ContentType "application/json; charset=utf-8" `
            -Body $jsonBody
        
        return $response
    }
    catch {
        Write-Log "Failed to send message: $_" "ERROR"
        return $null
    }
}

function Get-TelegramUpdates {
    param([int]$Offset = 0)
    
    try {
        $url = "$script:BaseUrl/getUpdates?offset=$Offset&timeout=90"
        $response = Invoke-RestMethod -Uri $url -Method Get
        return $response
    }
    catch {
        Write-Log "Failed to get updates: $_" "ERROR"
        return $null
    }
}

function Invoke-Ollama {
    param(
        [Parameter(Mandatory=$true)]
        [string]$Prompt,
        [string]$SystemPrompt = "",
        [string]$Model = $script:OllamaModel
    )
    
    try {
        $body = @{
            model = $Model
            prompt = $Prompt
            stream = $false
        }
        
        if ($SystemPrompt) {
            $body.system = $SystemPrompt
        }
        
        $jsonBody = $body | ConvertTo-Json
        Write-Log "Calling Ollama with model '$Model' and prompt: $($Prompt.Substring(0, [Math]::Min(50, $Prompt.Length)))..." "DEBUG"
        
        $response = Invoke-RestMethod -Uri $script:OllamaUrl `
            -Method Post `
            -ContentType "application/json" `
            -Body $jsonBody `
            -TimeoutSec 120
        
        return $response.response
    }
    catch {
        Write-Log "Failed to call Ollama: $_" "ERROR"
        return $null
    }
}

function RestrictToAdmin {
    param (
        [Parameter(Mandatory=$true)]
        $Message
    )
    
    $username = $Message.from.username
    $chatId = [long]$Message.chat.id

    # Normalize for comparison
    $adminUserConfigured = -not [string]::IsNullOrWhiteSpace($BotAdminUserName)
    $adminChatConfigured = $BotAdminChatId -ne $null -and $BotAdminChatId -ne 0

    $isAdminByUser = $false
    $isAdminByChat = $false

    if ($adminUserConfigured -and $username) {
        $isAdminByUser = ($BotAdminUserName.ToLower() -eq $username.ToLower())
    }
    if ($adminChatConfigured) {
        $isAdminByChat = ($BotAdminChatId -eq $chatId)
    }

    # Grant admin only when configured criteria match
    if ($adminUserConfigured -and $adminChatConfigured) {
        if ($isAdminByUser -and $isAdminByChat) {
            Write-Log "Admin access granted for @$username (chat: $chatId)" "INFO"
            return $true
        }
    } elseif ($adminUserConfigured) {
        if ($isAdminByUser) {
            Write-Log "Admin access granted for @$username (chat: $chatId)" "INFO"
            return $true
        }
    } elseif ($adminChatConfigured) {
        if ($isAdminByChat) {
            Write-Log "Admin access granted for @$username (chat: $chatId)" "INFO"
            return $true
        }
    }

    # If no admin is configured at all, deny by default for safety
    if (-not $adminUserConfigured -and -not $adminChatConfigured) {
        Write-Log "Admin restrictions active but no admin configured; denying access for @$username (chat: $chatId)" "WARN"
    } else {
        Write-Log "Access denied for @$username (chat: $chatId)" "WARN"
    }

    # IMPORTANT: suppress function output from Send-TelegramMessage to avoid
    # leaking pipeline output that would make callers see a non-empty array
    # and incorrectly treat admin check as passed.
    $null = Send-TelegramMessage -ChatId $chatId -Text "⛔ Access denied. This command is restricted to administrators."
    return $false
}

function Invoke-Shell-Command {
    param (
        [Parameter(Mandatory=$true)]
        $ShellCommand
    )
    try {
        Write-Log "Executing shell command: $ShellCommand" "DEBUG"
        if (-not (Validate-AdminCommand -Command $ShellCommand)) {
            Write-Log "Blocked disallowed admin command: $ShellCommand" "WARN"
            return "⚠️ Command not allowed. Use permitted admin commands only."
        }
        
        $output = Invoke-Expression $ShellCommand 2>&1 | Out-String
        
        if ($LASTEXITCODE -ne 0 -and $LASTEXITCODE -ne $null) {
            Write-Log "Command failed with exit code: $LASTEXITCODE" "WARN"
        }
        
        return $output
    }
    catch {
        Write-Log "Shell command execution failed: $_" "ERROR"
        return "Error executing command: $_"
    }
}

function Validate-AdminCommand {
    param([Parameter(Mandatory=$true)][string]$Command)
    # Disallow dangerous metacharacters
    $disallowed = @('`', ';', '|', '&&', '&', '>', '<')
    foreach ($sym in $disallowed) {
        if ($Command -like "*${sym}*") { return $false }
    }

    $token = ($Command.Trim() -split '\s+')[0]
    $allowed = @(
        'Get-Process', 'Get-Service', 'Get-ChildItem', 'Get-Item',
        'Get-Content', 'Test-Path', 'whoami', 'hostname', 'ipconfig'
    )

    # Map common aliases
    switch ($token.ToLower()) {
        'dir' { $token = 'Get-ChildItem' }
        'ls'  { $token = 'Get-ChildItem' }
        'cat' { $token = 'Get-Content' }
        default { }
    }

    return $allowed -contains $token
}

function Log-AdminAction {
    param(
        [Parameter(Mandatory=$true)][string]$Username,
        [Parameter(Mandatory=$true)][long]$ChatId,
        [Parameter(Mandatory=$true)][string]$Command
    )
    try {
        $auditFile = Join-Path $script:DataDirectory "admin_audit.log"
        $timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
        $entry = "[$timestamp] @$Username ($ChatId): $Command"
        Add-Content -Path $auditFile -Value $entry
    }
    catch {
        Write-Log "Failed to write admin audit entry: $_" "WARN"
    }
}

function Invoke-AI-Fallback {
    param(
        [Parameter(Mandatory=$true)]
        [string]$Prompt,
        [string]$SystemPrompt = "You are a helpful assistant.",
        [long]$ChatId
    )
    
    Write-Log "Using NoLamma fallback AI methods for prompt"
    $shellCommand = "code chat '" + $Prompt + "'"    
    $reuslt = Invoke-Shell-Command -ShellCommand $shellCommand
    Send-TelegramMessage -ChatId $ChatId -Text "Command is executed. Probably."
    if ($reuslt) {
        return @{
            success = $true
            message = "Command is executed. Probably."
        }    
    }
    # No fallback worked
    return @{ 
        success = $false
        message = "❌ No AI backend available in NoLamma mode.`n`n" +
            "**Available options:**`n" +
            "1. Update GitHub CLI: ``gh agent-task create <task>``` (recommended)`n" +
            "2. Install GitHub Copilot CLI: https://github.com/github/copilot-cli`n" +
            "3. Set environment variable: ``OPENAI_API_KEY=sk-...```n" +
            "4. Run bot without ``-NoLamma`` flag to use local Ollama`n`n" +
            "_Note: Older ``gh copilot`` extensions have been deprecated._"
    }
}

function Invoke-Telegram-Command {
    param(
        [Parameter(Mandatory=$true)]
        $Message
    )
    
    $chatId = $Message.chat.id
    $text = $Message.text
    $username = $Message.from.username
    
    Write-Log "Processing command '$text' from @$username (chat: $chatId)"
    
    # Update statistics
    $script:Stats.TotalCommands++
    $script:Stats.LastActivity = Get-Date
    
    # Extract command name for stats
    if ($text -match '^/([a-zA-Z]+)') {
        $commandName = $matches[1]
        if (-not $script:Stats.CommandCounts.ContainsKey($commandName)) {
            $script:Stats.CommandCounts[$commandName] = 0
        }
        $script:Stats.CommandCounts[$commandName]++
    }

    $avaliableCommandsText = "**Available Commands:**`n`n" +
        "/ask [question] - Ask AI a question (admin)`n" +
        "/fix [error/code] - Debug and fix issues (admin)`n" +
        "/chain [steps] - Multi-step AI pipeline (admin)`n" +
        "/agent [task] - Complex task execution (admin)`n" +
        "/ping - Check bot responsiveness`n" +
        "/time - Current server time`n" +
        "/stats - Bot statistics`n" +
        "/status - Bot health status`n" +
        "/history [n] - Show last n messages (default: 5)`n" +
        "/model [name] - Switch AI model (llama2, mistral, neural-chat)`n" +
        "/settings - Show your settings`n" +
        "/ttt - Play Tic-Tac-Toe`n" +
        "/sh [command] - Execute shell command (admin)`n" +
        "/jack [text] - Sends a message to Jack via Facebook (admin)`n" +
        "/dev - Self-improvement mode (admin)`n" +
        "/version - Bot version info`n" +
        "/help - Detailed help`n`n" +
        "_This bot is experimental and may behave unpredictably._"

    switch -Regex ($text) {
        "^/start" {
            $welcomeText = "🤖 **Welcome to GovnoBot**`n`n" +
                "Your experimental vibecoding assistant powered by AI.`n`n" +
                "⚠️ _This is an experimental system - no guarantees of stability or accuracy._`n`n" +
                $avaliableCommandsText
            Send-TelegramMessage -ChatId $chatId -Text $welcomeText
        }
        
        "^/version" {
            $versionText = "🤖 **GovnoBot v$script:Version**`n`n" +
                "📅 Release Date: $script:VersionDate`n" +
                "🧠 AI Model: $script:OllamaModel`n" +
                "🔗 Ollama URL: $script:OllamaUrl`n`n" +
                "**Recent Updates:**`n" +
                "• ✅ Implemented /fix command for debugging`n" +
                "• ✅ Implemented /agent mode for complex tasks`n" +
                "• ✅ Added real-time statistics tracking`n" +
                "• ✅ Improved admin security`n" +
                "• ✅ Added message chunking for long responses`n`n" +
                "_Built by AI, for AI_"
            Send-TelegramMessage -ChatId $chatId -Text $versionText
        }
        
        "^/help" {
            $helpText = "🤖 **GovnoBot Help**`n`n" +
                "This bot implements an experimental 'Hive AI' concept:`n" +
                "• Questions are processed by LLMs with different moods`n" +
                "• Can integrate with local Ollama or VS Code Copilot`n" +
                "• Admin commands for system control`n" +
                "• Self-improvement capabilities via /dev`n`n" +
                $avaliableCommandsText + "`n`n" +
                "💡 **Tips:**`n" +
                "• Be specific in your questions for better answers`n" +
                "• /fix works best with error messages or code snippets`n" +
                "• /agent mode is powerful but admin-only`n`n" +
                "For more info, check the source code!"
            Send-TelegramMessage -ChatId $chatId -Text $helpText
        }
        
        "^/time" {
            $currentTime = Get-Date -Format "yyyy-MM-dd HH:mm:ss (UTC K)"
            $localTime = Get-Date -Format "HH:mm:ss"
            $timeText = "🕐 **Current Time**`n`n" +
                "Local: $localTime`n" +
                "Full: $currentTime"
            Send-TelegramMessage -ChatId $chatId -Text $timeText
        }
        
        "^/ping" {
            $startTime = Get-Date
            $pingText = "🏓 Pong! Bot is responsive."
            $response = Send-TelegramMessage -ChatId $chatId -Text $pingText
            
            if ($response) {
                $endTime = Get-Date
                $latency = ($endTime - $startTime).TotalMilliseconds
                Write-Log "Ping latency: $([math]::Round($latency, 2))ms" "DEBUG"
            }
        }
        
        "^/status" {
            $uptime = (Get-Date) - $script:Stats.StartTime
            $uptimeStr = "{0:dd}d {0:hh}h {0:mm}m" -f $uptime
            if ($NoLoop) {
                $uptimeStr = 'N/A NoLoop flag is set'
            }
            # Check Ollama status
            $ollamaStatus = "❌ Not connected"
            if (-not $NoLamma) {
                try {
                    $testBody = @{
                        model = $script:OllamaModel
                        prompt = "test"
                        stream = $false
                    } | ConvertTo-Json
                    
                    $null = Invoke-RestMethod -Uri $script:OllamaUrl `
                        -Method Post `
                        -ContentType "application/json" `
                        -Body $testBody `
                        -TimeoutSec 3 `
                        -ErrorAction Stop
                    
                    $ollamaStatus = "✅ Connected"
                }
                catch {
                    $ollamaStatus = "⚠️ Unavailable (using VS Code fallback)"
                }
            } else {
                $ollamaStatus = "🚫 Disabled (NoLamma mode)"
            }
            
            $statusText = "🤖 **Bot Status**`n`n" +
                "⏱️ Uptime: $uptimeStr`n" +
                "🧠 AI Backend: $ollamaStatus`n" +
                "📝 Commands Processed: $($script:Stats.TotalCommands)`n" +
                "🎯 Last Update ID: $script:LastUpdateId`n" +
                "⏲️ Poll Interval: $($PollInterval)s`n`n" +
                "_All systems operational_ ✅"
            
            Send-TelegramMessage -ChatId $chatId -Text $statusText
        }
        
        "^/ttt" {
            $tttArg = $text -replace "^/ttt\s*", ""
            $userId = [long]$Message.from.id
            $userName = $Message.from.username

            # If user has an active game, show it
            $existing = Find-UserActiveGame -UserId $userId
            if (-not $tttArg) {
                if ($existing -and -not $existing.gameOver) {
                    $boardText = Format-TicTacToeBoard -Board $existing.board
                    $kb = Get-TicTacToeKeyboard -Board $existing.board -GameOver $false -Game $existing
                    $curLabel = $existing.currentPlayer
                    if ($existing.mode -eq 'pvp') {
                        if ($curLabel -eq 'X' -and $existing.XUserName) { $curLabel = "X (@$($existing.XUserName))" }
                        if ($curLabel -eq 'O' -and $existing.OUserName) { $curLabel = "O (@$($existing.OUserName))" }
                    }
                    $msg = "$script:TTT_GAME **Tic-Tac-Toe**`nCurrent Player: **$curLabel**`n`n$boardText"
                    $mid = $null
                    $canEdit = (Get-Command Edit-TelegramMessage -ErrorAction SilentlyContinue)
                    if ($existing.XUserId -eq $userId) { $mid = $existing.XMessageId } elseif ($existing.OUserId -eq $userId) { $mid = $existing.OMessageId }
                    if ($mid -and $canEdit) {
                        $null = Edit-TelegramMessage -ChatId $chatId -MessageId ([int]$mid) -Text $msg -ReplyMarkup $kb
                    } else {
                        $resp = Send-TelegramMessage -ChatId $chatId -Text $msg -ReplyMarkup $kb
                        try {
                            if ($resp -and $resp.ok -and $resp.result) {
                                if ($existing.XUserId -eq $userId) { $existing.XMessageId = [int]$resp.result.message_id } elseif ($existing.OUserId -eq $userId) { $existing.OMessageId = [int]$resp.result.message_id }
                            }
                        } catch { }
                    }
                    return
                }
                # Lobby: show Join if free game exists, otherwise New Game
                $free = Find-JoinableGame -RequesterUserId $userId
                if ($free) {
                    $row = @(@{ text = "$script:TTT_PLUS Join Game"; callback_data = "ttt_join_any" })
                    $kb = @{ inline_keyboard = @(,$row) }
                    Send-TelegramMessage -ChatId $chatId -Text "$script:TTT_GAME Tic-Tac-Toe`nJoin available game:" -ReplyMarkup $kb
                } else {
                    $row = @(@{ text = "$script:TTT_REFRESH New Game"; callback_data = "ttt_new_pvp" })
                    $kb = @{ inline_keyboard = @(,$row) }
                    Send-TelegramMessage -ChatId $chatId -Text "$script:TTT_GAME Tic-Tac-Toe`nStart a new game:" -ReplyMarkup $kb
                }
                return
            }
            $mode = $null
            if ($tttArg -match "^ai$") { $mode = 'ai' }
            elseif ($tttArg -match "^pvp$") { $mode = 'pvp' }
            if (-not $mode) {
                # Default: show lobby options
                $free = Find-JoinableGame -RequesterUserId $userId
                if ($free) {
                    $row = @(@{ text = "$script:TTT_PLUS Join Game"; callback_data = "ttt_join_any" })
                    $kb = @{ inline_keyboard = @(,$row) }
                    Send-TelegramMessage -ChatId $chatId -Text "$script:TTT_GAME Tic-Tac-Toe`nJoin available game:" -ReplyMarkup $kb
                } else {
                    $row = @(@{ text = "$script:TTT_REFRESH New Game"; callback_data = "ttt_new_pvp" })
                    $kb = @{ inline_keyboard = @(,$row) }
                    Send-TelegramMessage -ChatId $chatId -Text "Usage: /ttt [pvp|ai]" -ReplyMarkup $kb
                }
                return
            }
            # Start new game explicitly
            $game = Initialize-TicTacToeGame -Mode $mode -CreatorUserId $userId -CreatorUserName $userName -CreatorChatId $chatId
            $boardText = Format-TicTacToeBoard -Board $game.board
            $kb = Get-TicTacToeKeyboard -Board $game.board -GameOver $false -Game $game
            $curLabel = $game.currentPlayer
            if ($game.mode -eq 'pvp') {
                if ($curLabel -eq 'X' -and $game.XUserName) { $curLabel = "X (@$($game.XUserName))" }
                if ($curLabel -eq 'O' -and $game.OUserName) { $curLabel = "O (@$($game.OUserName))" }
            }
            $msg = "$script:TTT_GAME **Tic-Tac-Toe**`nCurrent Player: **$curLabel**`n`n$boardText"
            $resp = Send-TelegramMessage -ChatId $chatId -Text $msg -ReplyMarkup $kb
            try { if ($resp -and $resp.ok -and $resp.result) { $game.XMessageId = [int]$resp.result.message_id } } catch { }
        }
                
        "^/ask" {
            $isAdmin = RestrictToAdmin -Message $Message
            if (-not $isAdmin) {
                Write-Log "Ask command is For Admins only"
                return
            }
            Log-AdminAction -Username $username -ChatId $chatId -Command "/ask"

            $question = $text -replace "^/ask\s*", ""
            if (-not $question) {
                Send-TelegramMessage -ChatId $chatId -Text "Usage: /ask [your question]`n`nExample: /ask What is the capital of France?"
                return
            }
            
            # Check rate limit
            $rateLimitCheck = Check-RateLimit -ChatId $chatId
            if (-not $rateLimitCheck.allowed) {
                $resetSeconds = [Math]::Ceiling($rateLimitCheck.resetIn)
                $resetMin = [Math]::Ceiling($resetSeconds / 60)
                Send-TelegramMessage -ChatId $chatId -Text "⏱️ **Rate limit exceeded**`n`nYou've hit the $($rateLimitCheck.reason).`n\nTry again in ~$resetMin minute(s)."
                Write-Log "Rate limit hit for chat $chatId - $($rateLimitCheck.reason)" "WARN"
                return
            }
            
            $script:Stats.TotalPrompts++
            $settings = Get-UserSettings -ChatId $chatId
            $systemPrompt = $settings.systemPrompt
            
            # Add to conversation history
            Add-ToHistory -ChatId $chatId -Role "user" -Content $question
            
            # Get conversation context
            $conversationContext = Get-ConversationHistory -ChatId $chatId -Limit $settings.maxHistoryContext
            $contextStr = ""
            foreach ($entry in $conversationContext[0..($conversationContext.Count-2)]) {
                if ($entry) {
                    $role = if ($entry.role -eq "user") { "User" } else { "Assistant" }
                    $contextStr += "[$role]: $($entry.content)"
                }
            }
            
            if ($contextStr -and $contextStr.Length -gt 0) {
                $enrichedPrompt = "Context: $contextStr New question: $question"
            } else {
                $enrichedPrompt = $question
            }
            
            if ($NoLamma) {
                Write-Log "NoLamma mode - using fallback AI"
                # Check cache first
                $cached = Get-CachedResponse -Prompt $question -Model $settings.model
                if ($cached) {
                    $responseText = "🤖 **Cached Response:**`n`n$cached"
                    Send-TelegramMessage -ChatId $chatId -Text $responseText
                    Add-ToHistory -ChatId $chatId -Role "assistant" -Content $cached
                    return
                }
                
                $result = Invoke-AI-Fallback -Prompt $enrichedPrompt -SystemPrompt $systemPrompt -ChatId $chatId
                
                if ($result.success) {
                    Save-CachedResponse -Prompt $question -Model $settings.model -Response $result.answer
                    $responseText = "🤖 **$($result.source):**`n`n$($result.answer)"
                    Send-TelegramMessage -ChatId $chatId -Text $responseText
                    Add-ToHistory -ChatId $chatId -Role "assistant" -Content $result.answer
                } else {
                    Send-TelegramMessage -ChatId $chatId -Text $result.message
                }
            } else {
                # Check cache first
                $cached = Get-CachedResponse -Prompt $question -Model $settings.model
                if ($cached) {
                    $responseText = "🤖 **Cached Response:**`n`n$cached"
                    Send-TelegramMessage -ChatId $chatId -Text $responseText
                    Add-ToHistory -ChatId $chatId -Role "assistant" -Content $cached
                    return
                }
                
                $answer = Invoke-Ollama -Prompt $enrichedPrompt -SystemPrompt $systemPrompt -Model $settings.model
                if ($answer) {
                    Save-CachedResponse -Prompt $question -Model $settings.model -Response $answer
                    Send-TelegramMessage -ChatId $chatId -Text $answer
                    Add-ToHistory -ChatId $chatId -Role "assistant" -Content $answer
                } else {
                    Write-Log "Failed to use ollama, trying VS code..."
                    $result = Invoke-AI-Fallback -Prompt $enrichedPrompt -SystemPrompt $systemPrompt -ChatId $chatId
                    if ($result.success) {
                        Save-CachedResponse -Prompt $question -Model $settings.model -Response $result.answer
                        Send-TelegramMessage -ChatId $chatId -Text "🤖 **$($result.source):**`n`n$($result.answer)"
                        Add-ToHistory -ChatId $chatId -Role "assistant" -Content $result.answer
                    }
                }            
            }
        }

        "^/fix" {
            $fixContent = $text -replace "^/fix\s*", ""
            if (-not $fixContent) {
                Send-TelegramMessage -ChatId $chatId -Text "Usage: /fix [error message or code to fix]`n`nExample: /fix PowerShell error: Cannot bind argument to parameter 'Path'"
                return
            }

            if (-not (RestrictToAdmin -Message $Message)) {
                Send-TelegramMessage -ChatId $chatId -Text "For Admins only"
                Write-Log "For Admins only"
                return
            }
            Log-AdminAction -Username $username -ChatId $chatId -Command "/fix"
            
            # Check rate limit
            $rateLimitCheck = Check-RateLimit -ChatId $chatId
            if (-not $rateLimitCheck.allowed) {
                $resetSeconds = [Math]::Ceiling($rateLimitCheck.resetIn)
                $resetMin = [Math]::Ceiling($resetSeconds / 60)
                Send-TelegramMessage -ChatId $chatId -Text "⏱️ **Rate limit exceeded**`n`nYou've hit the $($rateLimitCheck.reason).`n\nTry again in ~$resetMin minute(s)."
                Write-Log "Rate limit hit for chat $chatId - $($rateLimitCheck.reason)" "WARN"
                return
            }
            
            $script:Stats.TotalPrompts++
            $settings = Get-UserSettings -ChatId $chatId
            $systemPrompt = "You are an expert debugging assistant. Analyze the error or code provided and suggest a fix. Be concise and practical."
            
            # Add to conversation history
            Add-ToHistory -ChatId $chatId -Role "user" -Content "Fix: $fixContent"
            
            $fixPrompt = "Fix this issue: " + $fixContent
            
            if ($NoLamma) {
                Write-Log "NoLamma mode - using fallback AI for fix"
                
                # Check cache first
                $cached = Get-CachedResponse -Prompt $fixContent -Model $settings.model
                if ($cached) {
                    $responseText = "🔧 **Cached Fix:**`n`n$cached"
                    Send-TelegramMessage -ChatId $chatId -Text $responseText
                    Add-ToHistory -ChatId $chatId -Role "assistant" -Content $cached
                    return
                }
                
                $result = Invoke-AI-Fallback -Prompt $fixPrompt -SystemPrompt $systemPrompt -ChatId $chatId
                
                if ($result.success) {
                    Save-CachedResponse -Prompt $fixContent -Model $settings.model -Response $result.answer
                    $responseText = "🔧 **Fix from $($result.source):**`n`n$($result.answer)"
                    Send-TelegramMessage -ChatId $chatId -Text $responseText
                    Add-ToHistory -ChatId $chatId -Role "assistant" -Content $result.answer
                } else {
                    Send-TelegramMessage -ChatId $chatId -Text $result.message
                }
            } else {
                Send-TelegramMessage -ChatId $chatId -Text "🔧 Analyzing issue..."
                
                # Check cache first
                $cached = Get-CachedResponse -Prompt $fixContent -Model $settings.model
                if ($cached) {
                    $responseText = "🔧 **Cached Fix:**`n`n$cached"
                    Send-TelegramMessage -ChatId $chatId -Text $responseText
                    Add-ToHistory -ChatId $chatId -Role "assistant" -Content $cached
                    return
                }
                
                $answer = Invoke-Ollama -Prompt $fixPrompt -SystemPrompt $systemPrompt -Model $settings.model
                
                if ($answer) {
                    Save-CachedResponse -Prompt $fixContent -Model $settings.model -Response $answer
                    $responseText = "🔧 **Fix Suggestion:**`n`n" + $answer
                    Send-TelegramMessage -ChatId $chatId -Text $responseText
                    Add-ToHistory -ChatId $chatId -Role "assistant" -Content $answer
                } else {
                    Write-Log "Failed to use ollama for fix, trying fallback..."
                    $result = Invoke-AI-Fallback -Prompt $fixPrompt -SystemPrompt $systemPrompt -ChatId $chatId
                    if ($result.success) {
                        Save-CachedResponse -Prompt $fixContent -Model $settings.model -Response $result.answer
                        Send-TelegramMessage -ChatId $chatId -Text "🔧 **Fix from $($result.source):**`n`n$($result.answer)"
                        Add-ToHistory -ChatId $chatId -Role "assistant" -Content $result.answer
                    } else {
                        Send-TelegramMessage -ChatId $chatId -Text "❌ All AI backends unavailable"
                    }
                }
            }
        }

        "^/chain" {
            if (-not (RestrictToAdmin -Message $Message)) {
                Send-TelegramMessage -ChatId $chatId -Text "For Admins only"
                Write-Log "For Admins only"
                return
            }
            Log-AdminAction -Username $username -ChatId $chatId -Command "/chain"

            $chainPrompt = $text -replace "^/chain\s*", ""
            if (-not $chainPrompt) {
                Send-TelegramMessage -ChatId $chatId -Text "Usage: /chain [step1 | step2 | step3 ...]`n`nChain multiple prompts separated by pipes (|).`n`nExample: /chain Analyze this code | Suggest optimizations | Estimate performance impact"
                return
            }
            
            # Check rate limit
            $rateLimitCheck = Check-RateLimit -ChatId $chatId
            if (-not $rateLimitCheck.allowed) {
                $resetSeconds = [Math]::Ceiling($rateLimitCheck.resetIn)
                $resetMin = [Math]::Ceiling($resetSeconds / 60)
                Send-TelegramMessage -ChatId $chatId -Text "⏱️ **Rate limit exceeded**"
                return
            }
            
            $script:Stats.TotalPrompts++
            $settings = Get-UserSettings -ChatId $chatId
            
            # Parse chain steps
            $steps = $chainPrompt -split '\|' | ForEach-Object { $_.Trim() }
            
            if ($steps.Count -lt 2) {
                Send-TelegramMessage -ChatId $chatId -Text "❌ Chain requires at least 2 steps separated by | (pipe)"
                return
            }
            
            Send-TelegramMessage -ChatId $chatId -Text "⛓️ **Starting $($steps.Count)-step chain...**"
            
            # Add to history
            Add-ToHistory -ChatId $chatId -Role "user" -Content "Chain: $chainPrompt"
            
            $previousOutput = ""
            $chainResults = @()
            
            foreach ($i in 0..($steps.Count - 1)) {
                $step = $steps[$i]
                $stepNum = $i + 1
                
                # Build prompt with previous context
                $prompt = if ($previousOutput) {
                    "Context from previous step: $previousOutput Next step: $step"
                } else {
                    $step
                }
                
                Write-Log "Chain step $stepNum/$($steps.Count): $step" "DEBUG"
                
                try {
                    $answer = if ($NoLamma) {
                        $result = Invoke-AI-Fallback -Prompt $prompt -SystemPrompt $settings.systemPrompt -ChatId $chatId
                        if ($result.success) { $result.answer } else { $null }
                    } else {
                        Invoke-Ollama -Prompt $prompt -SystemPrompt $settings.systemPrompt -Model $settings.model
                    }
                    
                    if ($answer) {
                        $previousOutput = $answer
                        $chainResults += @{
                            step = $step
                            result = $answer
                        }
                        
                        # Send intermediate result
                        $resultText = "**Step $stepNum/$($steps.Count):** $step`n`n" + $answer
                        Send-TelegramMessage -ChatId $chatId -Text $resultText
                        Start-Sleep -Milliseconds 500
                    } else {
                        Send-TelegramMessage -ChatId $chatId -Text "❌ Step $stepNum failed"
                        break
                    }
                }
                catch {
                    Write-Log "Chain step $stepNum failed: $_" "ERROR"
                    Send-TelegramMessage -ChatId $chatId -Text "❌ Error in step $stepNum : $_"
                    break
                }
            }
            
            if ($chainResults.Count -eq $steps.Count) {
                Send-TelegramMessage -ChatId $chatId -Text "✅ **Chain completed successfully!**"
                Add-ToHistory -ChatId $chatId -Role "assistant" -Content "Chain completed with $($steps.Count) steps"
            }
        }

        "^/agent" {
            $agentPrompt = $text -replace "^/agent\s*", ""
            if (-not $agentPrompt) {
                Send-TelegramMessage -ChatId $chatId -Text "Usage: /agent [complex task description]`n`nExample: /agent Create a plan to automate my daily standup report"
                return
            }
            
            $script:Stats.TotalPrompts++
            
            # Check admin access for agent mode (potentially dangerous)
            if (-not (RestrictToAdmin -Message $Message)) {
                return
            }
            Log-AdminAction -Username $username -ChatId $chatId -Command "/agent"
            
            Send-TelegramMessage -ChatId $chatId -Text "🤖 Starting agent session...`n`nTask: $agentPrompt"
            
            if ($NoLamma) {
                Write-Log "NoLamma mode - using fallback AI for agent"
                $systemPrompt = "You are an autonomous agent. Break down the task into steps, execute them methodically, and report progress. Think step-by-step."
                $result = Invoke-AI-Fallback -Prompt $agentPrompt -SystemPrompt $systemPrompt -ChatId $chatId
                
                if ($result.success) {
                    $responseText = "🤖 **Agent from $($result.source):**`n`n$($result.answer)"
                    Send-TelegramMessage -ChatId $chatId -Text $responseText
                } else {
                    Send-TelegramMessage -ChatId $chatId -Text $result.message
                }
            } else {
                $systemPrompt = "You are an autonomous agent. Break down the task into steps, execute them methodically, and report progress. Think step-by-step."
                $answer = Invoke-Ollama -Prompt $agentPrompt -SystemPrompt $systemPrompt
                
                if ($answer) {
                    $responseText = "🤖 **Agent Response:**`n`n" + $answer
                    Send-TelegramMessage -ChatId $chatId -Text $responseText
                } else {
                    Write-Log "Failed to use ollama for agent, trying fallback..."
                    $result = Invoke-AI-Fallback -Prompt $agentPrompt -SystemPrompt $systemPrompt -ChatId $chatId
                    if ($result.success) {
                        Send-TelegramMessage -ChatId $chatId -Text "🤖 **Agent from $($result.source):**`n`n$($result.answer)"
                    } else {
                        Send-TelegramMessage -ChatId $chatId -Text "❌ All AI backends unavailable"
                    }
                }
            }
        }

        "^/jack" {
            #Admin-only command
            if (-not (RestrictToAdmin -Message $Message)) {
                Send-TelegramMessage -ChatId $chatId -Text "For Admins only"
                Write-Log "For Admins only"
                return
            }
            Log-AdminAction -Username $username -ChatId $chatId -Command "/jack"

            $message = $text -replace "^/jack\s*", ""
            if ($message -and $message.Length -gt 0) {
                try {
                    # Sanitize message to avoid command injection and malformed input
                    $sanitized = ($message -replace "[\r\n]", " ").Trim()
                    $jackScript = Join-Path (Split-Path $PSScriptRoot) "sendMessageToJack.ps1"
                    if (Test-Path $jackScript) {
                        $result = & $jackScript -Message $sanitized
                    } else {
                        # Fallback to current working directory
                        $result = & "${PSScriptRoot}\..\sendMessageToJack.ps1" -Message $sanitized
                    }
                    $resultText = "Message sent. Probably."
                    if (-not $result) {
                        $resultText = "Something went wrong."
                    }
                    Write-Log $resultText
                    Send-TelegramMessage -ChatId $chatId -Text $resultText
                }
                catch {
                    $crashText = "Crash trying send the message to Jack"
                    Write-Error $crashText
                    Send-TelegramMessage -ChatId $chatId -Text $crashText
                    
                }
            } else {
                $noParamMessage = "Please add message. Example: /jack hi"
                Write-Log $noParamMessage
                Send-TelegramMessage -ChatId $chatId -Text $noParamMessage
            }
        }

        "^/sh" {
            # Admin-only command
            if (-not (RestrictToAdmin -Message $Message)) {
                return
            }
            Log-AdminAction -Username $username -ChatId $chatId -Command "/sh"
            
            $shCommand = $text -replace "^/sh\s*", ""
            if (-not $shCommand) {
                $allowedList = "Get-Process, Get-Service, Get-ChildItem, Get-Item, Get-Content, Test-Path, whoami, hostname, ipconfig"
                Send-TelegramMessage -ChatId $chatId -Text ("Usage: /sh [your command]`n`n" +
                    "Allowed: " + $allowedList)
                return
            }
            $result = Invoke-Shell-Command -ShellCommand $shCommand
            $resultMessage = ":("
            if ($result -and $result.Length -gt 0) {
                $resultMessage = $result
            } else {
                $resultMessage = "Command executed. Probabbly... :( "                    
            }
            Send-TelegramMessage -ChatId $chatId -Text $resultMessage
        }

        
        "^/stats" {
            $uptime = (Get-Date) - $script:Stats.StartTime
            $uptimeStr = "{0:dd} days {0:hh}h {0:mm}m" -f $uptime
            
            $commandStats = ""
            foreach ($cmd in $script:Stats.CommandCounts.Keys | Sort-Object) {
                $count = $script:Stats.CommandCounts[$cmd]
                $commandStats += "  /$cmd :: $count`n"
            }
            
            if (-not $commandStats) {
                $commandStats = "  No commands tracked yet`n"
            }
            
            $lastActivity = (Get-Date) - $script:Stats.LastActivity
            $lastActivityStr = if ($lastActivity.TotalSeconds -lt 60) {
                "just now"
            } elseif ($lastActivity.TotalMinutes -lt 60) {
                "{0:N0} minutes ago" -f $lastActivity.TotalMinutes
            } else {
                "{0:N0} hours ago" -f $lastActivity.TotalHours
            }
            
            $statsText = "📊 **GovnoBot Statistics**`n`n" +
                "⏱️ Uptime: $uptimeStr`n" +
                "📝 Total Commands: $($script:Stats.TotalCommands)`n" +
                "🧠 Total Prompts: $($script:Stats.TotalPrompts)`n" +
                "🕐 Last Activity: $lastActivityStr`n`n" +
                "**Command Usage:**`n$commandStats"
            
            Send-TelegramMessage -ChatId $chatId -Text $statsText
        }

        "^/history" {
            $historyArg = $text -replace "^/history\s*", ""
            $limit = 5
            if ($historyArg -and $historyArg -match '^\d+$') {
                $limit = [int]$historyArg
            }
            
            $history = Get-ConversationHistory -ChatId $chatId -Limit $limit
            
            if ($history.Count -eq 0) {
                Send-TelegramMessage -ChatId $chatId -Text "📋 No conversation history yet. Start asking questions!"
                return
            }
            
            $historyText = "📋 **Conversation History** (last $($history.Count)):`n`n"
            foreach ($entry in $history) {
                $role = if ($entry.role -eq "user") { "👤" } else { "🤖" }
                $content = $entry.content
                if ($content.Length -gt 100) {
                    $content = $content.Substring(0, 97) + "..."
                }
                $historyText += "$role [$($entry.timestamp)]: $content`n`n"
            }
            
            Send-TelegramMessage -ChatId $chatId -Text $historyText
        }

        "^/model" {
            $modelArg = $text -replace "^/model\s*", ""
            
            if (-not $modelArg) {
                $currentSettings = Get-UserSettings -ChatId $chatId
                $availableList = $script:AvailableModels -join ", "
                $modelText = "🤖 **AI Model Settings**`n`n" +
                    "Current Model: **$($currentSettings.model)**`n`n" +
                    "Available Models:`n"
                foreach ($model in $script:AvailableModels) {
                    $mark = if ($model -eq $currentSettings.model) { "✅" } else { "⭕" }
                    $modelText += "$mark $model`n"
                }
                $modelText += "`n*Usage: /model [model_name]*"
                Send-TelegramMessage -ChatId $chatId -Text $modelText
                return
            }
            
            if ($script:AvailableModels -contains $modelArg) {
                $settings = Get-UserSettings -ChatId $chatId
                $settings.model = $modelArg
                Save-UserSettings -ChatId $chatId -Settings $settings
                Send-TelegramMessage -ChatId $chatId -Text "✅ Model switched to **$modelArg**"
                Write-Log "Model changed to $modelArg for chat $chatId"
            } else {
                $availableList = $script:AvailableModels -join ", "
                Send-TelegramMessage -ChatId $chatId -Text "❌ Unknown model: $modelArg`n`nAvailable: $availableList"
            }
        }

        "^/settings" {
            $settingsArg = $text -replace "^/settings\s*", ""
            
            if ($settingsArg -match "^prompt\s+(.+)$") {
                $newPrompt = $matches[1]
                $settings = Get-UserSettings -ChatId $chatId
                $settings.systemPrompt = $newPrompt
                Save-UserSettings -ChatId $chatId -Settings $settings
                $responseText = "✅ System prompt updated!`n`n*New prompt:*`n$newPrompt"
                Send-TelegramMessage -ChatId $chatId -Text $responseText
                Write-Log "System prompt updated for chat $chatId"
                return
            }
            
            if ($settingsArg -match "^reset$") {
                $settings = Get-UserSettings -ChatId $chatId
                $settings.systemPrompt = "You are a helpful assistant."
                $settings.model = $script:OllamaModel
                $settings.maxHistoryContext = 5
                Save-UserSettings -ChatId $chatId -Settings $settings
                Send-TelegramMessage -ChatId $chatId -Text "✅ Settings reset to defaults"
                Write-Log "Settings reset for chat $chatId"
                return
            }
            
            $settings = Get-UserSettings -ChatId $chatId
            $promptPreview = if ($settings.systemPrompt.Length -gt 60) {
                $settings.systemPrompt.Substring(0, 57) + "..."
            } else {
                $settings.systemPrompt
            }
            Write-Log $settings
            $settingsText = "⚙️ **Your Settings**`n`n" +
                "🤖 AI Model: **$($settings.model)**`n" +
                "📝 Max History Context: **$($settings.maxHistoryContext)** messages`n" +
                "💭 System Prompt:`n_$promptPreview_`n`n" +
                "**Commands:**`n" +
                "/settings prompt [new prompt] - Set custom system prompt`n" +
                "/settings reset - Reset to defaults`n" +
                "/model [name] - Change AI model`n"
            
            Send-TelegramMessage -ChatId $chatId -Text $settingsText
        }
        
        "^/dev" {
            # Admin-only command for self-improvement
            if (-not (RestrictToAdmin -Message $Message)) {
                return
            }
            Log-AdminAction -Username $username -ChatId $chatId -Command "/dev"
            
            Send-TelegramMessage -ChatId $chatId -Text "[Dev] Triggering self-improvement process..."
            Write-Log "Self-improvement triggered by @$username"
            
            # Check if openVSCodeChat.ps1 exists
            $scriptPath = Join-Path (Split-Path $PSScriptRoot) "openVSCodeChat.ps1"
            if (Test-Path $scriptPath) {
                & $scriptPath -Prompt "Please read and continue develop govnobot.ps1"
            } else {
                Write-Log "openVSCodeChat.ps1 not found at $scriptPath" "WARN"
                Write-Log "trying to use alternative method"
                $shellCommand = "code chat -m 'agent' 'Continue developing " + $PSScriptRoot + "\govnobot.ps1 please'"
                Invoke-Shell-Command -ShellCommand $shellCommand
                # Send-TelegramMessage -ChatId $chatId -Text "[Warning] Self-improvement script not found"
            }
        }
        default {
            if ($text -and $text -notmatch "^/") {
                Send-TelegramMessage -ChatId $chatId -Text "[Info] Message received. Use /help to see available commands."
            }
        }
    }
}

function Invoke-Callback-Query {
    param(
        [Parameter(Mandatory=$true)]
        $CallbackQuery
    )
    
    $chatId = $CallbackQuery.message.chat.id
    $username = $CallbackQuery.from.username
    $callbackData = $CallbackQuery.data
    $queryId = $CallbackQuery.id
    
    Write-Log "Processing callback '$callbackData' from @$username (chat: $chatId)"
    
    # Answer callback query to remove loading state (basic ack)
    try {
        $answerUrl = "$script:BaseUrl/answerCallbackQuery"
        $answerBody = @{
            callback_query_id = $queryId
        } | ConvertTo-Json
        Invoke-RestMethod -Uri $answerUrl -Method Post -ContentType "application/json; charset=utf-8" -Body $answerBody | Out-Null
    }
    catch {
        Write-Log "Failed to answer callback query: $_" "WARN"
    }    

    if ($callbackData -eq 'ttt_new_pvp' -or $callbackData -eq 'ttt_new_ai') {
        $mode = if ($callbackData -eq 'ttt_new_pvp') { 'pvp' } else { 'ai' }
        $uid = [long]$CallbackQuery.from.id
        $uname = $CallbackQuery.from.username
        if (-not $uname -or $uname -eq "") { $uname = "user$uid" }
        $game = Initialize-TicTacToeGame -Mode $mode -CreatorUserId $uid -CreatorUserName $uname -CreatorChatId $chatId
        $boardText = Format-TicTacToeBoard -Board $game.board
        $kb = Get-TicTacToeKeyboard -Board $game.board -GameOver $false -Game $game
        $curLabel = $game.currentPlayer
        if ($game.mode -eq 'pvp') {
            if ($curLabel -eq 'X' -and $game.XUserName) { $curLabel = "X (@$($game.XUserName))" }
            if ($curLabel -eq 'O' -and $game.OUserName) { $curLabel = "O (@$($game.OUserName))" }
        }
        $msg = "$script:TTT_GAME **Tic-Tac-Toe**`nCurrent Player: **$curLabel**`n`n$boardText"
        $originMsgId = [int]$CallbackQuery.message.message_id
        $canEdit = (Get-Command Edit-TelegramMessage -ErrorAction SilentlyContinue)
        if ($canEdit) {
            $null = Edit-TelegramMessage -ChatId $chatId -MessageId $originMsgId -Text $msg -ReplyMarkup $kb
            $game.XMessageId = $originMsgId
        } else {
            $resp = Send-TelegramMessage -ChatId $chatId -Text $msg -ReplyMarkup $kb
            try { if ($resp -and $resp.ok -and $resp.result) { $game.XMessageId = [int]$resp.result.message_id } } catch { }
        }
        return
    }
    if ($callbackData -match '^ttt_move_(\d+)_(\d+)$') {
        $gameId = [int]$matches[1]
        $pos = [int]$matches[2]
        $uid = [long]$CallbackQuery.from.id
        $uname = $CallbackQuery.from.username
        if (-not $uname -or $uname -eq "") { $uname = "user$uid" }
        $result = Handle-TicTacToeMove -GameId $gameId -Position $pos -UserId $uid -UserName $uname
        if ($result.success) {
            $game = $result.game
            $canEdit = (Get-Command Edit-TelegramMessage -ErrorAction SilentlyContinue)
            
            # Generate player-specific keyboards
            $rmX = if ($result.gameOver) { 
                Get-TicTacToeKeyboard -Board $game.board -GameOver $true -Game $game
            } else { 
                Get-TicTacToeKeyboard -Board $game.board -GameOver $false -Game $game -CurrentUserId $game.XUserId
            }
            $rmO = if ($result.gameOver) { 
                Get-TicTacToeKeyboard -Board $game.board -GameOver $true -Game $game
            } else { 
                Get-TicTacToeKeyboard -Board $game.board -GameOver $false -Game $game -CurrentUserId $game.OUserId
            }
            
            # Edit X side
            if ($game.XMessageId -and $canEdit) {
                $null = Edit-TelegramMessage -ChatId $game.XChatId -MessageId ([int]$game.XMessageId) -Text $result.message -ReplyMarkup $rmX
            } elseif ($game.XChatId) {
                $respX = Send-TelegramMessage -ChatId $game.XChatId -Text $result.message -ReplyMarkup $rmX
                try { if ($respX -and $respX.ok -and $respX.result) { $game.XMessageId = [int]$respX.result.message_id } } catch { }
            }
            # Edit O side
            if ($game.OChatId) {
                if ($game.OMessageId -and $canEdit) {
                    $null = Edit-TelegramMessage -ChatId $game.OChatId -MessageId ([int]$game.OMessageId) -Text $result.message -ReplyMarkup $rmO
                } else {
                    $respO = Send-TelegramMessage -ChatId $game.OChatId -Text $result.message -ReplyMarkup $rmO
                    try { if ($respO -and $respO.ok -and $respO.result) { $game.OMessageId = [int]$respO.result.message_id } } catch { }
                }
            }
            if ($result.gameOver) {
                # Remove finished game
                $script:TicTacToeGames = @($script:TicTacToeGames | Where-Object { $_.id -ne $game.id })
                Save-TicTacToeState
            }
        }
        else {
            try {
                $alertBody = @{
                    callback_query_id = $queryId
                    text = $result.message
                    show_alert = $true
                } | ConvertTo-Json
                Invoke-RestMethod -Uri $answerUrl -Method Post -ContentType "application/json; charset=utf-8" -Body $alertBody | Out-Null
            }
            catch {
                Write-Log "Failed to send callback alert: $_" "WARN"
            }
        }
        return
    }
    if ($callbackData -eq 'ttt_join_any') {
        $uid = [long]$CallbackQuery.from.id
        $uname = $CallbackQuery.from.username
        if (-not $uname -or $uname -eq "") { $uname = "user$uid" }
        $result = Join-TicTacToeAny -UserId $uid -UserName $uname -ChatId $chatId
        if ($result.success) {
            $game = $result.game
            
            # Generate player-specific keyboards
            $rmX = Get-TicTacToeKeyboard -Board $game.board -GameOver $false -Game $game -CurrentUserId $game.XUserId
            $rmO = Get-TicTacToeKeyboard -Board $game.board -GameOver $false -Game $game -CurrentUserId $game.OUserId
            
            # Send board to O (this chat)
            $respO = Send-TelegramMessage -ChatId $chatId -Text $result.message -ReplyMarkup $rmO
            try { if ($respO -and $respO.ok -and $respO.result) { $game.OMessageId = [int]$respO.result.message_id } } catch { }
            # Update X side board
            $canEdit = (Get-Command Edit-TelegramMessage -ErrorAction SilentlyContinue)
            if ($game.XChatId -and $game.XMessageId -and $canEdit) {
                $null = Edit-TelegramMessage -ChatId $game.XChatId -MessageId ([int]$game.XMessageId) -Text $result.message -ReplyMarkup $rmX
            } elseif ($game.XChatId) {
                $respX = Send-TelegramMessage -ChatId $game.XChatId -Text $result.message -ReplyMarkup $rmX
                try { if ($respX -and $respX.ok -and $respX.result) { $game.XMessageId = [int]$respX.result.message_id } } catch { }
            }
        }
        else {
            try {
                $alertBody = @{
                    callback_query_id = $queryId
                    text = $result.message
                    show_alert = $true
                } | ConvertTo-Json
                Invoke-RestMethod -Uri $answerUrl -Method Post -ContentType "application/json; charset=utf-8" -Body $alertBody | Out-Null
            }
            catch {
                Write-Log "Failed to send callback alert: $_" "WARN"
            }
        }
        return
    }
    if ($callbackData -eq 'ttt_disabled') {
        # Silently acknowledge disabled button click (not player's turn)
        try {
            $alertBody = @{
                callback_query_id = $queryId
            } | ConvertTo-Json
            Invoke-RestMethod -Uri $answerUrl -Method Post -ContentType "application/json; charset=utf-8" -Body $alertBody | Out-Null
        }
        catch {
            Write-Log "Failed to acknowledge disabled button: $_" "WARN"
        }
        return
    }
    if ($callbackData -match '^ttt_quit_(\d+)$') {
        $gameId = [int]$matches[1]
        $game = Get-GameById -GameId $gameId
        if ($game) {
            $canEdit = (Get-Command Edit-TelegramMessage -ErrorAction SilentlyContinue)
            if ($game.XChatId -and $game.XMessageId -and $canEdit) { $null = Edit-TelegramMessage -ChatId $game.XChatId -MessageId ([int]$game.XMessageId) -Text "$script:TTT_CROSS Game ended." }
            elseif ($game.XChatId) { Send-TelegramMessage -ChatId $game.XChatId -Text "$script:TTT_CROSS Game ended." | Out-Null }
            if ($game.OChatId) {
                if ($game.OMessageId -and $canEdit) { $null = Edit-TelegramMessage -ChatId $game.OChatId -MessageId ([int]$game.OMessageId) -Text "$script:TTT_CROSS Game ended." }
                else { Send-TelegramMessage -ChatId $game.OChatId -Text "$script:TTT_CROSS Game ended." | Out-Null }
            }
            $script:TicTacToeGames = @($script:TicTacToeGames | Where-Object { $_.id -ne $gameId })
            Save-TicTacToeState
        } else {
            Send-TelegramMessage -ChatId $chatId -Text "$script:TTT_CROSS Game ended." | Out-Null
        }
        return
    }
}

function Start-BotPolling {
    Write-Log "Starting GovnoBot bot polling..."
    Write-Log "Press Ctrl+C to stop"
    
    $errorCount = 0
    $maxConsecutiveErrors = 5
    
    while ($true) {
        try {
            $updates = Get-TelegramUpdates -Offset ($script:LastUpdateId + 1)
            
            if ($updates -and $updates.ok -and $updates.result.Count -gt 0) {
                $errorCount = 0  # Reset error count on successful update
                
                foreach ($update in $updates.result) {
                    $script:LastUpdateId = $update.update_id
                    
                    try {
                        if ($update.message) {
                            Invoke-Telegram-Command -Message $update.message
                        }
                        elseif ($update.callback_query) {
                            Invoke-Callback-Query -CallbackQuery $update.callback_query
                        }
                    }
                    catch {
                        Write-Log "Error processing update $($update.update_id): $_" "ERROR"
                        # Continue processing other updates
                    }
                }
            }

            if ($NoLoop) {
                Write-Log "NoLoop flag detected. Exiting after single iteration." "INFO"
                break
            }
            Start-Sleep -Seconds $PollInterval
        }
        catch {
            $errorCount++
            Write-Log "Error in polling loop (attempt $errorCount/$maxConsecutiveErrors): $_" "ERROR"
            
            if ($errorCount -ge $maxConsecutiveErrors) {
                Write-Log "Too many consecutive errors. Waiting 60 seconds before retry..." "ERROR"
                Start-Sleep -Seconds 60
                $errorCount = 0
            } else {
                Start-Sleep -Seconds 10
            }
        }
    }
}

# Main execution
try {
    Write-Log "---------------------------------------"
    Write-Log "🤖 GovnoBot v$script:Version - Starting..."
    Write-Log "---------------------------------------"
    Write-Log "📅 Version Date: $script:VersionDate"
    Write-Log "🔑 Bot Token: $($BotToken.Substring(0, 10))..." 
    Write-Log "⏱️  Poll Interval: $PollInterval seconds"
    Write-Log "🧠 AI Model: $script:OllamaModel"
    Write-Log "🔗 Ollama URL: $script:OllamaUrl"
    Write-Log "🐛 Debug Mode: $Debug"
    Write-Log "🚫 NoLamma Mode: $NoLamma"
    Write-Log "---------------------------------------"
    
    # Test Ollama connection if not in NoLamma mode
    if (-not $NoLamma) {
        try {
            Write-Log "Testing Ollama connection..."
            $testBody = @{
                model = $script:OllamaModel
                prompt = "test"
                stream = $false
            } | ConvertTo-Json
            
            $null = Invoke-RestMethod -Uri $script:OllamaUrl `
                -Method Post `
                -ContentType "application/json" `
                -Body $testBody `
                -TimeoutSec 5 `
                -ErrorAction Stop
            
            Write-Log "✅ Ollama connection successful!"
        }
        catch {
            Write-Log "⚠️  Warning: Cannot connect to Ollama at $script:OllamaUrl" "WARN"
            Write-Log "   Bot will fall back to VS Code when needed" "WARN"
        }
    }
    
    Write-Log "🚀 Bot is now running. Press Ctrl+C to stop."
    Write-Log "---------------------------------------"
   
    Start-BotPolling
}
catch {
    Write-Log "💥 Fatal error: $_" "ERROR"
    exit 1
}

function Edit-TelegramMessage {
    param(
        [Parameter(Mandatory=$true)]
        [long]$ChatId,
        [Parameter(Mandatory=$true)]
        [int]$MessageId,
        [Parameter(Mandatory=$true)]
        [string]$Text,
        [string]$ParseMode = "Markdown",
        [object]$ReplyMarkup = $null
    )
    try {
        $body = @{
            chat_id = $ChatId
            message_id = $MessageId
            text = $Text
            parse_mode = $ParseMode
        }
        if ($ReplyMarkup) { $body.reply_markup = $ReplyMarkup }
        $jsonBody = $body | ConvertTo-Json -Depth 10
        $response = Invoke-RestMethod -Uri "$script:BaseUrl/editMessageText" `
            -Method Post `
            -ContentType "application/json; charset=utf-8" `
            -Body $jsonBody
        return $response
    }
    catch {
        Write-Log "Failed to edit message: $_" "ERROR"
        return $null
    }
}