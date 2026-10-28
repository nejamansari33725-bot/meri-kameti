// WhatsApp Notification & Group Broadcast Utility
// Supports direct WhatsApp Deep Links, Webhooks, or Twilio / Green API integration

const DEFAULT_GROUP_LINK = 'https://chat.whatsapp.com/JbU280YDQbh6cbRBbRjY3l?s=cl&p=a&mlu=4&ilr=4&iam=2';

function notifyWhatsApp(phone, message) {
  console.log(`📱 [WhatsApp Notification] To: ${phone}`);
  console.log(`   Message: ${message}`);

  // Optional: Post to Webhook or Twilio if environment variable is configured
  if (process.env.WHATSAPP_WEBHOOK_URL) {
    try {
      fetch(process.env.WHATSAPP_WEBHOOK_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone, message, timestamp: new Date().toISOString() })
      }).catch(err => console.error('WhatsApp webhook error:', err.message));
    } catch (e) {}
  }
}

function notifyGroup(message) {
  console.log(`📢 [WhatsApp Group Broadcast]`);
  console.log(`   Group Link: ${DEFAULT_GROUP_LINK}`);
  console.log(`   Message: ${message}`);

  if (process.env.WHATSAPP_GROUP_WEBHOOK_URL) {
    try {
      fetch(process.env.WHATSAPP_GROUP_WEBHOOK_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ group: DEFAULT_GROUP_LINK, message, timestamp: new Date().toISOString() })
      }).catch(err => console.error('WhatsApp group webhook error:', err.message));
    } catch (e) {}
  }
}

module.exports = { notifyWhatsApp, notifyGroup, DEFAULT_GROUP_LINK };
