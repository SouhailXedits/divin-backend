import nodemailer from 'nodemailer';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// Create a nodemailer transporter
const transporter = nodemailer.createTransport({
  host: process.env.EMAIL_HOST || 'smtp.hostinger.com',
  port: parseInt(process.env.EMAIL_PORT || '465'),
  secure: process.env.EMAIL_SECURE === 'true', // true for 465, false for other ports
  auth: {
    user: process.env.EMAIL_USER || '',
    pass: process.env.EMAIL_PASSWORD || '',
  },
});

interface EmailOptions {
  to: string;
  subject: string;
  text: string;
  html?: string;
}

export const emailService = {
  /**
   * Send an email
   * @param options Email options
   * @returns Promise that resolves when email is sent
   */
  async sendEmail(options: EmailOptions): Promise<boolean> {
    try {
      const senderName = process.env.EMAIL_SENDER_NAME || 'Divin Chat App';
      const senderEmail = process.env.EMAIL_USER || 'noreply@example.com';

      await transporter.sendMail({
        from: `"${senderName}" <${senderEmail}>`,
        to: options.to,
        subject: options.subject,
        text: options.text,
        html: options.html,
      });

      console.log(`Email sent to ${options.to}`);
      return true;
    } catch (error) {
      console.error('Error sending email:', error);
      return false;
    }
  },

  /**
   * Send a new message notification email
   * @param recipientEmail Recipient's email address
   * @param senderName Name of the message sender
   * @param messageContent The message content (preview)
   * @param chatUrl URL to view the chat
   */
  async sendMessageNotification(
    recipientEmail: string, 
    senderName: string, 
    messageContent: string,
    chatUrl: string
  ): Promise<boolean> {
    const subject = `New message from ${senderName}`;
    
    // Create a preview of the message (first 100 characters)
    const messagePreview = messageContent.length > 100
      ? `${messageContent.substring(0, 100)}...`
      : messageContent;
    
    const text = `
      You have received a new message from ${senderName}.
      
      Message: "${messagePreview}"
      
      Click here to view and reply: ${chatUrl}
      
      This is an automated notification, please do not reply to this email.
    `;
    
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #3b82f6;">New Message Notification</h2>
        <p>You have received a new message from <strong>${senderName}</strong>.</p>
        
        <div style="background-color: #f3f4f6; padding: 15px; border-radius: 8px; margin: 20px 0;">
          <p style="margin: 0; color: #4b5563;"><em>"${messagePreview}"</em></p>
        </div>
        
        <p>
          <a href="${chatUrl}" style="display: inline-block; background-color: #3b82f6; color: white; padding: 10px 20px; text-decoration: none; border-radius: 4px;">
            View and Reply
          </a>
        </p>
        
        <p style="color: #6b7280; font-size: 0.875rem; margin-top: 30px;">
          This is an automated notification, please do not reply to this email.
        </p>
      </div>
    `;
    
    return this.sendEmail({
      to: recipientEmail,
      subject,
      text,
      html
    });
  }
};

export default emailService; 