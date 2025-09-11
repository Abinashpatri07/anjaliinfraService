import nodemailer from "nodemailer";

const transporter = nodemailer.createTransport({
  host: "smtp-relay.brevo.com",
  port: 587, // use 465 for SSL if needed
  auth: {
    user: "9041d4001@smtp-brevo.com", // your Brevo login email
    pass: "OV9MRqLGPB13I7TW",          // generate from Brevo SMTP settings
  },
});

export async function mail(to = [], subject = "", message = "") {
  try {
    const info = await transporter.sendMail({
      from: `"Agstamp" <abinashpatri5@gmail.com>`, // change to match auth user
      to: `${to.join(",")}`,
      subject: subject,
      html: message,
    });
    return info;
  } catch (error) {
    return error;
  }
}

