const nodemailer = require('nodemailer');

let transporter = null;

const getSmtpConfig = () => {
  const host = process.env.SMTP_HOST || '';
  const port = process.env.SMTP_PORT ? parseInt(process.env.SMTP_PORT, 10) : 0;
  const secure = String(process.env.SMTP_SECURE || '').toLowerCase() === 'true';
  const user = process.env.SMTP_USER || '';
  const pass = process.env.SMTP_PASS || '';
  const from = process.env.SMTP_FROM || '';

  return { host, port, secure, user, pass, from };
};

const canSendEmail = (config) => {
  return Boolean(config.host && config.port && config.from);
};

const getTransporter = (config) => {
  if (transporter) return transporter;
  transporter = nodemailer.createTransport({
    host: config.host,
    port: config.port,
    secure: config.secure,
    auth: config.user && config.pass ? { user: config.user, pass: config.pass } : undefined
  });
  return transporter;
};

const formatDate = (dateValue) => {
  if (!dateValue) return 'N/A';
  const date = new Date(dateValue);
  if (Number.isNaN(date.getTime())) return 'N/A';
  return date.toISOString().split('T')[0];
};

const buildApprovalEmail = ({ request, borrower, item, approver }) => {
  const itemName = item?.name || 'Unknown Item';
  const approverName = approver?.name || approver?.userId || 'Approver';
  const subject = `Request ${request.requestId} approved`;
  const body = [
    `Hello ${borrower?.name || borrower?.userId || 'Borrower'},`,
    '',
    'Your borrow request has been approved and is pending check-out.',
    `Request ID: ${request.requestId}`,
    `Item: ${request.itemID} - ${itemName}`,
    `Return by: ${formatDate(request.returnDate)}`,
    `Approved by: ${approverName}`,
    '',
    'Please visit the inventory counter to complete check-out.',
    '',
    'Thank you,',
    'Inventory System'
  ].join('\n');

  return { subject, body };
};

const buildRejectionEmail = ({ request, borrower, item, approver, reason }) => {
  const itemName = item?.name || 'Unknown Item';
  const approverName = approver?.name || approver?.userId || 'Approver';
  const subject = `Request ${request.requestId} rejected`;
  const body = [
    `Hello ${borrower?.name || borrower?.userId || 'Borrower'},`,
    '',
    'Your borrow request has been rejected.',
    `Request ID: ${request.requestId}`,
    `Item: ${request.itemID} - ${itemName}`,
    `Rejected by: ${approverName}`,
    `Reason: ${reason || request.notes || 'No reason provided'}`,
    '',
    'If you have questions, please contact the inventory team.',
    '',
    'Thank you,',
    'Inventory System'
  ].join('\n');

  return { subject, body };
};

const sendEmail = async ({ to, subject, text }) => {
  const config = getSmtpConfig();
  if (!canSendEmail(config)) {
    return { skipped: true, reason: 'SMTP not configured' };
  }

  const emailTransporter = getTransporter(config);
  await emailTransporter.sendMail({
    from: config.from,
    to,
    subject,
    text
  });

  return { sent: true };
};

const sendApprovalEmail = async ({ request, borrower, item, approver }) => {
  if (!borrower?.email) {
    return { skipped: true, reason: 'Borrower email missing' };
  }
  const { subject, body } = buildApprovalEmail({ request, borrower, item, approver });
  return sendEmail({ to: borrower.email, subject, text: body });
};

const sendRejectionEmail = async ({ request, borrower, item, approver, reason }) => {
  if (!borrower?.email) {
    return { skipped: true, reason: 'Borrower email missing' };
  }
  const { subject, body } = buildRejectionEmail({ request, borrower, item, approver, reason });
  return sendEmail({ to: borrower.email, subject, text: body });
};

module.exports = {
  sendApprovalEmail,
  sendRejectionEmail
};
