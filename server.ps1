param(
  [string]$Root = ".",
  [int]$Port = 8080
)

# Servidor estatico minimo em TcpListener puro.
# Nao usa HttpListener de proposito: aquele exige reserva de URL (netsh) fora de admin.

$ErrorActionPreference = 'Stop'
$Root = (Resolve-Path $Root).Path

$mime = @{
  '.html' = 'text/html; charset=utf-8'
  '.css'  = 'text/css; charset=utf-8'
  '.js'   = 'application/javascript; charset=utf-8'
  '.json' = 'application/json; charset=utf-8'
  '.svg'  = 'image/svg+xml'
  '.png'  = 'image/png'
  '.jpg'  = 'image/jpeg'
  '.ico'  = 'image/x-icon'
  '.md'   = 'text/plain; charset=utf-8'
}

# Escuta em IPv6 e IPv4 ao mesmo tempo. So IPv4 nao basta: no Windows "localhost"
# resolve primeiro para ::1 e o pedido morria em timeout (o Chrome disfarca com
# fallback, outros clientes nao). Serve apenas arquivos estaticos do projeto.
$listener = [System.Net.Sockets.TcpListener]::new([System.Net.IPAddress]::IPv6Any, $Port)
$listener.Server.SetSocketOption([System.Net.Sockets.SocketOptionLevel]::IPv6, [System.Net.Sockets.SocketOptionName]::IPv6Only, $false)
$listener.Start()
Write-Host "Servindo $Root em http://localhost:$Port/"

while ($true) {
  $client = $listener.AcceptTcpClient()
  try {
    # O navegador abre sockets por antecipacao e nao manda nada neles. Num servidor
    # sequencial cada socket ocioso trava o loop ate o timeout, e a pagina nunca carrega.
    # Poll descarta esses sockets em 200ms em vez de segundos.
    # 1,5s: curto o bastante para nao travar o loop, longo o bastante para nao
    # matar conexao legitima que demora a mandar o request (dava ERR_CONNECTION_RESET).
    if (-not $client.Client.Poll(1500000, [System.Net.Sockets.SelectMode]::SelectRead)) {
      $client.Close(); continue
    }

    $client.ReceiveTimeout = 2000
    $stream = $client.GetStream()

    # Le a request line (o suficiente: so precisamos do path)
    $sb = New-Object System.Text.StringBuilder
    $buf = New-Object byte[] 1
    while ($stream.Read($buf, 0, 1) -eq 1) {
      $ch = [char]$buf[0]
      if ($ch -eq "`n") { break }
      if ($ch -ne "`r") { [void]$sb.Append($ch) }
    }
    $requestLine = $sb.ToString()
    if (-not $requestLine) { $client.Close(); continue }

    $parts = $requestLine.Split(' ')
    $rawPath = if ($parts.Length -ge 2) { $parts[1] } else { '/' }
    $rawPath = $rawPath.Split('?')[0]
    $rel = [System.Uri]::UnescapeDataString($rawPath).TrimStart('/')
    if ([string]::IsNullOrWhiteSpace($rel)) { $rel = 'index.html' }
    $rel = $rel -replace '/', '\'

    $full = Join-Path $Root $rel
    $resolved = $null
    try { $resolved = (Resolve-Path $full -ErrorAction Stop).Path } catch { $resolved = $null }

    # Barra path traversal: o alvo tem que ficar dentro de $Root
    if ($resolved -and -not $resolved.StartsWith($Root, [StringComparison]::OrdinalIgnoreCase)) {
      $resolved = $null
    }

    if ($resolved -and (Test-Path $resolved -PathType Leaf)) {
      $bytes = [System.IO.File]::ReadAllBytes($resolved)
      $ext = [System.IO.Path]::GetExtension($resolved).ToLower()
      $ctype = if ($mime.ContainsKey($ext)) { $mime[$ext] } else { 'application/octet-stream' }
      $head = "HTTP/1.1 200 OK`r`nContent-Type: $ctype`r`nContent-Length: $($bytes.Length)`r`nCache-Control: no-cache`r`nConnection: close`r`n`r`n"
      Write-Host "200 $rawPath"
    }
    else {
      $bytes = [System.Text.Encoding]::UTF8.GetBytes('404 Not Found')
      $head = "HTTP/1.1 404 Not Found`r`nContent-Type: text/plain; charset=utf-8`r`nContent-Length: $($bytes.Length)`r`nConnection: close`r`n`r`n"
      Write-Host "404 $rawPath"
    }

    $headBytes = [System.Text.Encoding]::ASCII.GetBytes($head)
    $stream.Write($headBytes, 0, $headBytes.Length)
    $stream.Write($bytes, 0, $bytes.Length)
    $stream.Flush()

    # Fechar o socket direto descarta o que ainda esta no buffer de saida e trunca a
    # resposta (o index.html chegava pela metade). Shutdown(Send) + Linger garantem
    # que o envio termina antes do close.
    $client.LingerState = [System.Net.Sockets.LingerOption]::new($true, 5)
    $client.Client.Shutdown([System.Net.Sockets.SocketShutdown]::Send)
  }
  catch {
    Write-Host "erro: $($_.Exception.Message)"
  }
  finally {
    $client.Close()
  }
}
