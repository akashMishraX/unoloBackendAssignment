import nodemailer from "nodemailer";

export default class EmailService {
    static async processEmail(payload) {
        if(
            !payload.sender ||
            !payload.password ||
            !payload.recipient ||
            !payload.subject ||
            !payload.message
        ){
            console.error('Invalid email payload:', payload);     
            return false;
        }
        await sendEmail(
            payload.sender,
            payload.password,
            payload.recipient,
            payload.subject,
            payload.message,
        );  
        console.log('Email sent successfully');
        return true

    }
}

function createTransporter(senderEmail, senderPassword) {
    return nodemailer.createTransport({
        service: "gmail",
        auth: {
        user: senderEmail,
        pass: senderPassword, // App Password
        },
    });
}


// Function to send an email dynamically
async function sendEmail(
    sender,
    password,
    recipient,
    subject,
    message

){
    try{
        // Define the email details
        const mailOptions = {
            from: sender,        // Sender's email
            to: recipient,       // Recipient's email
            subject: subject,    // Email subject
            text: message,       // Plain text message
            html: `<p>${message}</p>`, // Optional HTML formatting
        };
    
        // Send the email
        const info = await createTransporter(sender, password).sendMail(mailOptions);
        console.log(`Email sent from ${sender} to ${recipient}:`, info.messageId);
    
  } catch (error) {
    console.error("Error sending email:", error);
  }
}


