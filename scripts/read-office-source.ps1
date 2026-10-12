param([Parameter(Mandatory = $true)][string]$SourcePath)

$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName System.IO.Compression

# This reader opens the source read-only and returns JSON on stdout. It never writes files.
$resolvedSource = (Resolve-Path -LiteralPath $SourcePath).ProviderPath
[Console]::OutputEncoding = [Text.UTF8Encoding]::new($false)

$sourceStream = [IO.File]::Open($resolvedSource, [IO.FileMode]::Open, [IO.FileAccess]::Read, [IO.FileShare]::ReadWrite)
$archive = $null
try {
    $archive = [IO.Compression.ZipArchive]::new($sourceStream, [IO.Compression.ZipArchiveMode]::Read, $false)
    $script:readBudget = 64MB
    function Read-EntryXml([string]$name) {
        $entry = $archive.GetEntry($name)
        if ($null -eq $entry) { return $null }
        if ($entry.Length -gt 10MB -or $entry.Length -gt $script:readBudget) { throw 'Office XML exceeds the bounded extraction limit' }
        $script:readBudget -= $entry.Length
        $settings = [Xml.XmlReaderSettings]::new()
        $settings.DtdProcessing = [Xml.DtdProcessing]::Prohibit
        $settings.XmlResolver = $null
        $settings.MaxCharactersInDocument = 10MB
        $entryStream = $entry.Open()
        $reader = $null
        try {
            $reader = [Xml.XmlReader]::Create($entryStream, $settings)
            $document = [Xml.XmlDocument]::new()
            $document.XmlResolver = $null
            $document.Load($reader)
            return ,$document
        } finally {
            if ($null -ne $reader) { $reader.Dispose() }
            $entryStream.Dispose()
        }
    }
    $extension = [IO.Path]::GetExtension($resolvedSource).ToLowerInvariant()
    if ($extension -eq '.xlsx' -or $extension -eq '.xlsm') {
        $workbook = Read-EntryXml 'xl/workbook.xml'
        $relationships = Read-EntryXml 'xl/_rels/workbook.xml.rels'
        if ($null -eq $workbook -or $null -eq $relationships) { throw 'Missing workbook metadata' }
        $shared = Read-EntryXml 'xl/sharedStrings.xml'
        $strings = @()
        if ($null -ne $shared) { $strings = @($shared.SelectNodes("//*[local-name()='si']") | ForEach-Object { ($_.SelectNodes(".//*[local-name()='t']") | ForEach-Object { $_.InnerText }) -join '' }) }
        $sheets = @()
        foreach ($sheet in $workbook.SelectNodes("//*[local-name()='sheets']/*[local-name()='sheet']")) {
            $relationshipId = $sheet.GetAttribute('id', 'http://schemas.openxmlformats.org/officeDocument/2006/relationships')
            $relation = @($relationships.DocumentElement.ChildNodes | Where-Object { $_.GetAttribute('Id') -eq $relationshipId })
            if ($relation.Count -ne 1 -or $relation[0].GetAttribute('TargetMode') -eq 'External') { throw 'Invalid or external worksheet relationship' }
            $entryUri = [Uri]::new([Uri]'https://office.invalid/xl/workbook.xml', $relation[0].GetAttribute('Target'))
            if ($entryUri.Host -ne 'office.invalid') { throw 'External worksheet target' }
            $entryPath = [Uri]::UnescapeDataString($entryUri.AbsolutePath.TrimStart('/'))
            $worksheet = Read-EntryXml $entryPath
            if ($null -eq $worksheet) { throw 'Missing worksheet XML' }
            $cells = @()
            foreach ($cell in $worksheet.SelectNodes("//*[local-name()='sheetData']/*[local-name()='row']/*[local-name()='c']")) {
                $valueNode = $cell.SelectSingleNode("./*[local-name()='v']")
                $formula = $cell.SelectSingleNode("./*[local-name()='f']")
                $raw = if ($null -eq $valueNode) { $null } else { $valueNode.InnerText }
                $value = $raw
                if ($cell.GetAttribute('t') -eq 's' -and $null -ne $raw) {
                    $stringIndex = 0
                    if (![int]::TryParse($raw, [ref]$stringIndex) -or $stringIndex -lt 0 -or $stringIndex -ge $strings.Count) { throw 'Invalid shared string index' }
                    $value = $strings[$stringIndex]
                } elseif ($cell.GetAttribute('t') -eq 'inlineStr') {
                    $value = ($cell.SelectNodes("./*[local-name()='is']//*[local-name()='t']") | ForEach-Object { $_.InnerText }) -join ''
                }
                $cells += [ordered]@{ address = $cell.GetAttribute('r'); type = $cell.GetAttribute('t'); style = $cell.GetAttribute('s'); value = $value; cachedRawValue = $raw; formula = $(if ($null -eq $formula) { $null } else { $formula.InnerText }) }
            }
            $sheets += [ordered]@{ name = $sheet.GetAttribute('name'); state = $sheet.GetAttribute('state'); cells = $cells }
        }
        $result = [ordered]@{ kind = 'workbook'; sheets = $sheets; warnings = @('Values and date serials remain raw strings; number formats are not rendered.', 'Formulas and macros are not executed; cached formula results may be stale.', 'Hidden sheets are included; images and charts need visual review.') }
    } elseif ($extension -eq '.docx' -or $extension -eq '.pptx') {
        $prefix = if ($extension -eq '.docx') { 'word/' } else { 'ppt/slides/' }
        $parts = @()
        foreach ($entry in ($archive.Entries | Where-Object { $_.FullName.StartsWith($prefix) -and $_.FullName.EndsWith('.xml') } | Sort-Object FullName)) {
            $document = Read-EntryXml $entry.FullName
            $parts += [ordered]@{ part = $entry.FullName; text = @($document.SelectNodes("//*[local-name()='t']") | ForEach-Object { $_.InnerText }) }
        }
        if ($parts.Count -eq 0) { throw 'No supported document text parts' }
        $result = [ordered]@{ kind = 'office-document'; parts = $parts; warnings = @('Text extraction does not reproduce layout, images, or embedded objects.', 'External references and macros are not executed.') }
    } else { throw 'Unsupported Office format' }
    $result | ConvertTo-Json -Depth 20 -Compress
} finally {
    if ($null -ne $archive) { $archive.Dispose() }
    $sourceStream.Dispose()
}
