// See https://github.com/dialogflow/dialogflow-fulfillment-nodejs
// for Dialogflow fulfillment library docs, samples, and to report issues
'use strict';
 
const functions = require('firebase-functions');
const axios = require('axios');
const {WebhookClient} = require('dialogflow-fulfillment');

require('dotenv').config()

const API_KEY = process.env.WEATHER_API_TOKEN
 
process.env.DEBUG = 'dialogflow:debug';

const { initializeApp } = require('firebase-admin/app');
const { getFirestore } = require('firebase-admin/firestore');


initializeApp();
const db = getFirestore();

exports.dialogflowFirebaseFulfillment = functions.region('us-central1').https.onRequest((request, response) => {
  const agent = new WebhookClient({ request, response });
 
  //get id of session for reference
  let session_id = request.body.session;
  let session_id_array = session_id.split("/");
  
  session_id = session_id_array[session_id_array.length - 1]

  async function weather(agent) {
    await axios({
      url: `https://api.worldweatheronline.com/premium/v1/weather.ashx?format=json&num_of_days=1&q=toronto&key=${API_KEY}&date=2022-05-15`,
      })
      .then(response => {
        agent.add(`Max temp: ${response.data.data.weather[0].maxtempC}`)
      })
      .catch((error)=>{
        console.log(error)
      })
    }

  function welcome(agent) {
    agent.add(`Welcome to my agent DUUDE OMG ITS WORKING!!!!`);
  }
 
  function fallback(agent) {
    agent.add(`I didn't understand DUDE`);
    agent.add(`I'm sorry, can you try again DUDE?`);
  }

  function question1(agent) {
    agent.add('Received!!');
  }

  function question2(agent) {
    const products = [
      {
        name: 'PS5 ',
        price: '499'
      },
      {
        name: 'Xbox ',
        price: '499'
      },
    ];

    const productList = products.map(product => product.name).join()

    agent.add(
      `Our products include ${productList}!!`
    )
  }

  async function question3(agent) {
    const name = agent.parameters.name;
    const typeofpayment = agent.parameters.typeofpayment;

    const docRef = db.collection('users').doc(session_id);

    await docRef.set({
      first: name,
      last: typeofpayment,
      born: 2021
    });
  }

  let intentMap = new Map();

  intentMap.set('Default Welcome Intent', welcome);
  intentMap.set('Default Fallback Intent', fallback);
  intentMap.set('Question 1', question1);
  intentMap.set('Question 2', question2);
  intentMap.set('Question 3', question3);
  intentMap.set('Get Weather', weather);
  agent.handleRequest(intentMap);
});