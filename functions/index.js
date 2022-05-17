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

    const date = agent.parameters.date.split('T')[0];
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

    const date = agent.parameters.date.split('T')[0] || 'error no date'
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
  
      const date = agent.parameters.date.split('T')[0] || 'error no date'
      const carType = agent.parameters['car_type'] || 'error no car type'
      const toCity = agent.parameters['geo-city'] || 'error no city'

      const docRef = db.collection(session_id).doc('carDetails');
  
      await docRef.set({
        date: date,
        toCity: toCity,
        carType: carType
      })
        //update weather for city
        weather(agent)
      
        const weatherSnapshot = db.collection(session_id).doc('weatherDetails');

        const docWeather = await weatherSnapshot.get();

        const maxTemp = docWeather.data().maxTemp

        if (maxTemp > 18 && carType !== 'convertible') {
          agent.add(`It looks like its going to be ${maxTemp} degrees in ${toCity}. Would you like to upgrade to a convertible?`)
        } else {
          agent.add(`Your ${carType} has been booked for ${date} for ${toCity}. Is there anything else I can help you with?`)          
        }
    }

  async function weather(agent) {
    const city = agent.parameters['geo-city'];
    const date = agent.parameters.date.split('T')[0];

    await axios({
      url: `https://api.worldweatheronline.com/premium/v1/weather.ashx?format=json&num_of_days=1&q=${city}&key=${API_KEY}&date=${date}`,
      })
      .then(async response => {
        //save weather info and use as 'context' for upselling
        const maxTemp = response.data.data.weather[0].maxtempC

        const docRef = db.collection(session_id).doc('weatherDetails');

        await docRef.set({
          maxTemp: Number(maxTemp)
        });
      })
      .catch((error)=>{
        console.log(error)
      })
  }

  async function getSessionData(agent) {
    const flightSnapshot = db.collection(session_id).doc('flightDetails');
    const roomSnapshot = db.collection(session_id).doc('roomDetails');
    const carSnapshot = db.collection(session_id).doc('carDetails');

    const docFlight = await flightSnapshot.get();
    const docRoom = await roomSnapshot.get();
    const docCar = await carSnapshot.get();

    if (!docFlight.exists && !docRoom.exists && !docCar.exists) {
      agent.add("It doesn't look we have anything booked yet.")
    } else {
      if (docFlight.exists) {
        agent.add(`Our records show you have a flight booked from ${docFlight.data().fromCity} to ${docFlight.data().toCity} on ${docFlight.data().date.split('T')[0]}.`)     
      }
      if (docRoom.exists) {
        `We have a ${docRoom.data().roomType} room booked for you as well`        
      }
      if (docCar.exists) {
        `We have a ${docCar.data().carType} reserved.`
      }
    }
  }

  let intentMap = new Map();

  intentMap.set('Get Weather', weather);
  intentMap.set('BookFlights', bookFlight);
  intentMap.set('Order Query', getSessionData);
  intentMap.set('BookRooms', bookRoom);
  intentMap.set('BookCars', bookCar);

  agent.handleRequest(intentMap);
});