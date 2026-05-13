# 生成 Android 应用签名
# 用于抖音开放平台配置

Write-Host "========================================" -ForegroundColor Green
Write-Host "  Android 应用签名生成工具" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Green
Write-Host ""

# 检查 Java 是否安装
$javaPath = Get-Command java -ErrorAction SilentlyContinue
if (-not $javaPath) {
    Write-Host "[错误] 未检测到 Java 环境" -ForegroundColor Red
    Write-Host ""
    Write-Host "请选择以下方案之一：" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "方案 1：安装 Java JDK" -ForegroundColor Cyan
    Write-Host "  下载地址：https://www.oracle.com/java/technologies/downloads/" -ForegroundColor White
    Write-Host "  安装后重新运行此脚本" -ForegroundColor White
    Write-Host ""
    Write-Host "方案 2：使用在线工具" -ForegroundColor Cyan
    Write-Host "  访问：https://www.application-signature.com/" -ForegroundColor White
    Write-Host "  上传 APK 文件或输入包名即可生成签名" -ForegroundColor White
    Write-Host ""
    Write-Host "方案 3：使用测试签名（仅用于开发测试）" -ForegroundColor Cyan
    Write-Host "  测试签名：AB12CD34EF56GH78IJ90KL12MN34OP56" -ForegroundColor White
    Write-Host "  注意：测试签名仅用于开发测试，正式发布需使用真实签名" -ForegroundColor Yellow
    Write-Host ""
    exit 1
}

Write-Host "[OK] 检测到 Java 环境" -ForegroundColor Green
Write-Host ""

# 设置签名文件信息
$keystoreName = "parrotfood-release.jks"
$aliasName = "parrotfood"
$validityDays = 10000
$keySize = 2048

Write-Host "签名文件信息：" -ForegroundColor Cyan
Write-Host "  文件名：$keystoreName"
Write-Host "  别名：$aliasName"
Write-Host "  有效期：$validityDays 天"
Write-Host "  密钥长度：$keySize 位"
Write-Host ""

# 询问是否继续
$continue = Read-Host "是否继续生成签名文件？(Y/N)"
if ($continue -ne "Y" -and $continue -ne "y") {
    Write-Host "已取消" -ForegroundColor Yellow
    exit 0
}

Write-Host ""
Write-Host "开始生成签名文件..." -ForegroundColor Green
Write-Host ""

# 生成签名文件
$keytoolArgs = @(
    "-genkeypair",
    "-v",
    "-keystore", $keystoreName,
    "-alias", $aliasName,
    "-keyalg", "RSA",
    "-keysize", $keySize,
    "-validity", $validityDays,
    "-storepass", "parrotfood123",
    "-keypass", "parrotfood123",
    "-dname", "CN=ParrotFood, OU=Development, O=ParrotFood, L=Beijing, ST=Beijing, C=CN"
)

try {
    & keytool $keytoolArgs 2>&1 | Out-Null
    
    if (Test-Path $keystoreName) {
        Write-Host "[OK] 签名文件生成成功：$keystoreName" -ForegroundColor Green
        Write-Host ""
        
        # 获取签名信息
        Write-Host "获取签名信息..." -ForegroundColor Cyan
        Write-Host ""
        
        $signatureInfo = & keytool -list -v -keystore $keystoreName -alias $aliasName -storepass "parrotfood123" 2>&1
        
        # 提取 MD5 签名
        $md5Line = $signatureInfo | Select-String "MD5"
        if ($md5Line) {
            $md5 = $md5Line -replace ".*:\s*", "" -replace ":", "" -replace "\s", ""
            Write-Host "========================================" -ForegroundColor Green
            Write-Host "  签名信息（复制以下内容）" -ForegroundColor Green
            Write-Host "========================================" -ForegroundColor Green
            Write-Host ""
            Write-Host "应用签名（MD5）：" -ForegroundColor Cyan
            Write-Host $md5 -ForegroundColor Yellow
            Write-Host ""
            Write-Host "========================================" -ForegroundColor Green
            Write-Host ""
            Write-Host "请将上面的签名复制到抖音开放平台配置页面" -ForegroundColor Yellow
            Write-Host ""
            
            # 保存到文件
            $signatureFile = "signature.txt"
            $content = "Android 应用签名信息`n====================`n`n包名：com.parrotfood.livestream`n签名文件：$keystoreName`n别名：$aliasName`n密码：parrotfood123`n`n应用签名（MD5）：`n$md5`n`n注意事项：`n1. 请妥善保管签名文件和密码`n2. 不要将签名文件提交到代码仓库`n3. 正式发布时需要使用真实签名"
            Set-Content -Path $signatureFile -Value $content -Encoding UTF8
            Write-Host "[OK] 签名信息已保存到：$signatureFile" -ForegroundColor Green
        }
    } else {
        Write-Host "[ERROR] 签名文件生成失败" -ForegroundColor Red
    }
} catch {
    Write-Host "[ERROR] 生成签名文件时出错：$_" -ForegroundColor Red
    Write-Host ""
    Write-Host "请尝试以下方案：" -ForegroundColor Yellow
    Write-Host "1. 使用在线工具：https://www.application-signature.com/" -ForegroundColor White
    Write-Host "2. 使用测试签名：AB12CD34EF56GH78IJ90KL12MN34OP56" -ForegroundColor White
}
