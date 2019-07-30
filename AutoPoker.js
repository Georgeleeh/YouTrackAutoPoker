var entities = require('@jetbrains/youtrack-scripting-api/entities');
var notifications = require('@jetbrains/youtrack-scripting-api/notifications');

exports.rule = entities.Issue.onSchedule({
  title: 'Autopoker',
  // defines which issues are processed: Unresolved issues with non-default Notification delays set
  search: '#Unresolved has: Assignee has: {Days Before Poke Email}',
  // Scheduled for every day at 7am
  cron: '0 0 7 1/1 * ? *', // expression generated with http://www.cronmaker.com/ as some other formats were malformed
  // to mute notifications for changes that are applied by this rule, set to true
  muteUpdateNotifications: true,
  guard: function(ctx) {
    var issuePrefix = ctx.issue.id + ': ';
    
    // get time of latest update for a post
    var latestActivity = ctx.issue.updated;
    var latestActivityDate = new Date(latestActivity);
    latestActivityDate.setHours(0,0,0,0); // hours are set to (0,0,0,0) to avoid update times affecting comparisons
    
    // get idleDelay and return false if null returned
    var idleDelay = ctx.issue.fields.IdleNotificationDelay;
    if (idleDelay === null){console.log(issuePrefix + 'Null delay, no email'); return false;}
    
    // set idleLimitDate to today minus the issue's Idle Notification Delay
    var idleLimitDate = new Date();
    console.log(idleLimitDate.toDateString());
    idleLimitDate.setHours(0,0,0,0);
    idleLimitDate.setDate(idleLimitDate.getDate() - idleDelay);
    
    // print last update and idle dates for comparison
    //console.log(issuePrefix + latestActivityDate + ' | ' + idleLimitDate);
    
    // If the latest update isn't recent enough, return true
    // set to == to email once, set to < to email once per check (daily at 7am)
    if (latestActivityDate.getDate() == idleLimitDate.getDate()){
    	console.log(issuePrefix + 'Idle too long');
      	return true;
    } else {
        console.log(issuePrefix + 'active recently');
      	return false;
    }
  },
  action: function(ctx) {
    var issue = ctx.issue;
    var assignee = issue.fields.Assignee;
    
    var message = {
    fromName: 'YouTrack Notification Bot',
    toEmails: [assignee.email],
    subject: 'No recent activity in issue ' + issue.id,
    body: [
      '<div style="font-family: sans-serif">',
      '  <div style="padding: 10px 10px; font-size: 13px; border-bottom: 1px solid #D4D5D6;">',
      '    <p>' + assignee.fullName + ',' + '</p>',
      '    <p>The YouTrack issue ' + issue.id + ' to which you are assigned has been idle for too long, please update the issue.' + '<\p>',
      '	   <p>Youtrack Autopoker</p>',
      '  </div>',
      '<\div>'
    ].join('\n')
    };
    // send message and confirm transmission in console
    notifications.sendEmail(message, issue);
    console.log(issue.id + ': email sent to ' + assignee.fullName);
  },
  requirements: {
    IdleNotificationDelay: {
      type: entities.Field.integerType,
      name: "Days Before Poke Email"
    }
  }
});
