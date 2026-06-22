import nodemailer from "nodemailer";

const transporter = nodemailer.createTransport({
  host: "smtp.zoho.in",
  port: 587,
  secure: false,
  auth: {
    user: "mishra.niranjan@anjaliinfra.in",
    pass: "6eNw91AcXSvt",
  },
});

export async function mail(to = "", subject = "", message = "") {
  try {
    const info = await transporter.sendMail({
      from: `"Anjaliinfra.in" <mishra.niranjan@anjaliinfra.in>`, // change to match auth user
      to: 'mishra.niranjan@anjaliinfra.in',
      subject: subject,
      html: message + "<br/>Customer Email Address: " + to,
    });

    return info;
  } catch (error) {
    console.log(error);
    throw error;
  }
}

