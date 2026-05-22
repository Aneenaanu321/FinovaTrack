const DEAL_STEPS = ['New', 'Contacted', 'Interested', 'Closed'];
const KYC_STEPS = ['Not Started', 'In Progress', 'Completed'];

function ruleBasedSuggestion(client) {
  const reasons = [];
  let suggestion = '';
  let suggestedDealStatus = client.dealStatus;

  const kycDocs = client.kycDocuments || {};
  const missingKyc = ['id', 'addressProof', 'income'].filter((k) => !kycDocs[k]);
  const daysSinceContact = client.lastContactedAt
    ? Math.floor((Date.now() - new Date(client.lastContactedAt)) / 86400000)
    : null;

  if (client.dealStatus === 'Closed') {
    suggestion = 'Send thank-you note and ask for referrals.';
    reasons.push('Deal is closed — focus on relationship and referrals.');
  } else if (client.dealStatus === 'New') {
    suggestion = 'Make first contact call and confirm product interest.';
    suggestedDealStatus = 'Contacted';
    reasons.push('New lead — initial outreach recommended.');
  } else if (client.dealStatus === 'Contacted' && client.kycStatus !== 'Completed') {
    suggestion = missingKyc.length
      ? `Collect KYC documents: ${missingKyc.join(', ').replace(/([A-Z])/g, ' $1').trim()}.`
      : 'Complete KYC verification and schedule product demo.';
    if (client.kycStatus === 'Not Started') reasons.push('KYC not started.');
    if (missingKyc.length) reasons.push(`${missingKyc.length} document(s) still missing.`);
    suggestedDealStatus = 'Interested';
  } else if (client.dealStatus === 'Interested') {
    suggestion = client.productType
      ? `Follow up on ${client.productType} proposal and address objections.`
      : 'Send formal proposal and set closing meeting.';
    reasons.push('Client is interested — move toward close.');
    suggestedDealStatus = 'Interested';
  } else if (daysSinceContact != null && daysSinceContact >= 14) {
    suggestion = 'Re-engage stale lead with a check-in call or limited-time offer.';
    reasons.push(`No contact in ${daysSinceContact} days.`);
  } else if (client.nextAction) {
    suggestion = client.nextAction;
    reasons.push('Using your saved next action.');
  } else {
    suggestion = 'Log a call, update notes, and set a clear next step with due date.';
    reasons.push('No specific next action on file.');
  }

  if (client.notes) {
    const snippet = client.notes.length > 120 ? `${client.notes.slice(0, 120)}…` : client.notes;
    reasons.push(`Notes: "${snippet}"`);
  }

  return {
    suggestion,
    suggestedDealStatus,
    suggestedKycStatus: client.kycStatus,
    reasons,
    source: 'rules',
  };
}

async function openAiSuggestion(client) {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) return null;

  const prompt = `You are a bank sales coach. Given this client JSON, respond with JSON only: {"suggestion":"one sentence next action","suggestedDealStatus":"New|Contacted|Interested|Closed","reasons":["bullet1","bullet2"]}
Client: ${JSON.stringify({
    name: client.name,
    dealStatus: client.dealStatus,
    kycStatus: client.kycStatus,
    productType: client.productType,
    leadSource: client.leadSource,
    notes: client.notes,
    nextAction: client.nextAction,
    lastContactedAt: client.lastContactedAt,
    kycDocuments: client.kycDocuments,
  })}`;

  try {
    const res = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: process.env.OPENAI_MODEL || 'gpt-4o-mini',
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.4,
        max_tokens: 300,
      }),
    });
    if (!res.ok) return null;
    const data = await res.json();
    const text = data.choices?.[0]?.message?.content || '';
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) return null;
    const parsed = JSON.parse(jsonMatch[0]);
    if (!parsed.suggestion) return null;
    return {
      suggestion: parsed.suggestion,
      suggestedDealStatus: DEAL_STEPS.includes(parsed.suggestedDealStatus)
        ? parsed.suggestedDealStatus
        : client.dealStatus,
      suggestedKycStatus: client.kycStatus,
      reasons: Array.isArray(parsed.reasons) ? parsed.reasons : ['AI recommendation'],
      source: 'openai',
    };
  } catch {
    return null;
  }
}

async function suggestNextAction(client) {
  const ai = await openAiSuggestion(client);
  if (ai) return ai;
  return ruleBasedSuggestion(client);
}

module.exports = { suggestNextAction, ruleBasedSuggestion };
