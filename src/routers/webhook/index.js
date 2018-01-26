'use strict';

function webhook_post(req, res) {
  console.log(`Webhook called. Id: ${req.params.webhook_id}`, req.body);

  global.amqp.sendRPCMessage(req, req.params.webhook_id)
  .then(response => {
    res
    .set(response.headers)
    .status(response.status).send(response.body)
    .end();
  })
  .catch(error => {
    res
    .status(error.status || 500)
    .send(error.msg || 'Undefined')
    .end();
  });
}

//////////////////////////////
// Exports
//////////////////////////////
module.exports = webhook_post;