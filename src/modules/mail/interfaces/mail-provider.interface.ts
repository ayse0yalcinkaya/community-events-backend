/**
 * Email Result Interface
 * Returned by email provider after sending an email
 */
export interface EmailResult {
  /**
   * Provider-specific message ID (e.g., SendGrid message ID)
   */
  messageId: string;

  /**
   * Whether the email was sent successfully
   */
  success: boolean;
}

/**
 * Email Provider Interface
 * Abstract interface for email provider implementations (SendGrid, AWS SES, etc.)
 *
 * This interface allows easy provider switching via dynamic injection pattern.
 * All email providers must implement this interface.
 */
export interface IEmailProvider {
  /**
   * Send an email via the provider
   * @param to - Recipient email address
   * @param subject - Email subject
   * @param html - HTML email content
   * @param text - Optional plain text email content (fallback for non-HTML clients)
   * @returns Promise resolving to EmailResult with messageId and success status
   * @throws Provider-specific exceptions (wrapped by MailService)
   */
  send(to: string, subject: string, html: string, text?: string): Promise<EmailResult>;
}
