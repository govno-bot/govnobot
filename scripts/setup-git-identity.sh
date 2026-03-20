#!/usr/bin/env bash
# Set local git identity for this repository
# Usage: ./scripts/setup-git-identity.sh [name] [email]

NAME=${1:-govno-bot}
EMAIL=${2:-govnobot@proton.me}

echo "Setting local git user.name=$NAME and user.email=$EMAIL"
git config user.name "$NAME"
git config user.email "$EMAIL"

echo "Done. Current local git config:" 
git config --local --get user.name | sed 's/^/ user.name -> /'
git config --local --get user.email | sed 's/^/ user.email -> /'

echo "Note: This updates the repository-local git config (.git/config). Use --global to set user-wide config if desired."
