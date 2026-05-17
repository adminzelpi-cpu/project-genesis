// Shared helper to schedule emails for delayed sending
// Used by payment edge functions to delay PIX/boleto emails

const DELAY_MINUTES = 10; // Wait 10 minutes before sending PIX/boleto emails

export interface ScheduleEmailParams {
  supabase: any;
  storeId: string;
  orderId: string;
  emailType: string;
  recipientEmail: string;
  recipientName: string;
  emailPayload: Record<string, any>;
  delayMinutes?: number;
  cancelIfPaymentConfirmed?: boolean;
}

export async function scheduleDelayedEmail(params: ScheduleEmailParams) {
  const {
    supabase,
    storeId,
    orderId,
    emailType,
    recipientEmail,
    recipientName,
    emailPayload,
    delayMinutes = DELAY_MINUTES,
    cancelIfPaymentConfirmed = true,
  } = params;

  const sendAfter = new Date(Date.now() + delayMinutes * 60 * 1000).toISOString();

  const { error } = await supabase
    .from("scheduled_emails")
    .insert({
      store_id: storeId,
      order_id: orderId,
      email_type: emailType,
      recipient_email: recipientEmail,
      recipient_name: recipientName,
      email_payload: emailPayload,
      send_after: sendAfter,
      cancel_if_payment_confirmed: cancelIfPaymentConfirmed,
      status: "pending",
    });

  if (error) {
    console.error(`[scheduleDelayedEmail] Error scheduling ${emailType}:`, error);
    throw error;
  }

  console.log(`[scheduleDelayedEmail] Scheduled ${emailType} for ${recipientEmail} at ${sendAfter} (${delayMinutes}min delay)`);
}
