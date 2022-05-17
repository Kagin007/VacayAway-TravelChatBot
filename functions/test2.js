const axios = require('axios');
require('dotenv').config()

API_KEY = process.env.WEATHER_API_TOKEN;

async function weather(city, date) {
  // const city = agent.parameters['geo-city'];
  // const date = agent.parameters.date.split('T')[0];

  await axios({
    url: `https://api.worldweatheronline.com/premium/v1/weather.ashx?format=json&num_of_days=1&q=${city}&key=${API_KEY}&date=${date}`,
    })
    .then(async response => {
      //save weather info and use as 'context' for upselling
      const maxTemp = response.data.data.weather[0].maxtempC

      // const docRef = db.collection(session_id).doc('weatherDetails');

      // await docRef.set({
      //   maxTemp: Number(maxTemp)
      // });

      console.log(`Max temp: ${maxTemp}`)
    })
    .catch((error)=>{
      console.log(`Whoops! Something went wrong: ${error}`)
    })
}

weather('Calgary', '2022-05-18')