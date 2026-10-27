// TODO: Integrate WhatsApp Business API or Twilio here
// Sign up at https://www.twilio.com/ or use WhatsApp Business API

function notifyWhatsApp(phone, message) {
  console.log(`📱 [WhatsApp Notification] To: ${phone}`);
  console.log(`   Message: ${message}`);
  // Example Twilio integration:
  // const client = require('twilio')(TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN);
  // client.messages.create({
  //   from: 'whatsapp:+14155238886',
  //   to: `whatsapp:+92${phone}`,
  //   body: message
  // });
}

module.exports = { notifyWhatsApp };
