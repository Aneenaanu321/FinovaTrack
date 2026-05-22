const TASK_TEMPLATES = [
  {
    id: 'follow-up-meeting',
    title: 'Follow up after meeting',
    description: 'Send recap and confirm next steps from the last meeting.',
    priority: 'Medium',
  },
  {
    id: 'send-kyc',
    title: 'Send KYC form',
    description: 'Email KYC document checklist and schedule collection.',
    priority: 'High',
  },
  {
    id: 'review-kyc',
    title: 'Review KYC submission',
    description: 'Verify submitted documents and update KYC status.',
    priority: 'High',
  },
  {
    id: 'quote-follow-up',
    title: 'Follow up on quote',
    description: 'Check if the client has questions about the product quote.',
    priority: 'Medium',
  },
];

module.exports = { TASK_TEMPLATES };
