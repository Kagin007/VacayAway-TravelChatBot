  // async function createAccount(agent) {
    
  //   const newAccountNumber = Math.floor(Math.random()* (9999 - 1000) + 1000)

  //   //should probably check if account already exists

  //   const docRef = db.collection(String(newAccountNumber)).doc(session_id);

  //   await docRef.set({
  //     flightDetails: '',
  //     carDetails: '',
  //     roomDetails: ''
  //   });

  //   agent.add(`Your new account number is ${newAccountNumber}. You are now logged in.`)
  // }

  async function loginAccount(agent) {
    const name = agent.parameters['given-name']

    const accountSnapshot = db.collection(name);

    const docAccount = await accountSnapshot.get()
    
        if (!docAccount.exists) {
          agent.add(`Hi, its nice to meet you ${name}.`)

          //create account for new user
          const docRef = db.collection(name).doc(session_id);

          await docRef.set({
            flightDetails: '',
            carDetails: '',
            roomDetails: ''
          });

        } else {
            agent.add(`Nice to see you again ${name}!`) 
            
            const docRef = db.collection(name).doc('Test');

            await docRef.set({
              name: name
            });
          }
  }