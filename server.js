const bodyParser = require('body-parser');
const express = require('express');
const http = require('http');
const twilio = require('twilio');

const config = require('./config.json');

const { MessagingResponse } = twilio.twiml;

const PORT = 1337;

const client = twilio(config.accountSid, config.authToken);

const app = express();
app.use(bodyParser.urlencoded({ extended: false }));

app.post('/sms', (req, res) => {
  const message = req.body;

  const respondWith = response => {
    res.writeHead(200, { 'Content-Type': 'text/xml' });
    res.end(response);
  };

  forwardMessage(message).then(msg => {
    if (msg.errorCode) {
      respondWith(failureResponseMessage(msg.errorMessage));
    } else {
      respondWith(successfulResponseMessage());
    }
  }).catch(err => {
    console.error(err);
    respondWith(failureResponseMessage(err));
  });
});

http.createServer(app).listen(PORT, () => {
  console.log(`Listening on port ${PORT}`);
});


/**
 * creates a response message with a contact number incase forwarding fails
**/
function failureResponseMessage(errorMessage='') {
  const twiml = new MessagingResponse();
  const segments = [
  	`We were unable to forward your message to our harm reduction team.`,
  	`Please contact ${config.backup} directly.`,
  ];
  if (errorMessage) segments.push(`ERROR: ${errorMessage}`);
  twiml.message(segments.join('\n'));
  return twiml.toString();
}

/**
 * responsible for creating successful response message
**/
function successfulResponseMessage() {
  const twiml = new MessagingResponse();
  twiml.message(`Thanks for reaching out! Your message has been forwarded to our harm reduction team!`);
  return twiml.toString();
}

/**
 * responsibe for forwarding the message
**/
function forwardMessage(message) {
  return client.messages.create({
    body: formatForward(message),
    from: config.number,
    to: config.hrTeam.join(','),
  })
}

/**
 * creates the forwarded message string
 * @todo account for multiple body segments (message.NumSegments)
**/
function formatForward(message) {
  return [
  	`New harm reduction hotline message!`,
  	`From: ${message.From}`,
  	`Location: ${message.FromCity}, ${message.FromState}, ${message.FromCountry}`,
  	`Message: ${message.Body}`,
  ].join('\n');
}

