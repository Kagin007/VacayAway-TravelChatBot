// See https://github.com/dialogflow/dialogflow-fulfillment-nodejs
// for Dialogflow fulfillment library docs, samples, and to report issues
'use strict';
 
const functions = require('firebase-functions');
const axios = require('axios');
const {WebhookClient, Payload} = require('dialogflow-fulfillment');

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

  async function bookFlight(agent) {
    agent.add('Booking flight...')

    const date = agent.parameters.date;
    const fromCity = agent.parameters['geo-city'];
    const toCity = agent.parameters['geo-city1'];
    //check if optional flightType
    const flightType = agent.parameters['flight_type'] || '';

    const docRef = db.collection(session_id).doc('flightDetails');

    await docRef.set({
      date: date,
      fromCity: fromCity,
      toCity: toCity,
      flightType: flightType
    });

    agent.add(`Your flight has been booked for ${date} from ${fromCity} to ${toCity}. Would you like to book a hotel for when you arrive?`)
  };

  async function bookRoom(agent) {
    agent.add('Booking room...')

    const date = agent.parameters.date || 'error no date'
    const roomType = agent.parameters['room_type'] || 'error no room'
    const toCity = agent.parameters['geo-city'] || 'error no city'

    const docRef = db.collection(session_id).doc('roomDetails');

    await docRef.set({
      date: date,
      toCity: toCity,
      roomType: roomType
    });

    agent.add(`Your room has been booked in ${toCity} on ${date}. Is there anything else I can help you with?`)
  };

    async function bookCar(agent) {
      agent.add('Booking car...')
  
      const date = agent.parameters.date || 'error no date'
      const carType = agent.parameters['car_type'] || 'error no car type'
      const toCity = agent.parameters['geo-city'] || 'error no city'

      const docRef = db.collection(session_id).doc('carDetails');
  
      await docRef.set({
        date: date,
        toCity: toCity,
        carType: carType
      });

      agent.add(`Your ${carType} has been booked for ${date} for ${toCity}. Is there anything else I can help you with?`)
    }

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
    });
  }

  async function getSessionData(agent) {
    const flightSnapshot = db.collection(session_id).doc(flightDetails);
    const roomSnapshot = db.collection(session_id).doc(roomDetails);
    const carSnapshot = db.collection(session_id).doc(carDetails);

    const docFlight = await flightSnapshot.get();
    const docRoom = await roomSnapshot.get();
    const docCar = await carSnapshot.get();

    if (!docFlight.exists && !docRoom && !docCar) {
      agent.add("It doesn't look we have anything booked yet.")
    } else {
      agent.add(`Our records show you have a flight booked from ${docFlight.data().fromCity} to ${docFlight.data().toCity} on ${docFlight.data().date}. We have a ${docRoom.data().room_type} booked for you as well and a ${docCar.data().car_type}`)
      }    
  }

  let intentMap = new Map();

  intentMap.set('Default Welcome Intent', welcome);
  intentMap.set('Default Fallback Intent', fallback);
  intentMap.set('Question 1', question1);
  intentMap.set('Question 2', question2);
  intentMap.set('Question 3', question3);
  intentMap.set('Get Weather', weather);
  intentMap.set('BookFlights', bookFlight);
  intentMap.set('Order Query', getSessionData);
  intentMap.set('BookRooms', bookRoom);
  intentMap.set('BookCars', bookCar);
  agent.handleRequest(intentMap);
});