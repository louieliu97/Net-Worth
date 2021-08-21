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
    console.log("Inserting!");
    console.log(req.body);
    var table = String(req.body.table);
    var value = req.body.value;
    const insertValue = {
        insertTime: new Date(),
        amount: value
    };

    const collection = db.collection(table);
    collection.insertOne(insertValue, function (err, result) {
        assert.equal(err, null);
        console.log("inserted into db");
        res.sendStatus(201);
    })
})

app.post('/clicked', (req, res) => {
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

// get the click data from the database
app.get('/clicks', (req, res) => {
    db.collection('clicks').find().toArray((err, result) => {
        if (err) return console.log(err);
        res.send(result);
    });
});