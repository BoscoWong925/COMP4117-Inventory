# Backend

Backend service for the COMP4117 Inventory System.

## Setup

Install dependencies:

```
npm install
```

Create a `.env` file with the required configuration:

```
PORT=5001
MONGODB_URI=mongodb://localhost:27017/comp4117_inventory
FRONTEND_URL=http://localhost:5173

# Azure Communication Services Email Configuration
AZURE_COMMUNICATION_CONNECTION_STRING=endpoint=https://<your-resource-name>.communication.azure.com/;accesskey=<your-access-key>
AZURE_EMAIL_FROM=DoNotReply@<your-email-domain>.azurecomm.net
```

### Azure Communication Services Setup

1. Create an Azure Communication Services resource in the Azure Portal
2. Note down the connection string from the resource settings
3. Set up an email domain and get the `From` email address
4. Add these values to your `.env` file

Start the server:

```
npm run dev
```
