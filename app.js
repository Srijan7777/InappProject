var express =require ("express");
var app =express();
const hostname = 'localhost';
const port = '3000';
const fs = require('fs').promises;
const path = require('path');
const {authenticate} = require('@google-cloud/local-auth');
const {google} = require('googleapis');

// If modifying these scopes, delete token.json.
const SCOPES = ['https://www.googleapis.com/auth/gmail.readonly',
                'https://www.googleapis.com/auth/gmail.labels',
                'https://www.googleapis.com/auth/gmail.send'

];

app.get("/", async function(req,res){
const credentials = await fs.readFile('credentials.json');

const auth = await authenticate({
    scopes: SCOPES,
    keyfilePath: path.join(__dirname, 'credentials.json')
  });

console.log("auth  " , auth);

const gmail = google.gmail({version: 'v1', auth});
  const response = await gmail.users.labels.list({
    userId: 'me',
  });

  const LABEL_NAME = 'VACATIONS';


async function getUnrepliedMessages(auth){
    const gmail = google.gmail({version: 'v1', auth});
  const res= await gmail.users.messages.list({
    userId: 'me',
    q:"-in:chats -from:me -has:userlabels"
  });
  return res.data.messages || [];

}
async function sendReply(auth,message){
     const gmail = google.gmail({version: 'v1', auth});
  const res= await gmail.users.messages.get({
    userId: 'me',
    id:message.id,
    format:'metadata',
    metadataHeaders:['Subject' , 'From'],
   });


const subject =res.data.payload.headers.find(
    (header) => header.name === 'Subject'
).value;
const from =res.data.payload.headers.find(
    (header) => header.name === 'From'
).value; 
const replyTo =from.match(/<(.*)>/)[1];//
const replySubject = subject.startsWith('Re:') ? subject: `Re:${subject}`;
const replyBody = `Hi,\n\n I'm currently on vactaion and will get back to you soon.\n\nBest ,\nYour Name`;
const rawMessage = [
    `From:me`,
    `To:${replyTo}`,
    `Subject:${replySubject}`,
    `In-Reply-To:${message.id}`,
    `Refrences:${message.id}`,
    '',
    replyBody,
].join('\n');
const encodedMessage=Buffer.from(rawMessage).toString('base64').replace(/\+/g, '-').replace(/\//g, '_');

await gmail.users.messages.send({
    userId:'me',
    requestBody:{
        raw:encodedMessage,
    },
});
}

async function createLabel(auth){
         const gmail = google.gmail({version: 'v1', auth});
         try{
            const res =await gmail.users.labels.create({
                userId:'me',
                requestBody:{
                    name:LABEL_NAME,
                    labelListVisibility: 'labelShow',
                    messageListVisibility:'show',
                },
            });
            return res.data.id;
         }
         catch(err){
            if(err.code === 409){
                const res  = await gmail.users.labels.list({
                userId:'me',
            });
         
         const label = res.data.labels.find((label)=>{
            return label.name === LABEL_NAME;
         });
         return label.id;
          }
          else {
            throw err;
         }
    }
}
async function addLabel(auth, message,labelId){
    const gmail = google.gmail({version: 'v1', auth});
    await gmail.users.message.modify({
        userId:'me',
        id:message.id,
        requestBody:{
            addLabelIds:[labelId],
            removeLabelIds:['INBOX'],
        }
    })
}

async function main()
{
    const labelId =await createLabel(auth);
    console.log(`Created or found ${labelId}`);

    setInterval(async () =>{
        const messages = await getUnrepliedMessages(auth);
        console.log(`Found ${messages.length} unreplied message`);

        for(const message of messages){
            await sendReply(auth,message);
            console.log(`Sent Reply to message with message id ${message.id}`);
            await addLabel(auth,message,labelId);
            console.log(`Added label ${labelId} to message with message id ${message.id}`);

        }
        }, Math.floor(Math.random() * 45)*1000);
 }
        main().catch(console.error);
  
const labels =response.data.labels;

res.send("You have completed the app");

});


app.listen(port, hostname ,function(){
console.log (`EmailSender started and running at port name-${hostname}:${port}`);
console.log("EmailSender Started");
});