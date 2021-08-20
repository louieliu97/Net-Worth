console.log('Server-side code running');

const express = require('express');
const MongoClient = require('mongodb').MongoClient;
const assert = require('assert');

const app = express();

// serve files from the public directory
app.use(express.static('public'));

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

app.post('/clicked', (req, res) => {
    const click = { clickTime: new Date() };
    console.log(click);
    console.log(db);

    const collection = db.collection('clicks');
    collection.insertOne(click, function (err, result) {
        assert.equal(err, null)
        console.log("inserted one click")
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