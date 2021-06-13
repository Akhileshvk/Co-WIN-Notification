var CronJob = require('cron').CronJob
const Runner   = require('./Runner.js')

console.log("App check for vaccine data every 5 mins.")
try {
    
  var job = new CronJob('*/5 * * * *', function() {
    Runner.run()
  });

  job.start()

} catch (error) {
  console.error(error)
}


 
 