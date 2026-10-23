[CmdletBinding()]
param([string]$CodexHome,[string]$Journal)
$ErrorActionPreference='Stop'
$arguments=@((Join-Path $PSScriptRoot 'setup.cjs'),'rollback')
if($CodexHome){$arguments+=@('--home',$CodexHome)}
if($Journal){$arguments+=@('--journal',$Journal)}
& node @arguments
exit $LASTEXITCODE
