#!/usr/bin/env pwsh

param (
    [Parameter(Mandatory=$true)]
    [string]$Name
)

$Slug = $Name.ToLower().Replace(" ", "-")
$BaseDir = Join-Path $PSScriptRoot ".." ".." ".." ".agent" "skills"
$SkillDir = Join-Path $BaseDir $Slug

if (Test-Path $SkillDir) {
    Write-Error "La habilidad '$Slug' ya existe en $SkillDir"
    exit 1
}

New-Item -ItemType Directory -Path "$SkillDir/scripts", "$SkillDir/resources", "$SkillDir/examples" -Force

$TemplatePath = Join-Path $PSScriptRoot ".." "resources" "SKILL_TEMPLATE.md"
$DestPath = Join-Path $SkillDir "SKILL.md"

if (Test-Path $TemplatePath) {
    Copy-Item -Path $TemplatePath -Destination $DestPath
    Write-Host "✅ Habilidad '$Name' creada exitosamente en $SkillDir"
} else {
    New-Item -ItemType File -Path $DestPath -Value "---`nname: $Name`ndescription: Nueva habilidad`n---`n`n# $Name"
    Write-Host "⚠️ Plantilla no encontrada. Creado SKILL.md básico en $SkillDir"
}
