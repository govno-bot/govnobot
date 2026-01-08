# filepath: C:\Users\osmirnov\Documents\projects\govnobot\tickTackToe.prompt.ps1
# Tic-Tac-Toe subsystem for GovnoBot
# Implements multiplayer and single-player modes with Telegram inline keyboards
# Version: 1.0.2

# Game state storage (in-memory, array of game objects)
if (-not $script:TicTacToeGames) { $script:TicTacToeGames = @() }
if (-not $script:TicTacToeNextId) { $script:TicTacToeNextId = 1 }

# State file path (fallback to current directory if PSScriptRoot not available)
$scriptDir = if ($PSScriptRoot) { $PSScriptRoot } else { (Get-Location).Path }
$script:TTTStateFile = Join-Path $scriptDir "govnobot_data\ttt_state.json"

# Emoji constants (safe Unicode)
$script:TTT_TILE = [char]0x2B1C
$script:TTT_X = 'X'
$script:TTT_O = 'O'
$script:TTT_GAME = [char]::ConvertFromUtf32(0x1F3AE)
$script:TTT_REFRESH = [char]::ConvertFromUtf32(0x1F504)
$script:TTT_CROSS = [char]0x274C
$script:TTT_HANDSHAKE = [char]::ConvertFromUtf32(0x1F91D)
$script:TTT_TADA = [char]::ConvertFromUtf32(0x1F389)
$script:TTT_USERS = [char]::ConvertFromUtf32(0x1F465)
$script:TTT_HOURGLASS = [char]0x23F3
$script:TTT_BOT = [char]::ConvertFromUtf32(0x1F916)
$script:TTT_WARN = [char]0x26A0
$script:TTT_PLUS = [char]0x2795

function Save-TicTacToeState {
    try {
        $stateDir = Split-Path $script:TTTStateFile -Parent
        if (-not (Test-Path $stateDir)) {
            New-Item -ItemType Directory -Path $stateDir -Force | Out-Null
        }
        
        $state = @{
            games = $script:TicTacToeGames
            nextId = $script:TicTacToeNextId
            timestamp = (Get-Date).ToString("o")
        }
        
        $state | ConvertTo-Json -Depth 10 | Set-Content -Path $script:TTTStateFile -Encoding UTF8
        return $true
    }
    catch {
        Write-Warning "Failed to save TTT state: $_"
        return $false
    }
}

function Load-TicTacToeState {
    try {
        if (Test-Path $script:TTTStateFile) {
            $state = Get-Content -Path $script:TTTStateFile -Encoding UTF8 -Raw | ConvertFrom-Json
            
            # Restore games array (handle PSCustomObject conversion)
            if ($state.games) {
                $script:TicTacToeGames = @($state.games | ForEach-Object {
                    # Convert PSCustomObject back to hashtable for consistency
                    $game = @{}
                    $_.PSObject.Properties | ForEach-Object { $game[$_.Name] = $_.Value }
                    
                    # Ensure board is an array
                    if ($game.board -is [System.Collections.IEnumerable] -and $game.board -isnot [string]) {
                        $game.board = @($game.board)
                    }
                    
                    $game
                })
            }
            
            # Restore next ID
            if ($state.nextId) {
                $script:TicTacToeNextId = [int]$state.nextId
            }
            
            return $true
        }
        return $false
    }
    catch {
        Write-Warning "Failed to load TTT state: $_"
        return $false
    }
}

function Initialize-TicTacToeGame {
    param(
        [Parameter(Mandatory=$true)]
        [string]$Mode,  # "pvp" or "ai"
        [Parameter(Mandatory=$true)]
        [long]$CreatorUserId,
        [string]$CreatorUserName,
        [Parameter(Mandatory=$true)]
        [long]$CreatorChatId
    )
    $gameId = [int]$script:TicTacToeNextId
    $script:TicTacToeNextId++
    $game = @{
        id = $gameId
        board = @($script:TTT_TILE, $script:TTT_TILE, $script:TTT_TILE, $script:TTT_TILE, $script:TTT_TILE, $script:TTT_TILE, $script:TTT_TILE, $script:TTT_TILE, $script:TTT_TILE)
        currentPlayer = 'X'
        mode = $Mode
        gameOver = $false
        winner = $null
        moves = 0
        XUserId = $CreatorUserId
        XUserName = $CreatorUserName
        XChatId = $CreatorChatId
        XMessageId = $null
        OUserId = $null
        OUserName = $null
        OChatId = $null
        OMessageId = $null
    }
    if ($Mode -eq 'ai') {
        # Single-player game; O is AI (no user fields)
        $game.OUserId = -1
        $game.OUserName = 'AI'
        $game.OChatId = $CreatorChatId
    }
    $script:TicTacToeGames += $game
    Save-TicTacToeState
    Write-Log "TicTacToe: New $Mode game started (id=$gameId) by @$CreatorUserName (chat $CreatorChatId)"
    return $game
}

function Get-GameById {
    param([Parameter(Mandatory=$true)][int]$GameId)
    foreach ($g in $script:TicTacToeGames) { if ($g.id -eq $GameId) { return $g } }
    return $null
}

function Get-GameIndexById {
    param([Parameter(Mandatory=$true)][int]$GameId)
    for ($i = 0; $i -lt $script:TicTacToeGames.Count; $i++) { if ($script:TicTacToeGames[$i].id -eq $GameId) { return $i } }
    return -1
}

function Find-UserActiveGame {
    param([Parameter(Mandatory=$true)][long]$UserId)
    foreach ($g in $script:TicTacToeGames) {
        if (-not $g.gameOver -and (($g.XUserId -eq $UserId) -or ($g.OUserId -eq $UserId))) { return $g }
    }
    return $null
}

function Find-JoinableGame {
    param([Parameter(Mandatory=$true)][long]$RequesterUserId)
    foreach ($g in $script:TicTacToeGames) {
        if ($g.mode -eq 'pvp' -and -not $g.gameOver -and -not $g.OUserId -and $g.XUserId -ne $RequesterUserId) { return $g }
    }
    return $null
}

function Format-TicTacToeBoard {
    param(
        [Parameter(Mandatory=$true)]
        [array]$Board
    )
    
    $formatted = ""
    for ($i = 0; $i -lt 9; $i += 3) {
        $formatted += "$($Board[$i]) $($Board[$i+1]) $($Board[$i+2])`n"
    }
    return $formatted
}

function Get-TicTacToeKeyboard {
    param(
        [Parameter(Mandatory=$true)]
        [array]$Board,
        [Parameter(Mandatory=$true)]
        [bool]$GameOver,
        $Game = $null,
        [long]$CurrentUserId = 0
    )
    
    if ($GameOver) {
        $row = @(@{ text = "$script:TTT_REFRESH New Game"; callback_data = "ttt_new_pvp" })
        return @{ inline_keyboard = @(,$row) }
    }
    
    # Determine if this user can make moves
    $canMove = $true
    if ($Game -and $Game.mode -eq 'pvp' -and $CurrentUserId -gt 0) {
        $isPlayerX = ($Game.XUserId -eq $CurrentUserId)
        $isPlayerO = ($Game.OUserId -eq $CurrentUserId)
        $isXTurn = ($Game.currentPlayer -eq 'X')
        $canMove = ($isPlayerX -and $isXTurn) -or ($isPlayerO -and -not $isXTurn)
    }
    
    $keyboard = @()
    for ($i = 0; $i -lt 9; $i += 3) {
        $row = @()
        for ($j = 0; $j -lt 3; $j++) {
            $pos = $i + $j
            $symbol = if ($Board[$pos] -eq $script:TTT_TILE) { ($pos + 1).ToString() } else { $Board[$pos] }
            # Disable button if position taken OR not player's turn
            $isDisabled = ($Board[$pos] -ne $script:TTT_TILE) -or (-not $canMove)
            $row += @{
                text = $symbol
                callback_data = if ($isDisabled) { "ttt_disabled" } elseif ($Game) { "ttt_move_$($Game.id)_$pos" } else { "ttt_move_$pos" }
            }
        }
        # Add the row as a single element to preserve array-of-arrays
        $keyboard += ,$row
    }
    # Add quit button
    $quitRow = @(@{ text = "$script:TTT_CROSS Quit Game"; callback_data = if ($Game) { "ttt_quit_$($Game.id)" } else { "ttt_quit" } })
    $keyboard += ,$quitRow
    
    return @{ inline_keyboard = $keyboard }
}

function Join-TicTacToeAny {
    param([Parameter(Mandatory=$true)][long]$UserId,[string]$UserName,[Parameter(Mandatory=$true)][long]$ChatId)
    $game = Find-JoinableGame -RequesterUserId $UserId
    if (-not $game) { return @{ success = $false; message = "$script:TTT_CROSS No free games to join. Create a new one." } }
    $game.OUserId = $UserId
    $game.OUserName = $UserName
    $game.OChatId = $ChatId
    Save-TicTacToeState
    $boardText = Format-TicTacToeBoard -Board $game.board
    $currentLabel = $game.currentPlayer
    if ($currentLabel -eq 'X' -and $game.XUserName) { $currentLabel = "X (@$($game.XUserName))" }
    if ($currentLabel -eq 'O' -and $game.OUserName) { $currentLabel = "O (@$($game.OUserName))" }
    $statusText = "$script:TTT_GAME **Tic-Tac-Toe**`nPlayer O joined: @$UserName`n`nCurrent Player: **$currentLabel**`n`n$boardText"
    # Note: keyboard will be regenerated per-player in govnobot callback handler
    return @{ success = $true; message = $statusText; keyboard = $null; game = $game }
}

function Check-TicTacToeWinner {
    param(
        [Parameter(Mandatory=$true)]
        [array]$Board
    )
    
    # Winning combinations
    $winPatterns = @(
        @(0, 1, 2), @(3, 4, 5), @(6, 7, 8),  # Rows
        @(0, 3, 6), @(1, 4, 7), @(2, 5, 8),  # Columns
        @(0, 4, 8), @(2, 4, 6)               # Diagonals
    )
    
    foreach ($pattern in $winPatterns) {
        $a, $b, $c = $pattern
        if ($Board[$a] -ne $script:TTT_TILE -and 
            $Board[$a] -eq $Board[$b] -and 
            $Board[$b] -eq $Board[$c]) {
            return $Board[$a]
        }
    }
    
    # Check for draw
    if ($Board -notcontains $script:TTT_TILE) {
        return 'DRAW'
    }
    
    return $null
}

function Get-AIMove {
    param(
        [Parameter(Mandatory=$true)]
        [array]$Board
    )
    
    # Simple AI: Minimax algorithm
    $bestScore = -1000
    $bestMove = -1
    
    for ($i = 0; $i -lt 9; $i++) {
        if ($Board[$i] -eq $script:TTT_TILE) {
            $Board[$i] = 'O'
            $score = Invoke-Minimax -Board $Board -IsMaximizing $false
            $Board[$i] = $script:TTT_TILE
            
            if ($score -gt $bestScore) {
                $bestScore = $score
                $bestMove = $i
            }
        }
    }
    
    return $bestMove
}

function Invoke-Minimax {
    param(
        [Parameter(Mandatory=$true)]
        [array]$Board,
        [Parameter(Mandatory=$true)]
        [bool]$IsMaximizing
    )
    
    $result = Check-TicTacToeWinner -Board $Board
    
    if ($result -eq 'O') { return 10 }
    if ($result -eq 'X') { return -10 }
    if ($result -eq 'DRAW') { return 0 }
    
    if ($IsMaximizing) {
        $bestScore = -1000
        for ($i = 0; $i -lt 9; $i++) {
            if ($Board[$i] -eq $script:TTT_TILE) {
                $Board[$i] = 'O'
                $score = Invoke-Minimax -Board $Board -IsMaximizing $false
                $Board[$i] = $script:TTT_TILE
                $bestScore = [Math]::Max($score, $bestScore)
            }
        }
        return $bestScore
    } else {
        $bestScore = 1000
        for ($i = 0; $i -lt 9; $i++) {
            if ($Board[$i] -eq $script:TTT_TILE) {
                $Board[$i] = 'X'
                $score = Invoke-Minimax -Board $Board -IsMaximizing $true
                $Board[$i] = $script:TTT_TILE
                $bestScore = [Math]::Min($score, $bestScore)
            }
        }
        return $bestScore
    }
}

function Handle-TicTacToeMove {
    param(
        [Parameter(Mandatory=$true)][int]$GameId,
        [Parameter(Mandatory=$true)][int]$Position,
        [Parameter(Mandatory=$true)][long]$UserId,
        [string]$UserName
    )
    
    $game = Get-GameById -GameId $GameId
    
    if (-not $game) {
        return @{ success = $false; message = "$script:TTT_CROSS No active game. Use /ttt to start!" }
    }
    
    if ($game.gameOver) {
        return @{ success = $false; message = "$script:TTT_GAME Game is over! Start a new one." }
    }
    
    if ($game.board[$Position] -ne $script:TTT_TILE) {
        return @{ success = $false; message = "$script:TTT_WARN Position already taken!" }
    }
    
    # Simple PvP assignment & turn enforcement
    if ($game.mode -eq 'pvp') {
        $symbol = $game.currentPlayer  # 'X' or 'O'
        if ($symbol -eq 'X') {
            if (-not $game.XUserId) {
                # First mover becomes X
                $game.XUserId = $UserId
                $game.XUserName = $UserName
            } elseif ($game.XUserId -ne $UserId) {
                # Ensure correct turn owner; if O not assigned yet and it's X's turn, block
                return @{ success = $false; message = "$script:TTT_HOURGLASS It's X's turn (@$($game.XUserName))." }
            }
        } else { # 'O'
            if (-not $game.OUserId) {
                if ($game.XUserId -and $game.XUserId -eq $UserId) {
                    return @{ success = $false; message = "$script:TTT_USERS Waiting for a second player to join as O." }
                }
                $game.OUserId = $UserId
                $game.OUserName = $UserName
            } elseif ($game.OUserId -ne $UserId) {
                return @{ success = $false; message = "$script:TTT_HOURGLASS It's O's turn (@$($game.OUserName))." }
            }
        }
    }

    # Make player move
    $game.board[$Position] = $game.currentPlayer
    $game.moves++
    
    # Check for winner
    $winner = Check-TicTacToeWinner -Board $game.board
    
    if ($winner) {
        $game.gameOver = $true
        $game.winner = $winner
        
        $resultText = if ($winner -eq 'DRAW') {
            "$script:TTT_HANDSHAKE **It's a draw!**"
        } else {
            if ($game.mode -eq 'pvp' -and $winner -eq 'X' -and $game.XUserName) {
                "$script:TTT_TADA **Player X (@$($game.XUserName)) wins!**"
            } elseif ($game.mode -eq 'pvp' -and $winner -eq 'O' -and $game.OUserName) {
                "$script:TTT_TADA **Player O (@$($game.OUserName)) wins!**"
            } else {
                "$script:TTT_TADA **Player $winner wins!**"
            }
        }
        
        $boardText = Format-TicTacToeBoard -Board $game.board
        Save-TicTacToeState
        return @{
            success = $true
            message = "$resultText`n`n$boardText"
            keyboard = Get-TicTacToeKeyboard -Board $game.board -GameOver $true
            gameOver = $true
            game = $game
        }
    }
    
    # Switch player (or trigger AI move)
    if ($game.mode -eq 'ai' -and $game.currentPlayer -eq 'X') {
        $game.currentPlayer = 'O'
        
        # AI makes move
        $aiMove = Get-AIMove -Board $game.board
        if ($aiMove -ge 0) {
            $game.board[$aiMove] = 'O'
            $game.moves++
            
            # Check if AI won
            $winner = Check-TicTacToeWinner -Board $game.board
            if ($winner) {
                $game.gameOver = $true
                $game.winner = $winner
                
                $resultText = if ($winner -eq 'DRAW') {
                    "$script:TTT_HANDSHAKE **It's a draw!**"
                } else {
                    "$script:TTT_BOT **AI wins!**"
                }
                
                $boardText = Format-TicTacToeBoard -Board $game.board
                Save-TicTacToeState
                return @{
                    success = $true
                    message = "$resultText`n`n$boardText"
                    keyboard = Get-TicTacToeKeyboard -Board $game.board -GameOver $true
                    gameOver = $true
                    game = $game
                }
            }
        }
        
        $game.currentPlayer = 'X'
    } elseif ($game.mode -eq 'pvp') {
        $game.currentPlayer = if ($game.currentPlayer -eq 'X') { 'O' } else { 'X' }
    }
    
    $boardText = Format-TicTacToeBoard -Board $game.board
    $currentLabel = $game.currentPlayer
    if ($game.mode -eq 'pvp') {
        if ($currentLabel -eq 'X' -and $game.XUserName) { $currentLabel = "X (@$($game.XUserName))" }
        if ($currentLabel -eq 'O' -and $game.OUserName) { $currentLabel = "O (@$($game.OUserName))" }
    }
    $statusText = "$script:TTT_GAME **Tic-Tac-Toe** (Move $($game.moves))`n" +
                  "Current Player: **$currentLabel**`n`n$boardText"
    
    Save-TicTacToeState
    return @{
        success = $true
        message = $statusText
        keyboard = $null  # Keyboard will be generated per-player in govnobot callback handler
        gameOver = $false
        game = $game
    }
}

# Export functions for integration with govnobot.ps1 (only when imported as a module)
if ($ExecutionContext -and $ExecutionContext.SessionState -and $ExecutionContext.SessionState.Module) {
    Export-ModuleMember -Function Initialize-TicTacToeGame, Get-GameById, Find-UserActiveGame, Find-JoinableGame, Handle-TicTacToeMove, Join-TicTacToeAny, Get-TicTacToeKeyboard, Format-TicTacToeBoard, Save-TicTacToeState, Load-TicTacToeState
}