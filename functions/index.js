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
 
  // get number from signalwire
  const clientPhoneNumber = request.body.originalDetectIntentRequest.payload.signalwire.from

  //get id of session for reference
  // let session_id = request.body.session;
  // let session_id_array = session_id.split("/");
  
  // session_id = session_id_array[session_id_array.length - 1]

  async function bookFlight(agent) {
    const date = agent.parameters.date.split('T')[0];
    const fromCity = agent.parameters['geo-city'];
    const toCity = agent.parameters['geo-city1'];
    // check if optional flightType
    const flightType = agent.parameters['flight_type'] || '';

    agent.add(`Your flight has been booked for ${date} from ${fromCity} to ${toCity}. Would you like to book a hotel for when you arrive?`)

    //with session_id
    const docRef = db.collection(clientPhoneNumber).doc('flightDetails');

    await docRef.set({
      date: date,
      fromCity: fromCity,
      toCity: toCity,
      flightType: flightType
    })
  };

  async function bookRoom(agent) {
    const date = agent.parameters.date.split('T')[0] || 'error no date'
    const roomType = agent.parameters['room_type'] || 'error no room'
    const toCity = agent.parameters['geo-city'] || 'error no city'

    agent.add(`Your room has been booked in ${toCity} on ${date}. Is there anything else I can help you with?`)

    const docRef = db.collection(clientPhoneNumber).doc('roomDetails');

    await docRef.set({
      date: date,
      toCity: toCity,
      roomType: roomType
    });
  };

  async function bookCar(agent) {
    agent.add('Booking car...')

    const date = agent.parameters.date.split('T')[0] || 'error no date'
    const carType = agent.parameters['car_type'] || 'error no car type'
    const toCity = agent.parameters['geo-city'] || 'error no city'

    const docRef = db.collection(clientPhoneNumber).doc('carDetails');

    await docRef.set({
      date: date,
      toCity: toCity,
      carType: carType
    })

    //get weather
    await axios({
      url: `https://api.worldweatheronline.com/premium/v1/weather.ashx?format=json&num_of_days=1&q=${toCity}&key=${API_KEY}&date=${date}`,
      })
      .then(async response => {
        //save weather info and use as 'context' for upselling
        const maxTemp = response.data.data.weather[0].maxtempC

        //if temp is over 18 degrees and they haven't already booked a convertable, upsell!
      if (maxTemp > 18 && carType !== 'convertible') {
        //send additional context containing temp data for destination city

        agent.setContext( 
          {name: "weather",
          lifespan: 3,
          parameters: 
            { 
              temp: maxTemp,
              city: toCity,
              date: date,
            }
          });
        //trigger upsell Intent
        agent.setFollowupEvent("upsellCar")

      } else {
        agent.add(`Your ${carType} has been booked for ${date} for ${toCity}. Is there anything else I can help you with?`)   
      }     
    });
  };

  async function weather(agent) {
    const city = agent.parameters['geo-city'];
    const date = agent.parameters.date.split('T')[0];

    await axios({
      url: `https://api.worldweatheronline.com/premium/v1/weather.ashx?format=json&num_of_days=1&q=${city}&key=${API_KEY}&date=${date}`,
      })
      .then(async response => {
        
        let maxTemp = response.data.data.weather[0].maxtempC
        let forecast = response.data.data.weather[0];
        let location = response.data.data.request[0];
        let conditions = response.data.data['current_condition'][0];
        let currentConditions = conditions['weatherDesc'][0]['value'];

        const docRef = db.collection(clientPhoneNumber).doc('weatherDetails');
        //save weather info and use as 'context' for upselling
        await docRef.set({
          maxTemp: Number(maxTemp)
        });

        let output = `Weather conditions in the ${location['type']} 
        ${location['query']} are ${currentConditions} with a projected high of
        ${forecast['maxtempC']}°C or ${forecast['maxtempF']}°F and a low of 
        ${forecast['mintempC']}°C or ${forecast['mintempF']}°F on 
        ${forecast.date}.`;
        
        agent.add(output)
      })
  };

  async function getSessionData(agent) {
    const flightSnapshot = db.collection(clientPhoneNumber).doc('flightDetails');
    const roomSnapshot = db.collection(clientPhoneNumber).doc('roomDetails');
    const carSnapshot = db.collection(clientPhoneNumber).doc('carDetails');

    const docFlight = await flightSnapshot.get();
    const docRoom = await roomSnapshot.get();
    const docCar = await carSnapshot.get();

    if (!docFlight.exists && !docRoom.exists && !docCar.exists) {
      agent.add("It doesn't look we have anything booked yet.")
    } else {
        let responseString = "";
      if (docFlight.exists) {
        responseString += `Our records show you have a flight booked from ${docFlight.data().fromCity} to ${docFlight.data().toCity} on ${docFlight.data().date.split('T')[0]}.`   
      }
      if (docRoom.exists) {
        responseString += `We have a ${docRoom.data().roomType} room booked for you as well.`  
      }
      if (docCar.exists) {
        responseString += `We have a ${docCar.data().carType} reserved.`
      };
      agent.add(responseString)
    };
  };

  async function upsellCar(agent) {
    const city = agent.parameters['geo-city'];
    const date = agent.parameters.date;

    const docRef = db.collection(clientPhoneNumber).doc('carDetails');

    await docRef.set({
      carType: 'convertible',
      date: date,
      toCity: city,
    });

    agent.add(`Fantastic! Your convertible has been booked for ${date} in ${city}.`)
  };

  //greet a new or returning customer
  async function greeting(agent) {
    let userSnapshot = db.collection(clientPhoneNumber).doc('userInfo');
    

      let docUserInfo = await userSnapshot.get().catch( e => {
        console.log(e)
      })
      if (!docUserInfo.exists) {
        agent.setContext({
          name: "new_customer",
          lifespan: 5,
          parameters: { "status": "new" }
        })
        agent.add("Welcome to VacayAway's chatbot! It looks like you are a new customer! What's your name?")
      }

      if (docUserInfo.exists) {
        //trigger new customer intent
        agent.add(`Its nice to see you again ${docUserInfo.data().name}! Would you like to book a flight, car, or hotel?`)         
      }     
  };

  async function setName(agent) {
    const name = agent.parameters['given-name'];

    const userSnapshot = db.collection(clientPhoneNumber).doc('userInfo');

    await userSnapshot.set({
      'name': name,
    })
    agent.add(`Thanks ${name}! We have added you to our records. Can I help you book a flight, car, or hotel?`)
  }

  function cookies(agent) {
    agent.add(`I like cookies too!`)
  }

  async function quit(agent) {
    const userSnapshot = db.collection(clientPhoneNumber).doc('userInfo');

    const docUserInfo = await userSnapshot.get();

    if (docUserInfo.exists) {
      agent.add(`Thanks for using VacayAway's AI Travel Chatbot ${docUserInfo.data().name}! Have a wonderful day!`)
    } else {
      agent.add("Thanks for using VacayAway's AI Travel Chatbot! Have a wonderful day!")
    } 
  };

  let intentMap = new Map();

  intentMap.set('Default Welcome Intent', greeting)
  intentMap.set('newCustomer', setName)
  intentMap.set('GetWeather', weather);
  intentMap.set('BookFlights', bookFlight);
  intentMap.set('OrderQuery', getSessionData);
  intentMap.set('BookRooms', bookRoom);
  intentMap.set('BookCars', bookCar);
  intentMap.set('upsellCar-yes', upsellCar);
  intentMap.set('Cookies', cookies);
  intentMap.set('Quit', quit)

  agent.handleRequest(intentMap);
});