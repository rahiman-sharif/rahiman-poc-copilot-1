# PowerShell Script to Update Views with Modern Header/Footer
# This script helps convert existing EJS views to use the new partials

Write-Host "🚀 Vikram Steels View Updater" -ForegroundColor Green
Write-Host "=================================" -ForegroundColor Green
Write-Host ""

$viewsPath = "c:\My PC\Copilot\New folder\rahiman-poc-copilot-1\views"
$backupPath = "$viewsPath\backup-$(Get-Date -Format 'yyyyMMdd-HHmmss')"

# Create backup directory
Write-Host "📦 Creating backup directory..." -ForegroundColor Yellow
New-Item -ItemType Directory -Path $backupPath -Force | Out-Null

# Function to update a view file
function Update-ViewFile {
    param(
        [string]$FilePath,
        [string]$PageTitle,
        [string]$PageDescription
    )
    
    $fileName = Split-Path $FilePath -Leaf
    $backupFile = Join-Path $backupPath $fileName
    
    Write-Host "🔄 Processing: $fileName" -ForegroundColor Cyan
    
    # Backup original file
    Copy-Item $FilePath $backupFile
    
    # Read the original content
    $content = Get-Content $FilePath -Raw
    
    # Extract the main content (everything between <body> and </body>)
    if ($content -match '(?s)<body[^>]*>(.*)</body>') {
        $bodyContent = $matches[1]
        
        # Remove existing header/footer if present
        $bodyContent = $bodyContent -replace '(?s)<header[^>]*>.*?</header>', ''
        $bodyContent = $bodyContent -replace '(?s)<footer[^>]*>.*?</footer>', ''
        
        # Create new file with partials
        $newContent = @"
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title><%= title %></title>
    <link rel="stylesheet" href="/css/style.css">
    <%- include('partials/styles') %>
</head>
<body>
    <%- include('partials/header') %>

    <main class="main-content">
        $bodyContent
    </main>

    <%- include('partials/footer') %>
    <%- include('partials/scripts') %>
</body>
</html>
"@
        
        # Write the new content
        Set-Content $FilePath $newContent -Encoding UTF8
        Write-Host "✅ Updated: $fileName" -ForegroundColor Green
    } else {
        Write-Host "⚠️ Could not parse: $fileName" -ForegroundColor Red
    }
}

# List of main views to update
$mainViews = @(
    @{ Path = "$viewsPath\welcome.ejs"; Title = "Welcome"; Description = "Welcome to Vikram Steels" },
    @{ Path = "$viewsPath\error.ejs"; Title = "Error"; Description = "An error occurred" }
)

# List of feature views to update
$featureViews = @(
    @{ Path = "$viewsPath\bills\index.ejs"; Title = "Bills Management"; Description = "Manage your bills and invoices" },
    @{ Path = "$viewsPath\bills\form.ejs"; Title = "Create Bill"; Description = "Create a new bill" },
    @{ Path = "$viewsPath\quotations\index.ejs"; Title = "Quotations"; Description = "Manage customer quotations" },
    @{ Path = "$viewsPath\quotations\form.ejs"; Title = "Create Quotation"; Description = "Create a new quotation" },
    @{ Path = "$viewsPath\customers\index.ejs"; Title = "Customers"; Description = "Manage customer database" },
    @{ Path = "$viewsPath\customers\form.ejs"; Title = "Customer Form"; Description = "Add or edit customer" },
    @{ Path = "$viewsPath\items\index.ejs"; Title = "Inventory"; Description = "Manage your product inventory" },
    @{ Path = "$viewsPath\items\form.ejs"; Title = "Item Form"; Description = "Add or edit product" },
    @{ Path = "$viewsPath\stock\index.ejs"; Title = "Stock Management"; Description = "Monitor stock levels" },
    @{ Path = "$viewsPath\reports\index.ejs"; Title = "Reports"; Description = "Business analytics and reports" },
    @{ Path = "$viewsPath\settings\index.ejs"; Title = "Settings"; Description = "Application settings" },
    @{ Path = "$viewsPath\users\index.ejs"; Title = "User Management"; Description = "Manage system users" }
)

Write-Host "🔧 Starting view updates..." -ForegroundColor Yellow
Write-Host ""

# Update main views
Write-Host "📄 Updating main views..." -ForegroundColor Magenta
foreach ($view in $mainViews) {
    if (Test-Path $view.Path) {
        Update-ViewFile -FilePath $view.Path -PageTitle $view.Title -PageDescription $view.Description
    }
}

# Update feature views
Write-Host ""
Write-Host "🏢 Updating feature views..." -ForegroundColor Magenta
foreach ($view in $featureViews) {
    if (Test-Path $view.Path) {
        Update-ViewFile -FilePath $view.Path -PageTitle $view.Title -PageDescription $view.Description
    }
}

Write-Host ""
Write-Host "🎉 Update Complete!" -ForegroundColor Green
Write-Host "📦 Backup created at: $backupPath" -ForegroundColor Yellow
Write-Host ""
Write-Host "💡 What was updated:" -ForegroundColor Cyan
Write-Host "   ✓ Added modern header and footer partials" -ForegroundColor Green
Write-Host "   ✓ Applied consistent styling across all pages" -ForegroundColor Green
Write-Host "   ✓ Backed up original files for safety" -ForegroundColor Green
Write-Host ""
Write-Host "🚀 Your application now has a consistent modern design!" -ForegroundColor Green
