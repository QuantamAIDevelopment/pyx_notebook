# Azure Deployment Guide

## Prerequisites
- Azure CLI installed: `az login`
- Azure subscription active
- Bash shell (WSL on Windows)

## Quick Deploy

```bash
chmod +x deploy-azure.sh
./deploy-azure.sh
```

This script will:
1. Create resource group
2. Set up Azure Container Registry
3. Create PostgreSQL Flexible Server
4. Build and push Docker images
5. Deploy to Azure Container Apps
6. Configure networking and CORS

## Manual Deployment Steps

### 1. Create Resources
```bash
RESOURCE_GROUP="notebook-rg"
LOCATION="eastus"

az group create --name $RESOURCE_GROUP --location $LOCATION
```

### 2. Create Container Registry
```bash
ACR_NAME="notebookacr"
az acr create --resource-group $RESOURCE_GROUP --name $ACR_NAME --sku Basic --admin-enabled true
```

### 3. Create PostgreSQL Database
```bash
az postgres flexible-server create \
  --resource-group $RESOURCE_GROUP \
  --name notebook-postgres \
  --admin-user adminuser \
  --admin-password <YOUR_PASSWORD> \
  --sku-name Standard_B1ms
```

### 4. Build Images
```bash
az acr build --registry $ACR_NAME --image notebook-backend:latest --file backend/Dockerfile.prod backend/
az acr build --registry $ACR_NAME --image notebook-frontend:latest --file frontend/Dockerfile.prod frontend/
```

### 5. Deploy Container Apps
```bash
az containerapp env create --name notebook-env --resource-group $RESOURCE_GROUP --location $LOCATION

az containerapp create \
  --name notebook-backend \
  --resource-group $RESOURCE_GROUP \
  --environment notebook-env \
  --image $ACR_NAME.azurecr.io/notebook-backend:latest \
  --target-port 8000 \
  --ingress external \
  --env-vars DATABASE_URL="<CONNECTION_STRING>"

az containerapp create \
  --name notebook-frontend \
  --resource-group $RESOURCE_GROUP \
  --environment notebook-env \
  --image $ACR_NAME.azurecr.io/notebook-frontend:latest \
  --target-port 80 \
  --ingress external
```

## Cost Estimate
- Container Apps: ~$30-50/month
- PostgreSQL Flexible Server (B1ms): ~$15/month
- Container Registry (Basic): ~$5/month
- **Total: ~$50-70/month**

## CI/CD with GitHub Actions
1. Create Azure Service Principal:
```bash
az ad sp create-for-rbac --name "notebook-deploy" --role contributor \
  --scopes /subscriptions/<SUBSCRIPTION_ID>/resourceGroups/$RESOURCE_GROUP \
  --sdk-auth
```

2. Add secrets to GitHub:
   - `AZURE_CREDENTIALS`
   - `ACR_NAME`
   - `AZURE_RESOURCE_GROUP`

3. Push to main branch to trigger deployment

## Monitoring
```bash
# View logs
az containerapp logs show --name notebook-backend --resource-group $RESOURCE_GROUP --follow

# Check status
az containerapp show --name notebook-backend --resource-group $RESOURCE_GROUP
```

## Cleanup
```bash
az group delete --name $RESOURCE_GROUP --yes
```
