require('@instana/collector')();
const express = require('express');
const app = express();
const port = 3000;
const { Kafka } = require('kafkajs');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });
const Chance = require('chance');
const serviceBindings = require('kube-service-bindings');

const chance = new Chance();

let kafkaConnectionBindings;
try {
  // check if the deployment has been bound to a kafka instance through
  // service bindings. If so use that connect info
  kafkaConnectionBindings = serviceBindings.getBinding('KAFKA', 'kafkajs');
} catch (err) {
  // No service bindings. TODO: better error handling here
  kafkaConnectionBindings = {
    brokers: [process.env.KAFKA_BOOTSTRAP_SERVER || 'my-cluster-kafka-bootstrap:9092']
  };
  if (process.env.KAFKA_SASL_MECHANISM === 'plain') {
    kafkaConnectionBindings.sasl = {
      mechanism: process.env.KAFKA_SASL_MECHANISM,
      username: process.env.KAFKA_CLIENT_ID,
      password: process.env.KAFKA_CLIENT_SECRET
    };
    kafkaConnectionBindings.ssl = true;
  }
}

// add the client id
kafkaConnectionBindings.clientId = 'kafkajs-producer';

const kfk = new Kafka(kafkaConnectionBindings);

const producer = kfk.producer();

const createMessage = async () => {
  try {
    const msg = { key: 'example', value: chance.country({ full: true }), partition: 0 };
    console.log(msg.value);
    await producer.send({
      topic: 'countries',
      messages: [msg]
    });
  } catch (err) {
    console.log(err);
  }
};

const run = async () => {
  await producer.connect();
  /* setInterval(createMessage, 1000); */
  createMessage()
};

app.get('/', (req, res) => {
  /* run().catch(console.error); */
  run().then(res.send('Hello World!'))
  /* res.send('Hello World!') */
})

app.listen(port, () => {
  console.log(`Example app listening on port ${port}`)
})

/*run().catch(console.error);*/
