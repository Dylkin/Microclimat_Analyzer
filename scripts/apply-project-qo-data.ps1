$ErrorActionPreference = 'Stop'

$rootDir = Split-Path -Parent $PSScriptRoot
$sqlFile = Join-Path $rootDir 'supabase\migrations\20260201000000_add_project_qualification_object_data.sql'

if (-not (Test-Path $sqlFile)) {
  throw "SQL file not found: $sqlFile"
}

$dbHost = $env:DB_HOST
if (-not $dbHost) { $dbHost = 'localhost' }

$dbPort = $env:DB_PORT
if (-not $dbPort) { $dbPort = '5432' }

$dbName = $env:DB_NAME
if (-not $dbName) { $dbName = 'microclimat' }

$dbUser = $env:DB_USER
if (-not $dbUser) { $dbUser = 'postgres' }

Write-Host "Applying migration: $sqlFile"
& psql "host=$dbHost port=$dbPort dbname=$dbName user=$dbUser" -f $sqlFile
Write-Host "Done."
