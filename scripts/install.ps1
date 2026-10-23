[CmdletBinding()]
param([string]$CodexHome,[string]$SourceRoot)
$ErrorActionPreference='Stop'
$arguments=@((Join-Path $PSScriptRoot 'setup.cjs'),'install')
if($CodexHome){$arguments+=@('--home',$CodexHome)}
if($SourceRoot){$arguments+=@('--source-root',$SourceRoot)}
& node @arguments
exit $LASTEXITCODE
