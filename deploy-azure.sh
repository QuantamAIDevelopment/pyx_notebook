#!/bin/bash

# Azure Deployment Script for Notebook Platform

RESOURCE_GROUP="notebook-rg"
LOCATION="eastus"
ACR_NAME="notebookacr$RANDOM"
POSTGRES_SERVER="notebook-postgres-$RANDOM"
POSTGRES_DB="notebook_db"
POSTGRES_USER="adminuser"
POSTGRES_PASSWORD=$(openssl rand -base64 32)

echo "Creating resource group..."
az group create --name $RESOURCE_GROUP --location $LOCATION

echo "Creating Azure Container Registry..."
az acr create --resource-group $RESOURCE_GROUP --name $ACR_NAME --sku Basic --admin-enabled true

echo "Creating PostgreSQL Flexible Server..."
az postgres flexible-server create \
  --resource-group $RESOURCE_GROUP \
  --name $POSTGRES_SERVER \
  --location $LOCATION \
  --admin-user $POSTGRES_USER \
  --admin-password $POSTGRES_PASSWORD \
  --sku-name Standard_B1ms \
  --tier Burstable \
  --storage-size 32 \
  --version 15 \
  --public-access 0.0.0.0

az postgres flexible-server db create \
  --resource-group $RESOURCE_GROUP \
  --server-name $POSTGRES_SERVER \
  --database-name $POSTGRES_DB

echo "Building and pushing images..."
az acr build --registry $ACR_NAME --image notebook-backend:latest --file backend/Dockerfile backend/
az acr build --registry $ACR_NAME --image notebook-frontend:latest --file frontend/Dockerfile frontend/

ACR_PASSWORD=$(az acr credential show --name $ACR_NAME --query "passwords[0].value" -o tsv)
DATABASE_URL="postgresql://$POSTGRES_USER:$POSTGRES_PASSWORD@$POSTGRES_SERVER.postgres.database.azure.com:5432/$POSTGRES_DB"

echo "Creating Container App Environment..."
az containerapp env create \
  --name notebook-env \
  --resource-group $RESOURCE_GROUP \
  --location $LOCATION

echo "Deploying backend..."
az containerapp create \
  --name notebook-backend \
  --resource-group $RESOURCE_GROUP \
  --environment notebook-env \
  --image $ACR_NAME.azurecr.io/notebook-backend:latest \
  --registry-server $ACR_NAME.azurecr.io \
  --registry-username $ACR_NAME \
  --registry-password $ACR_PASSWORD \
  --target-port 8000 \
  --ingress external \
  --env-vars DATABASE_URL="$DATABASE_URL" \
  --cpu 1 --memory 2Gi

BACKEND_URL=$(az containerapp show --name notebook-backend --resource-group $RESOURCE_GROUP --query "properties.configuration.ingress.fqdn" -o tsv)

echo "Deploying frontend..."
az containerapp create \
  --name notebook-frontend \
  --resource-group $RESOURCE_GROUP \
  --environment notebook-env \
  --image $ACR_NAME.azurecr.io/notebook-frontend:latest \
  --registry-server $ACR_NAME.azurecr.io \
  --registry-username $ACR_NAME \
  --registry-password $ACR_PASSWORD \
  --target-port 3000 \
  --ingress external \
  --env-vars REACT_APP_API_URL="https://$BACKEND_URL" \
  --cpu 0.5 --memory 1Gi

FRONTEND_URL=$(az containerapp show --name notebook-frontend --resource-group $RESOURCE_GROUP --query "properties.configuration.ingress.fqdn" -o tsv)

echo "Updating backend CORS..."
az containerapp update \
  --name notebook-backend \
  --resource-group $RESOURCE_GROUP \
  --set-env-vars CORS_ORIGINS="https://$FRONTEND_URL"

echo "=========================================="
echo "Deployment Complete!"
echo "=========================================="
echo "Frontend URL: https://$FRONTEND_URL"
echo "Backend URL: https://$BACKEND_URL"
echo "Database: $POSTGRES_SERVER.postgres.database.azure.com"
echo "=========================================="
