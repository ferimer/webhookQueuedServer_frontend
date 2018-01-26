'use strict';

const { EventEmitter } = require('events');
const amqp = require('amqplib');
const uuid = require('uuid');
const REPLY_QUEUE = 'amq.rabbitmq.reply-to';

module.exports = function messageQueueManager(config) {
  let open = amqp.connect(config);
  let ch = open
  .then(conn => conn.createChannel())
  .then(channel => {
    channel.responseEmitter = new EventEmitter();
    channel.responseEmitter.setMaxListeners(0);

    return Promise.all([
      channel.assertExchange('deadEx', 'topic', { autoDelete: false, durable: false }),
      channel.assertQueue('deadQ', { autoDelete: false, durable: false })
    ]).then(() => {
      channel.bindQueue('deadQ','deadEx', '#');
      channel.consume('deadQ', msg => {
        const status = msg.fields.exchange === 'deadEx' ? 504 : 502;
        console.log('Rejected message', `${msg.properties.correlationId} (${status})`);
        msg.content = JSON.parse(msg.content);
        channel.responseEmitter.emit(msg.properties.correlationId + '_error', {
          msg,
          status
        });
      },
      {
        noAck: true
      });

      return channel.assertExchange('webhook', 'direct', { autoDelete: false, durable: false, alternateExchange: 'deadEx' });
    })
    .then(() => {
      channel.consume(REPLY_QUEUE, msg => {
        let response = null;
        try {
          response = JSON.parse(msg.content);
        } catch (e) {
          console.log('Invalid message', `${msg.properties.correlationId} (500 - ${e})`);
          channel.responseEmitter.emit(msg.properties.correlationId + '_error', {
            msg,
            status: 500
          });
        }
        console.log('Accepted message', `${msg.properties.correlationId} (${response.status})`);
        channel.responseEmitter.emit(msg.properties.correlationId, response);
      },
      {
        noAck: true
      });

      return channel;
    })
    .catch(console.error);
  });

  return {
    sendRPCMessage: (req, rpcQueue) => new Promise((resolve, reject) => {
      const correlationId = uuid.v4();
      console.log('Emitting message', correlationId);
      ch.then(channel => {
        // listen for the content emitted on the correlationId event
        channel.responseEmitter.once(correlationId, resolve);
        channel.responseEmitter.once(correlationId + '_error', reject);

        channel.publish('webhook', rpcQueue, new Buffer(JSON.stringify({
          method: req.method,
          baseUrl: req.baseUrl,
          headers: req.headers,
          body: req.body
        })),
        {
          correlationId,
          replyTo: REPLY_QUEUE,
          expiration: 10000
        });
      });
    })
  };
};
