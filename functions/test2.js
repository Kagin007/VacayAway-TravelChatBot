const ob = {
  dates: {
    date: '2022-05-17T12:00:00-04:00'
  }
} 

const newDate = ob.dates.date.split('T')[0]

console.log(newDate)