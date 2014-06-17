'use strict';

var level       = require('level')
  , express     = require('express')
  , bodyParser  = require('body-parser')
  , app         = express()
  , db          = level('./doge-stats', { valueEncoding: 'json' })

app.use(bodyParser());

app.get('/users/:username', function (req, res) {
  db.get(req.params.username, function (err, user) {
    if (err) return res.send({'error': 'user not found'})
    res.send(user)
  })
})

app.get('/users/:username/charts/:chartname', function (req, res) {
  var key = req.params.username + '!' + req.params.chartname
  db.get(key, function (err, chart) {
    if (err) return res.send({'error': 'chart not found'})
    res.send(chart)
  })
})

app.get('users/:username/charts/:chartname/series/:seriesname', function (req, res) {
  var key = req.params.username + '!' + req.params.chartname + '!' + req.params.seriesname
  db.get(key, function (err, seriesData) {
    if (err) return res.send({'error': 'data not found'})
    res.send(seriesData)
  })
})

app.post('/:username', function (req, res) {

  //check if user already exists
  db.get(req.params.username, function (err) {
    if (err && err.type === 'NotFoundError') {

      //username must be all lowercase and no spaces,
      //3-15 characters long, numbers, _ and - allowed
      if(req.params.username.match(/^[a-z0-9_-]{3,15}$/) === null)
        return res.send({error: 'invalid username'})

      db.put(req.params.username, req.body, function () {
        return res.send({ message: 'user created' })
      })

      return;
    }
    return res.send({ message: 'failed to create user' })
  })
})

app.post('/users/:username/charts/:chartname', function (req, res) {
  //check for chartname existence and validate chartname before storing
  db.get(req.params.username, function (err) {
    if (err) return res.send({'error': 'user not found'})
    var key = req.params.username + '!' + req.params.chartname
    db.get(key, function (err) {
      if (err && err.type === 'NotFoundError') {
        return db.put(key, req.body, function () {
          return res.send({ message: 'chart created' })
        })
      }
      return res.send({ message: 'failed to create chart' })
    })
  })
})

app.post('/users/:username/charts/:chartname/series/:seriesname', function (req, res) {

  //early validation of data
  if (typeof req.body.data !== 'number')
    return res.send({error: 'data must be numerical'})

  //create db key to check in form :username!:chartname
  var key = req.params.username + '!' + req.params.chartname

  db.get(key, function (err) {
    if (err) return res.send({'error': 'user or chart not found'})

    //append seriesname to key so its in form :username!:chartname!:seriesname
    //and check for existence in db
    key += '!' + req.params.seriesname

    db.get(key, function (err, existingData) {

      //perform validation and data storage
      if (!err || err.type === 'NotFoundError') {
        var data = existingData || []
        data.push([new Date().toISOString(), req.body.data])
        return db.put(key, data, function () {
          return res.send({ message: 'series data added' })
        })
      }

      //catchall failure
      return res.send({ message: 'failed to add series data' })
    })
  })
})

app.get('*', function (req, res) {
  res.send('Such routes, so missing, much gone, wow')
})

app.listen(3001)
console.info('Such stats, much start, so 3001. WoW.')
