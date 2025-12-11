const bcrypt = require("bcrypt");

bcrypt.hash("smiths", 10).then(hash => {
    console.log("Hash:", hash);
});


//here I am finding the hash for the user /