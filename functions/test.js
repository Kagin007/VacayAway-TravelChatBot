const doc = [
  {
    123: {
      first: 'Adam Schulte',
      last: 'debit'    
    }
  },
  {
    456: {
      first: 'Jacob',
      last: 'credit'
    }    
  }
]

const session_id = 123;

const sessionData = doc.filter(doc => {
  doc.id === session_id
})

console.log(sessionData)

console.log(`Your current info is ${sessionData.first} and ${sessionData.last}`)
