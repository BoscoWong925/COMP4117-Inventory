const { EmailClient } = require('@azure/communication-email');
require('dotenv').config();

async function testEmail() {
  try {
    const connectionString = process.env.AZURE_COMMUNICATION_CONNECTION_STRING;
    const fromEmail = process.env.AZURE_EMAIL_FROM;

    console.log('\n╔════════════════════════════════════════════════════════════╗');
    console.log('║   Azure Communication Services Email - Connection Test     ║');
    console.log('╚════════════════════════════════════════════════════════════╝\n');

    // Validate configuration
    console.log('📋 Checking Configuration...');
    if (!connectionString) {
      console.error('❌ AZURE_COMMUNICATION_CONNECTION_STRING is not set in .env');
      return;
    }
    if (!fromEmail) {
      console.error('❌ AZURE_EMAIL_FROM is not set in .env');
      return;
    }

    console.log('✅ Connection string configured');
    console.log(`✅ From email: ${fromEmail}`);

    // Create client
    console.log('\n🔗 Connecting to Azure...');
    const client = new EmailClient(connectionString);
    console.log('✅ Client created successfully');

    // Prepare email
    console.log('\n📧 Preparing test email...');
    
    // Use a test recipient - update this to your email for real testing
    const testRecipient = 'test@inventory-system.local';
    
    const emailMessage = {
      senderAddress: fromEmail,
      recipients: {
        to: [{ address: testRecipient }]
      },
      content: {
        subject: '[Inventory System] Azure Email Configuration Test',
        plainText: [
          'Hello,\n',
          'This is a test email from your Inventory System.\n',
          'If you received this message, your Azure Communication Services email is properly configured! ✅\n\n',
          'Configuration Details:',
          `- From: ${fromEmail}`,
          `- To: ${testRecipient}`,
          `- Sent: ${new Date().toISOString()}\n`,
          'Inventory System'
        ].join('\n')
      }
    };

    console.log(`✅ Email message prepared`);
    console.log(`   From: ${fromEmail}`);
    console.log(`   To: ${testRecipient}`);

    // Send email
    console.log('\n📤 Sending test email...');
    const result = await client.beginSend(emailMessage);
    console.log('⏳ Waiting for delivery confirmation...');
    const poller = await result.pollUntilDone();
    
    console.log('\n✅ SUCCESS! Email sent successfully!');
    console.log(`   Message ID: ${poller.result.messageId}\n`);

    console.log('╔════════════════════════════════════════════════════════════╗');
    console.log('║  Your Azure email configuration is working correctly! 🎉   ║');
    console.log('╚════════════════════════════════════════════════════════════╝\n');

    console.log('📌 Note: Test emails are sent to "test@inventory-system.local"');
    console.log('   This is a non-deliverable test email.\n');
    console.log('To test with a real email, edit this script and replace');
    console.log('testRecipient with your actual email address.\n');

  } catch (error) {
    console.error('\n❌ Error occurred:');
    console.error(`   ${error.message}\n`);

    if (error.message.includes('Invalid credentials')) {
      console.log('💡 Troubleshooting:');
      console.log('   - Check AZURE_COMMUNICATION_CONNECTION_STRING in .env');
      console.log('   - Ensure connection string ends with \'==\'');
      console.log('   - Copy directly from Azure Portal → Keys section\n');
    }

    if (error.message.includes('InvalidSenderAddress')) {
      console.log('💡 Troubleshooting:');
      console.log('   - Check AZURE_EMAIL_FROM matches your email domain');
      console.log('   - Should be format: DoNotReply@xxxxxxxx.azurecomm.net');
      console.log('   - Verify domain is provisioned in Azure Portal\n');
    }

    if (error.message.includes('Timeout')) {
      console.log('💡 Troubleshooting:');
      console.log('   - Check your internet connection');
      console.log('   - Verify firewall allows Azure connections');
      console.log('   - Try again in a moment\n');
    }

    process.exit(1);
  }
}

// Run test
testEmail().catch(err => {
  console.error('Unexpected error:', err);
  process.exit(1);
});
