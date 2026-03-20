param(
  [string]$Name = "govno-bot",
  [string]$Email = "govnobot@proton.me"
)

Write-Host "Setting local git identity for this repository..."
git config user.name "$Name"
git config user.email "$Email"

Write-Host "Done. Current local git config:" 
git config --local --get user.name | ForEach-Object { Write-Host " user.name -> $_" }
git config --local --get user.email | ForEach-Object { Write-Host " user.email -> $_" }

Write-Host "Note: this updates the repository-local git config (.git/config). Use --global to set user-wide config if desired." 
