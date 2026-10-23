[CmdletBinding()]
param([string]$CodexHome)
$ErrorActionPreference='Stop'
$arguments=@((Join-Path $PSScriptRoot 'setup.cjs'),'verify')
if($CodexHome){$arguments+=@('--home',$CodexHome)}
& node @arguments
exit $LASTEXITCODE
