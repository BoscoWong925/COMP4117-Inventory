const { EmailClient } = require('@azure/communication-email');
const Notification = require('../models/Notification');

let emailClient = null;

// ─── In-App Notification Helper ───────────────────────────
const createNotification = async ({ recipientId, type, subject, message, relatedRequestId, relatedItemId, senderName }) => {
  try {
    if (!recipientId) return;
    await Notification.create({
      recipientId,
      type,
      subject,
      message,
      relatedRequestId: relatedRequestId || null,
      relatedItemId: relatedItemId || null,
      senderName: senderName || 'Inventory System'
    });
  } catch (err) {
    console.error('Failed to create in-app notification:', err.message);
  }
};

// ─── Azure Configuration ──────────────────────────────────
const getAzureConfig = () => {
  const connectionString = process.env.AZURE_COMMUNICATION_CONNECTION_STRING || '';
  const fromEmail = process.env.AZURE_EMAIL_FROM || '';

  return { connectionString, fromEmail };
};

const canSendEmail = (config) => {
  return Boolean(config.connectionString && config.fromEmail);
};

const getEmailClient = (config) => {
  if (emailClient) return emailClient;
  emailClient = new EmailClient(config.connectionString);
  return emailClient;
};

const formatDate = (dateValue) => {
  if (!dateValue) return 'N/A';
  const date = new Date(dateValue);
  if (Number.isNaN(date.getTime())) return 'N/A';
  return date.toISOString().split('T')[0];
};

// ─── Core send function ───────────────────────────────────
const sendEmail = async ({ to, subject, text }) => {
  const config = getAzureConfig();
  if (!canSendEmail(config)) {
    return { skipped: true, reason: 'Azure Communication Service not configured' };
  }

  try {
    const client = getEmailClient(config);
    const recipientList = Array.isArray(to)
      ? to
      : String(to)
          .split(',')
          .map((email) => email.trim())
          .filter(Boolean);

    if (recipientList.length === 0) {
      return { skipped: true, reason: 'No valid recipient emails' };
    }

    const emailMessage = {
      senderAddress: config.fromEmail,
      recipients: {
        to: recipientList.map((email) => ({ address: email }))
      },
      content: {
        subject: subject,
        plainText: text
      }
    };

    const poller = await client.beginSend(emailMessage);
    await poller.pollUntilDone();
    return { sent: true };
  } catch (error) {
    console.error('Azure email sending error:', error);
    return { sent: false, error: error.message };
  }
};

// ─── Borrow Request Emails ───────────────────────────────

/** Notify borrower: request approved */
const sendApprovalEmail = async ({ request, borrower, item, approver }) => {
  const subject = `[Inventory] Request ${request.requestId} Approved`;
  const text = [
    `Hello ${borrower.name || borrower.userId},`,
    '',
    'Your borrow request has been approved and is pending check-out.',
    `Request ID: ${request.requestId}`,
    `Item: ${request.itemID} - ${item?.name || 'Unknown'}`,
    `Return by: ${formatDate(request.returnDate)}`,
    `Approved by: ${approver?.name || approver?.userId || 'Approver'}`,
    '',
    'Please visit the inventory counter to complete check-out.',
    '',
    'Inventory System'
  ].join('\n');
  await createNotification({ recipientId: borrower?.userId, type: 'request_approved', subject, message: text, relatedRequestId: request.requestId, relatedItemId: request.itemID, senderName: approver?.name || 'Approver' });
  if (!borrower?.email) return { skipped: true, reason: 'Borrower email missing' };
  return sendEmail({ to: borrower.email, subject, text });
};

/** Notify borrower: request rejected */
const sendRejectionEmail = async ({ request, borrower, item, approver, reason }) => {
  const subject = `[Inventory] Request ${request.requestId} Rejected`;
  const text = [
    `Hello ${borrower.name || borrower.userId},`,
    '',
    'Your borrow request has been rejected.',
    `Request ID: ${request.requestId}`,
    `Item: ${request.itemID} - ${item?.name || 'Unknown'}`,
    `Rejected by: ${approver?.name || approver?.userId || 'Approver'}`,
    `Reason: ${reason || request.notes || 'No reason provided'}`,
    '',
    'If you have questions, please contact the inventory team.',
    '',
    'Inventory System'
  ].join('\n');
  await createNotification({ recipientId: borrower?.userId, type: 'request_rejected', subject, message: text, relatedRequestId: request.requestId, relatedItemId: request.itemID, senderName: approver?.name || 'Approver' });
  if (!borrower?.email) return { skipped: true, reason: 'Borrower email missing' };
  return sendEmail({ to: borrower.email, subject, text });
};

/** Notify item owner / operators: new borrow request submitted */
const sendNewRequestEmail = async ({ request, borrower, item, recipients }) => {
  if (!recipients || recipients.length === 0) return { skipped: true, reason: 'No recipients' };
  const subject = `[Inventory] New Borrow Request ${request.requestId}`;
  const text = [
    'A new borrow request has been submitted.',
    '',
    `Request ID: ${request.requestId}`,
    `Item: ${request.itemID} - ${item?.name || 'Unknown'}`,
    `Requested by: ${borrower?.name || borrower?.userId || 'Unknown'} (${borrower?.email || 'N/A'})`,
    `Reason: ${request.reason || 'N/A'}`,
    `Date: ${formatDate(request.requestDate)}`,
    '',
    'Please review this request in the inventory system.',
    '',
    'Inventory System'
  ].join('\n');
  for (const r of recipients) {
    if (r.userId) await createNotification({ recipientId: r.userId, type: 'new_request', subject, message: text, relatedRequestId: request.requestId, relatedItemId: request.itemID, senderName: borrower?.name || 'Borrower' });
  }
  const emails = recipients.map(r => r.email).filter(Boolean);
  if (emails.length === 0) return { skipped: true, reason: 'No valid recipient emails' };
  return sendEmail({ to: emails.join(','), subject, text });
};

/** Notify borrower: item checked out */
const sendCheckoutEmail = async ({ request, borrower, item, operator }) => {
  const subject = `[Inventory] Item Checked Out - ${request.requestId}`;
  const text = [
    `Hello ${borrower.name || borrower.userId},`,
    '',
    'Your item has been checked out successfully.',
    `Request ID: ${request.requestId}`,
    `Item: ${request.itemID} - ${item?.name || 'Unknown'}`,
    `Checked out by: ${operator?.name || operator?.userId || 'Operator'}`,
    `Return by: ${formatDate(request.returnDate)}`,
    '',
    'Please return the item on time.',
    '',
    'Inventory System'
  ].join('\n');
  await createNotification({ recipientId: borrower?.userId, type: 'checkout', subject, message: text, relatedRequestId: request.requestId, relatedItemId: request.itemID, senderName: operator?.name || 'Operator' });
  if (!borrower?.email) return { skipped: true, reason: 'Borrower email missing' };
  return sendEmail({ to: borrower.email, subject, text });
};

/** Notify borrower: checkout denied */
const sendCheckoutDeniedEmail = async ({ request, borrower, item, operator, reason }) => {
  const subject = `[Inventory] Check-Out Denied - ${request.requestId}`;
  const text = [
    `Hello ${borrower.name || borrower.userId},`,
    '',
    'Your pending check-out has been denied.',
    `Request ID: ${request.requestId}`,
    `Item: ${request.itemID} - ${item?.name || 'Unknown'}`,
    `Denied by: ${operator?.name || operator?.userId || 'Operator'}`,
    `Reason: ${reason || 'No reason provided'}`,
    '',
    'If you have questions, please contact the inventory team.',
    '',
    'Inventory System'
  ].join('\n');
  await createNotification({ recipientId: borrower?.userId, type: 'checkout_denied', subject, message: text, relatedRequestId: request.requestId, relatedItemId: request.itemID, senderName: operator?.name || 'Operator' });
  if (!borrower?.email) return { skipped: true, reason: 'Borrower email missing' };
  return sendEmail({ to: borrower.email, subject, text });
};

/** Notify owner / operators: item returned */
const sendReturnEmail = async ({ request, borrower, item, recipients }) => {
  if (!recipients || recipients.length === 0) return { skipped: true, reason: 'No recipients' };
  const subject = `[Inventory] Item Returned - ${request.requestId}`;
  const text = [
    'An item has been returned.',
    '',
    `Request ID: ${request.requestId}`,
    `Item: ${request.itemID} - ${item?.name || 'Unknown'}`,
    `Returned by: ${borrower?.name || borrower?.userId || 'Unknown'}`,
    `Condition: ${request.condition || 'Not specified'}`,
    `Return notes: ${request.returnNotes || 'None'}`,
    `Date: ${formatDate(request.returnedDate)}`,
    '',
    'Inventory System'
  ].join('\n');
  for (const r of recipients) {
    if (r.userId) await createNotification({ recipientId: r.userId, type: 'item_returned', subject, message: text, relatedRequestId: request.requestId, relatedItemId: request.itemID, senderName: borrower?.name || 'Borrower' });
  }
  const emails = recipients.map(r => r.email).filter(Boolean);
  if (emails.length === 0) return { skipped: true, reason: 'No valid recipient emails' };
  return sendEmail({ to: emails.join(','), subject, text });
};

// ─── Item Emails ──────────────────────────────────────────

/** Notify owner: item status changed (e.g. Missing, Dispose) */
const sendItemStatusChangeEmail = async ({ item, oldStatus, newStatus, changedBy, recipients }) => {
  if (!recipients || recipients.length === 0) return { skipped: true, reason: 'No recipients' };
  const subject = `[Inventory] Item Status Changed - ${item.itemId}`;
  const text = [
    'An item status has been changed.',
    '',
    `Item: ${item.itemId} - ${item.name || 'Unknown'}`,
    `Status: ${oldStatus} → ${newStatus}`,
    `Changed by: ${changedBy?.name || changedBy?.userId || 'Unknown'}`,
    `Date: ${formatDate(new Date())}`,
    '',
    'Inventory System'
  ].join('\n');  for (const r of recipients) {
    if (r.userId) await createNotification({ recipientId: r.userId, type: 'item_status_change', subject, message: text, relatedItemId: item.itemId, senderName: changedBy?.name || 'System' });
  }  const emails = recipients.map(r => r.email).filter(Boolean);
  if (emails.length === 0) return { skipped: true, reason: 'No valid recipient emails' };
  return sendEmail({ to: emails.join(','), subject, text });
};

// ─── User / Account Emails ────────────────────────────────

/** Welcome email on account creation */
const sendWelcomeEmail = async ({ user, createdBy }) => {
  const subject = '[Inventory] Your Account Has Been Created';
  const text = [
    `Hello ${user.name},`,
    '',
    'An account has been created for you in the Inventory System.',
    `Username: ${user.username}`,
    `Role: ${user.role}${user.subRole ? ' (' + user.subRole + ')' : ''}`,
    `Department: ${user.department}`,
    '',
    'Please log in and change your password.',
    '',
    'Inventory System'
  ].join('\n');
  await createNotification({ recipientId: user?.userId, type: 'welcome', subject, message: text });
  if (!user?.email) return { skipped: true, reason: 'User email missing' };
  return sendEmail({ to: user.email, subject, text });
};

/** Notify user: account deactivated */
const sendAccountDeactivatedEmail = async ({ user }) => {
  const subject = '[Inventory] Your Account Has Been Deactivated';
  const text = [
    `Hello ${user.name},`,
    '',
    'Your account in the Inventory System has been deactivated.',
    'You will no longer be able to log in.',
    '',
    'If you believe this is an error, please contact an administrator.',
    '',
    'Inventory System'
  ].join('\n');
  await createNotification({ recipientId: user?.userId, type: 'account_deactivated', subject, message: text });
  if (!user?.email) return { skipped: true, reason: 'User email missing' };
  return sendEmail({ to: user.email, subject, text });
};

/** Notify user: account reactivated */
const sendAccountActivatedEmail = async ({ user }) => {
  const subject = '[Inventory] Your Account Has Been Reactivated';
  const text = [
    `Hello ${user.name},`,
    '',
    'Your account in the Inventory System has been reactivated.',
    'You can now log in again.',
    '',
    'Inventory System'
  ].join('\n');
  await createNotification({ recipientId: user?.userId, type: 'account_activated', subject, message: text });
  if (!user?.email) return { skipped: true, reason: 'User email missing' };
  return sendEmail({ to: user.email, subject, text });
};

/** Notify user: role changed */
const sendRoleChangedEmail = async ({ user, oldRole, newRole }) => {
  const subject = '[Inventory] Your Role Has Been Updated';
  const text = [
    `Hello ${user.name},`,
    '',
    `Your role has been updated from "${oldRole}" to "${newRole}".`,
    'Your permissions may have changed.',
    '',
    'Inventory System'
  ].join('\n');
  await createNotification({ recipientId: user?.userId, type: 'role_changed', subject, message: text });
  if (!user?.email) return { skipped: true, reason: 'User email missing' };
  return sendEmail({ to: user.email, subject, text });
};

// ─── Manual / Custom Email ────────────────────────────────

/** Send a custom email (operator/teacher manual send) */
const sendCustomEmail = async ({ to, subject, message, senderName, recipientUserId }) => {
  const fullSubject = `[Inventory] ${subject}`;
  const text = [
    message,
    '',
    `--- Sent by ${senderName || 'Inventory System'}`
  ].join('\n');
  if (recipientUserId) {
    await createNotification({ recipientId: recipientUserId, type: 'custom_email', subject: fullSubject, message: text, senderName: senderName || 'Inventory System' });
  }
  if (!to) return { skipped: true, reason: 'Recipient email missing' };
  return sendEmail({ to, subject: fullSubject, text });
};

module.exports = {
  sendEmail,
  sendApprovalEmail,
  sendRejectionEmail,
  sendNewRequestEmail,
  sendCheckoutEmail,
  sendCheckoutDeniedEmail,
  sendReturnEmail,
  sendItemStatusChangeEmail,
  sendWelcomeEmail,
  sendAccountDeactivatedEmail,
  sendAccountActivatedEmail,
  sendRoleChangedEmail,
  sendCustomEmail
};
