console.log('Server-side code running');

const express = require('express');
const MongoClient = require('mongodb').MongoClient;
const assert = require('assert');
const bodyParser = require('body-parser');

const app = express();

// serve files from the public directory
app.use(express.static('public'));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

const url = 'mongodb://localhost:27017';
const dbName = 'node-express-test';

let db;

const poll = [
    {
        name: 'Chelsea',
        votes: 100,
    },
    {
        name: 'Arsenal',
        votes: 70,
    },
    {
        name: 'Liverpool',
        votes: 250,
    },
    {
        name: 'Manchester City',
        votes: 689,
    },
    {
        name: 'Manchester United',
        votes: 150,
    },
];

MongoClient.connect(url, function (err, client) {
    assert.equal(null, err);
    console.log("Connected correctly to server");
    db = client.db(dbName);

    // start the express web server listening on 8080
    app.listen(8080, () => {
        console.log('listening on 8080');
    });
});

// serve the homepage
app.get('/', (req, res) => {
    res.sendFile(__dirname + '/index.html');
});

app.get('/poll', (req, res) => {
    res.json(poll);
});

app.post('/insert', (req, res) => {
    console.log("Inserting into database");
    var tableName = req.body.tableName;
    var aName = req.body.accountName;
    var aValue = req.body.accountValue;
    const insertValue = {
        insertTime: new Date(),
        accountName: aName,
        accountvalue: aValue
    };

    const collection = db.collection(tableName);
    collection.insertOne(insertValue, function (err, result) {
        assert.equal(err, null)
        console.log("inserted into db")
        res.sendStatus(201);
    })
})

app.post('/query', (req, res) => {
    console.log("Querying from database");
    var tableName = String(req.body.tableName);

    const collection = db.collection(tableName);
    var array = [];
    var stream = collection.find().stream();
    stream.on("data", function (item) {
        var str = JSON.stringify(item);
        array.push(str);
    });
    stream.on("end", function () {
        console.log(JSON.stringify(array));
        res.send(JSON.stringify(array));
    });

})
