function MkDir($d) {
	if (!(Test-Path -Path $d)) {
		echo "Create Missing Directory: $d"
		New-Item -ItemType directory -Path (Split-Path -Path $d -Parent) -Name (Split-Path -Path $d -Leaf) -Force | Out-Null
	}
}
function RimDir($d) {
	if (Test-Path -Path $d) {
		echo "Remove Unexpect Directory: $d"
		Remove-Item -Recurse -Force $d
	}
}

function setSystemVar($Name, $Value) {
	try {
		Set-Variable -Option AllScope, Constant -Force -Scope Global -Name $Name -Value $Value
	} catch {
		Set-Variable -Option AllScope -Force -Scope Global -Name $Name -Value $Value
	}
	New-Item -Path env:\$Name -value "$Value" -Force | Out-Null
}

function resolvePath() {
	param (
		[parameter(Mandatory = $true)] [String[]] $Parent,
		[parameter(Mandatory = $true, ValueFromRemainingArguments = $true)] [String[]] $childrens
	)

	$current = $Parent
	foreach ($element in $childrens) {
		$current = (Join-Path $current $element)
	}

	return ([IO.Path]::GetFullPath($current))
}

function downloadFile() {
	param (
		[parameter(Mandatory = $true)] [String] $Uri,
		[parameter(Mandatory = $true)] [String] $resultDownload
	)

	if (!(Test-Path -Path $resultDownload)) {
		echo "Downloading file From: $Uri, To: $resultDownload"
		$tempDownload = "${resultDownload}.partial"
		[Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12
		Invoke-WebRequest -Uri $Uri -OutFile $tempDownload -Proxy $proxy
		Rename-Item -Path $tempDownload -NewName $resultDownload -Force
	} else {
		echo "Downloaded file: $resultDownload"
	}
}