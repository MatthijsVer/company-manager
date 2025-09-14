import { Resend } from 'resend'

const resend = new Resend(process.env.RESEND_API_KEY!)
const fromEmail = process.env.RESEND_FROM_EMAIL || 'onboarding@resend.dev'
const fromName = process.env.RESEND_FROM_NAME || 'Your Business'
const appName = process.env.APP_NAME || 'Business Dashboard'

interface EmailOptions {
  to: string
  subject: string
  html: string
  text?: string
}

export async function sendEmail(options: EmailOptions): Promise<void> {
  try {
    const { data, error } = await resend.emails.send({
      from: `${fromName} <${fromEmail}>`,
      to: options.to,
      subject: options.subject,
      html: options.html,
      text: options.text,
    })

    if (error) {
      console.error('Resend error:', error)
      throw new Error('Failed to send email')
    }

    console.log('Email sent successfully:', data)
  } catch (error) {
    console.error('Failed to send email:', error)
    throw error
  }
}

export async function sendTwoFactorCode(email: string, code: string): Promise<void> {
  const subject = `Your verification code: ${code}`
  
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2>Verification Code</h2>
      <p>Your verification code is:</p>
      <div style="background: #f0f0f0; padding: 20px; text-align: center; font-size: 32px; font-weight: bold; letter-spacing: 5px;">
        ${code}
      </div>
      <p>This code will expire in 10 minutes.</p>
      <p>If you didn't request this code, please ignore this email.</p>
    </div>
  `

  await sendEmail({
    to: email,
    subject,
    html,
    text: `Your verification code is: ${code}\n\nThis code will expire in 10 minutes.`,
  })
}

export async function sendInvitationEmail(options: {
  to: string
  inviterName: string
  organizationName: string
  inviteUrl: string
  role?: string
}): Promise<void> {
  const { to, inviterName, organizationName, inviteUrl, role } = options
  const subject = `You're invited to join ${organizationName}`
  
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2>You're invited!</h2>
      <p>${inviterName} has invited you to join <strong>${organizationName}</strong>${
        role ? ` as a ${role.toLowerCase().replace('_', ' ')}` : ''
      }.</p>
      <p>Click the button below to accept your invitation and set up your account:</p>
      <div style="text-align: center; margin: 30px 0;">
        <a href="${inviteUrl}" style="background: #0066cc; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; display: inline-block;">
          Accept Invitation
        </a>
      </div>
      <p style="color: #666; font-size: 14px;">
        Or copy and paste this link: ${inviteUrl}
      </p>
      <p style="color: #666; font-size: 14px;">
        This invitation will expire in 7 days.
      </p>
    </div>
  `

  await sendEmail({
    to,
    subject,
    html,
    text: `${inviterName} has invited you to join ${organizationName}${
      role ? ` as a ${role.toLowerCase().replace('_', ' ')}` : ''
    }.\n\nAccept your invitation: ${inviteUrl}\n\nThis invitation will expire in 7 days.`,
  })
}

export async function sendInviteEmail(
  email: string,
  inviterName: string,
  organizationName: string,
  inviteUrl: string,
  role?: string
): Promise<void> {
  // Alias for backwards compatibility
  await sendInvitationEmail({
    to: email,
    inviterName,
    organizationName,
    inviteUrl,
    role,
  })
}

export async function sendWelcomeEmail(
  email: string,
  userName: string,
  organizationName: string
): Promise<void> {
  const loginUrl = `${process.env.NEXT_PUBLIC_APP_URL}/auth/login`
  const subject = `Welcome to ${organizationName}!`
  
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2>Welcome to ${organizationName}!</h2>
      <p>Hi ${userName},</p>
      <p>Your account has been successfully created. You can now access the dashboard and start collaborating with your team.</p>
      <div style="text-align: center; margin: 30px 0;">
        <a href="${loginUrl}" style="background: #0066cc; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; display: inline-block;">
          Go to Dashboard
        </a>
      </div>
      <p style="color: #666; font-size: 14px;">
        We recommend enabling two-factor authentication for added security. You can do this in your security settings once logged in.
      </p>
    </div>
  `

  await sendEmail({
    to: email,
    subject,
    html,
  })
}

export async function sendPasswordResetEmail(
  email: string,
  resetUrl: string
): Promise<void> {
  const subject = `Reset your password for ${appName}`
  
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2>Password Reset Request</h2>
      <p>We received a request to reset your password. Click the button below to create a new password:</p>
      <div style="text-align: center; margin: 30px 0;">
        <a href="${resetUrl}" style="background: #0066cc; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; display: inline-block;">
          Reset Password
        </a>
      </div>
      <p style="color: #666; font-size: 14px;">
        Or copy and paste this link: ${resetUrl}
      </p>
      <p style="color: #666; font-size: 14px;">
        This link will expire in 1 hour. If you didn't request this, please ignore this email.
      </p>
    </div>
  `

  await sendEmail({
    to: email,
    subject,
    html,
    text: `Reset your password: ${resetUrl}\n\nThis link will expire in 1 hour.`,
  })
}