# Azure Deployment Setup for Aegis AO Rental Admin

This guide will help you deploy the Aegis AO Rental Admin Dashboard to Azure Static Web Apps.

## 📋 Prerequisites

- GitHub repository: `https://github.com/aegisaosoft/aegis-ao-rental-admin`
- Azure subscription with appropriate permissions
- Azure Static Web Apps service (will be created automatically)

## 🎯 Step 1: Create Azure Static Web App

### Using Azure Portal:

1. Go to [Azure Portal](https://portal.azure.com)
2. Click **"+ Create a resource"** or **"Create"**
3. Search for **"Static Web App"**
4. Click **"Create"**
5. Fill in the details:
   - **Subscription**: Your Azure subscription
   - **Resource Group**: `aegis-ao-rental` (or create new one)
   - **Name**: `aegis-ao-rental-admin`
   - **Plan type**: Free or Standard
   - **Region**: Choose your preferred region
6. In the **Deployment details** section:
   - **Source**: GitHub
   - **GitHub account**: Sign in to GitHub
   - **Organization**: aegisaosoft
   - **Repository**: aegis-ao-rental-admin
   - **Branch**: main
   - **Build presets**: React
   - **App location**: `/` (root)
   - **Api location**: (leave empty)
   - **Output location**: `build`
7. Click **"Review + create"**
8. Click **"Create"**

### Using Azure CLI:

```bash
# Login to Azure
az login

# Create resource group (if doesn't exist)
az group create --name aegis-ao-rental --location canadacentral

# Create Static Web App
az staticwebapp create \
  --name aegis-ao-rental-admin \
  --resource-group aegis-ao-rental \
  --sku Free \
  --branch main \
  --app-location "/" \
  --output-location "build" \
  --login-with-github
```

## 🔐 Step 2: Configure GitHub Secret

After creating the Static Web App, Azure will automatically add the deployment token to your GitHub repository:

1. Go to your Static Web App in Azure Portal
2. Click on **"Deployment token"** in the left menu
3. Copy the token
4. Go to your GitHub repository: `https://github.com/aegisaosoft/aegis-ao-rental-admin`
5. Click **Settings** → **Secrets and variables** → **Actions**
6. You should see `AZURE_STATIC_WEB_APPS_API_TOKEN` already added
7. If not, click **"New repository secret"** and add it manually

**Note**: Azure usually adds this automatically when you create the Static Web App with GitHub integration.

## 🔧 Step 3: Configure Environment Variables (Optional)

If you need to set environment variables for your React app:

1. Go to your Static Web App in Azure Portal
2. Click on **"Configuration"** in the left menu
3. Under **"Environment variables"**, click **"+ Add"**
4. Add your environment variables:
   - Name: `REACT_APP_API_URL`
   - Value: `https://aegis-ao-rental-h4hda5gmengyhyc9.canadacentral-01.azurewebsites.net/api`
5. Click **"OK"** and **"Save"**

**Important**: Azure Static Web Apps requires environment variables to be prefixed with `REACT_APP_` for Create React App.

## 🚀 Step 4: Trigger Deployment

Deployment happens automatically when you:

### Option A: Push to main branch
```bash
cd C:\aegis-ao\rental\aegis-ao-rental-admin
git add .
git commit -m "Your commit message"
git push origin main
```

### Option B: Manual trigger

1. Go to GitHub: `https://github.com/aegisaosoft/aegis-ao-rental-admin/actions`
2. Select the **"Deploy to Azure Static Web Apps"** workflow
3. Click **"Run workflow"**
4. Select branch: `main`
5. Click **"Run workflow"**

## 📊 Step 5: Monitor Deployment

1. Go to GitHub Actions: `https://github.com/aegisaosoft/aegis-ao-rental-admin/actions`
2. Click on the running workflow
3. Watch the deployment logs
4. Wait for it to complete

## ✅ Step 6: Access Your App

After deployment completes, access your app at:

```
https://<your-app-name>.azurestaticapps.net
```

Or get your URL from Azure Portal:
1. Go to your Static Web App
2. Click **"Overview"**
3. Copy the **"URL"**

## 🔍 Troubleshooting

### Common Issues:

#### 1. Build Fails
**Solution:**
- Check GitHub Actions logs
- Verify `package.json` has correct scripts
- Ensure Node.js version is compatible
- Make sure all dependencies are listed in `package.json`

#### 2. App Returns 404 Errors
**Solution:**
- Verify `output_location` is set to `build`
- Check that React Router is configured for client-side routing
- Add `staticwebapp.config.json` for routing rules (see below)

#### 3. Environment Variables Not Working
**Solution:**
- Variables must be prefixed with `REACT_APP_`
- Check Azure Portal → Configuration → Environment variables
- Rebuild and redeploy after changing variables

## 📝 Additional Configuration Files

### staticwebapp.config.json (Optional)

If you need custom routing or headers, create `staticwebapp.config.json` in the root:

```json
{
  "navigationFallback": {
    "rewrite": "/index.html",
    "exclude": ["/api/*"]
  },
  "routes": [
    {
      "route": "/*",
      "headers": {
        "cache-control": "public, max-age=31536000, immutable"
      }
    }
  ],
  "responseOverrides": {
    "404": {
      "rewrite": "/index.html",
      "statusCode": 200
    }
  }
}
```

## 🎉 Success Checklist

- [ ] Azure Static Web App created
- [ ] GitHub repository connected
- [ ] Deployment token added to GitHub secrets
- [ ] Environment variables configured (if needed)
- [ ] Code pushed to main branch
- [ ] GitHub Actions workflow running successfully
- [ ] App accessible at Azure URL
- [ ] Authentication working correctly

## 📚 Additional Resources

- [Azure Static Web Apps Documentation](https://docs.microsoft.com/en-us/azure/static-web-apps/)
- [React App Deployment Guide](https://docs.microsoft.com/en-us/azure/static-web-apps/getting-started?tabs=react)
- [GitHub Actions Workflows](https://docs.github.com/en/actions)

