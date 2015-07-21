
var GameScore = Parse.Object.extend('GameScore')

Parse.Cloud.define('submitScore', function(request, response) {

  Parse.Cloud.useMasterKey()

  var params = request.params
  var user   = request.user

  if (!user) {
    return response.error('Unauthenticated!')
  }

  var query = new Parse.Query(GameScore)
  query.equalTo('user',     user)
  query.equalTo('md5',      params.md5)
  query.equalTo('playMode', params.playMode)

  query.first()
  .then(function(gameScore) {
    if (!gameScore) {
      gameScore = new GameScore()
      gameScore.set('user',       user)
      gameScore.set('md5',        params.md5)
      gameScore.set('playMode',   params.playMode)
      gameScore.set('playCount',  0)
    }
    return gameScore
  })
  .then(function(gameScore) {
    if (params.score > (+gameScore.get('score') || -1)) {
      gameScore.set('recordedAt', new Date())
      gameScore.set('score', params.score)
      gameScore.set('combo', params.combo)
      gameScore.set('total', params.total)
      gameScore.set('count', [
        +params.count[0] || 0,
        +params.count[1] || 0,
        +params.count[2] || 0,
        +params.count[3] || 0,
        +params.count[4] || 0,
      ])
      gameScore.set('log', params.log)
      gameScore.set('playNumber', gameScore.get('playCount') + 1)
    }
    gameScore.increment('playCount')
    return gameScore.save()
  })
  .then(
    function(gameScore) {
      var countQuery = new Parse.Query(GameScore)
      countQuery.equalTo('md5',       params.md5)
      countQuery.equalTo('playMode',  params.playMode)
      countQuery.greaterThan('score', gameScore.get('score'))
      return (
        countQuery.count()
        .then(
          function(count) {
            return count + 1
          },
          function() {
            return null
          }
        )
        .then(function(rank) {
          response.success({
            meta: { rank: rank },
            data: gameScore
          })
        })
      )
    },
    function(error) {
      if (error && error.code && error.message) {
        response.error('Unable to submit score: ' + error.code + ': ' + error.message)
      } else if (error && error.message) {
        response.error('Unable to submit score: ' + error.message)
      } else {
        response.error('Unable to submit score: ' + error)
      }
    }
  )

})