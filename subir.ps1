<#
    Sube el proyecto a GitHub sin sorpresas.

    Uso, desde PowerShell en la carpeta del repo:
        .\subir.ps1 "Mensaje del commit"

    Hace, en orden y parándose al primer problema:
      1. quita .git\index.lock si quedó huérfano (pasa cuando Claude corre git
         desde su VM Linux, que no puede borrar archivos en D:),
      2. compila con npm run build — si falla, no sube nada,
      3. git add -A, commit y push a main.
#>

param(
    [Parameter(Mandatory = $true, Position = 0)]
    [string]$Mensaje
)

$ErrorActionPreference = 'Stop'
Set-Location -Path $PSScriptRoot

function Paso($texto) { Write-Host "`n==> $texto" -ForegroundColor Cyan }

# --- 1. lock huérfano -------------------------------------------------------
if (Test-Path '.git\index.lock') {
    if (Get-Process git -ErrorAction SilentlyContinue) {
        throw 'Hay un proceso git corriendo. Ciérralo antes de volver a intentar.'
    }
    Remove-Item '.git\index.lock' -Force
    Write-Host 'Quitado .git\index.lock (estaba huérfano).' -ForegroundColor Yellow
}

# --- 2. compilar ------------------------------------------------------------
Paso 'npm run build'
npm run build
if ($LASTEXITCODE -ne 0) { throw 'npm run build falló. No se subió nada.' }

# --- 3. subir ---------------------------------------------------------------
Paso 'git add -A'
git add -A
if ($LASTEXITCODE -ne 0) { throw 'git add falló.' }

$pendientes = git status --porcelain
if (-not $pendientes) {
    Write-Host "`nNo hay cambios que subir." -ForegroundColor Yellow
    exit 0
}

Paso 'git commit'
git commit -m $Mensaje
if ($LASTEXITCODE -ne 0) { throw 'git commit falló.' }

Paso 'git push origin main'
git push origin main
if ($LASTEXITCODE -ne 0) { throw 'El push falló. El commit quedó hecho en local.' }

Write-Host "`nListo: subido a main." -ForegroundColor Green
