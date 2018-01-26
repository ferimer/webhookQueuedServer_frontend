'use strict';

const app = require('express')();
const bodyParser = require('body-parser');
const http = require('http').Server(app);

const config = require('./config');
global.amqp = require('./libs/amqp')(config.messageQueue);

app.set('x-powered-by', false);

app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());
app.use(bodyParser.text());

app.use('*', (req, res, next) => {
  res.set('X-Powered-By', 'Ferimer queued webhook server');
  next();
})
app.use('/', require('./routers'));

// Start server
http.listen(3000, () => {
  console.log('webhook frontend listening on *:3000');
});
