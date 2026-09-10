// analyzer.js — the actual scoring engine. Pure function, no I/O, easy to unit test.

const ACTION_VERBS = ["led","built","developed","designed","implemented","launched","managed","created","architected","optimized","increased","decreased","reduced","improved","automated","spearheaded","drove","delivered","engineered","streamlined","negotiated","scaled","founded","directed","executed","analyzed","migrated","mentored","coordinated","resolved","accelerated","generated","achieved","transformed","established","authored","deployed","refactored","enhanced","pioneered"];

const BUZZWORDS = ["hardworking","team player","detail-oriented","results-driven","dynamic","go-getter","think outside the box","synergy","self-starter","responsible for","duties included","hard worker","fast learner","passionate about","strong communication skills","people person"];

const SECTION_PATTERNS = {
  contact: /(email|phone|linkedin|github|portfolio)/i,
  summary: /(summary|objective|profile)/i,
  experience: /(experience|employment|work history)/i,
  education: /(education|academic)/i,
  skills: /(skills|technologies|technical proficienc)/i,
  projects: /(projects|portfolio)/i
};

const ROLE_KEYWORDS = {
  swe: ["python","java","javascript","react","node","api","sql","git","cloud","aws","docker","kubernetes","algorithm","system design","microservices","ci/cd","testing","backend","frontend","database"],
  data: ["python","sql","excel","tableau","power bi","statistics","machine learning","pandas","regression","dashboard","etl","visualization","a/b testing","forecasting","r language"],
  pm: ["roadmap","stakeholder","agile","scrum","user research","kpi","product strategy","backlog","go-to-market","cross-functional","metrics","a/b testing","prioritization"],
  design: ["figma","user research","wireframe","prototype","usability","design system","ux","ui","accessibility","user testing","interaction design","visual design"],
  marketing: ["seo","campaign","content strategy","social media","analytics","brand","conversion","email marketing","google analytics","growth","roi","audience"]
};

function escapeRegex(s) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function analyzeResume(rawText, role) {
  const text = (rawText || "").toString();
  const lower = text.toLowerCase();
  const words = text.trim().split(/\s+/).filter(Boolean);
  const wordCount = words.length;
  const lines = text.split(/\n/).map(l => l.trim()).filter(Boolean);
  const bulletLines = lines.filter(l => /^[•\-*▪◦]/.test(l) || /^\d+\./.test(l));
  const effectiveBullets = bulletLines.length > 3 ? bulletLines : lines.filter(l => l.length > 25 && l.length < 220);

  // Structure
  let sectionsFound = 0;
  const sectionStatus = {};
  for (const key in SECTION_PATTERNS) {
    const found = SECTION_PATTERNS[key].test(lower);
    sectionStatus[key] = found;
    if (found) sectionsFound++;
  }
  const hasEmail = /[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}/i.test(text);
  const hasPhone = /(\+?\d[\d\s\-()]{8,}\d)/.test(text);
  let structureScore = Math.round((sectionsFound / 6) * 70 + (hasEmail ? 15 : 0) + (hasPhone ? 15 : 0));
  structureScore = Math.min(100, structureScore);

  // Length
  let lengthScore;
  if (wordCount < 150) lengthScore = 35;
  else if (wordCount < 300) lengthScore = 65;
  else if (wordCount <= 850) lengthScore = 100;
  else if (wordCount <= 1100) lengthScore = 75;
  else lengthScore = 50;

  // Impact
  let verbBulletCount = 0;
  effectiveBullets.forEach(b => {
    const firstWord = b.replace(/^[•\-*▪◦\d.\s]+/, "").split(/\s+/)[0]?.toLowerCase().replace(/[^a-z]/g, "");
    if (ACTION_VERBS.includes(firstWord)) verbBulletCount++;
  });
  const numberBulletCount = effectiveBullets.filter(b => /\d/.test(b)).length;
  const totalBullets = Math.max(effectiveBullets.length, 1);
  const verbRatio = verbBulletCount / totalBullets;
  const numRatio = numberBulletCount / totalBullets;
  let impactScore = Math.round(verbRatio * 55 + numRatio * 45);
  impactScore = Math.min(100, impactScore);

  // Clarity
  let buzzHits = 0;
  BUZZWORDS.forEach(b => {
    const m = lower.match(new RegExp(escapeRegex(b), "g"));
    if (m) buzzHits += m.length;
  });
  const passiveHits = (lower.match(/\b(was|were|been|being)\s+\w+ed\b/g) || []).length;
  let clarityScore = 100 - Math.min(70, buzzHits * 12) - Math.min(20, passiveHits * 5);
  clarityScore = Math.max(10, clarityScore);

  // Keywords
  let keywordScore = null;
  let matchedKw = [];
  let missedKw = [];
  if (role && ROLE_KEYWORDS[role]) {
    ROLE_KEYWORDS[role].forEach(k => {
      if (lower.includes(k)) matchedKw.push(k);
      else missedKw.push(k);
    });
    keywordScore = Math.round((matchedKw.length / ROLE_KEYWORDS[role].length) * 100);
  }

  const subScores = keywordScore !== null
    ? [
        { label: "Structure & ATS parse", value: structureScore, color: "teal" },
        { label: "Impact & metrics", value: impactScore, color: "amber" },
        { label: "Language clarity", value: clarityScore, color: "teal" },
        { label: `Keyword match (${role})`, value: keywordScore, color: "amber" }
      ]
    : [
        { label: "Structure & ATS parse", value: structureScore, color: "teal" },
        { label: "Impact & metrics", value: impactScore, color: "amber" },
        { label: "Language clarity", value: clarityScore, color: "teal" },
        { label: "Length & density", value: lengthScore, color: "amber" }
      ];

  const overall = Math.round(subScores.reduce((s, x) => s + x.value, 0) / subScores.length);

  const strengths = [];
  const improvements = [];

  if (hasEmail && hasPhone) strengths.push("Contact details are complete and easy to find.");
  else improvements.push("Add a clear email and phone number near the top — missing contact info is an instant ATS flag.");

  const missingSections = Object.entries(sectionStatus).filter(([, v]) => !v).map(([k]) => k);
  if (missingSections.length === 0) strengths.push("All core sections are present — experience, education, skills.");
  else improvements.push(`Add or clearly label: ${missingSections.join(", ")}. Section headers help both ATS parsers and skimming recruiters.`);

  const verbRatioPct = Math.round((verbBulletCount / totalBullets) * 100);
  if (verbRatioPct >= 50) strengths.push(`${verbRatioPct}% of your bullets open with a strong action verb.`);
  else improvements.push(`Only ${verbRatioPct}% of bullets start with a strong verb. Rewrite passive lines — "Was responsible for X" -> "Led X".`);

  const numRatioPct = Math.round((numberBulletCount / totalBullets) * 100);
  if (numRatioPct >= 40) strengths.push(`${numRatioPct}% of your bullets include a measurable result — recruiters trust numbers.`);
  else improvements.push(`Only ${numRatioPct}% of bullets are quantified. Add numbers: time saved, % improved, scale, revenue, users.`);

  if (buzzHits === 0) strengths.push("No generic filler phrases detected — your language stays specific.");
  else improvements.push(`Found ${buzzHits} filler phrase(s) (e.g. "hardworking", "responsible for"). Replace with concrete outcomes.`);

  if (wordCount >= 300 && wordCount <= 850) strengths.push(`Length is in the sweet spot (${wordCount} words) — one focused page.`);
  else if (wordCount < 300) improvements.push(`At ${wordCount} words, this reads thin. Add specifics to your strongest 2-3 achievements.`);
  else improvements.push(`At ${wordCount} words, this may run past one page. Cut older or less relevant bullets.`);

  if (role && matchedKw.length) {
    strengths.push(`Matches ${matchedKw.length}/${matchedKw.length + missedKw.length} common ${role.toUpperCase()} keywords: ${matchedKw.slice(0, 5).join(", ")}${matchedKw.length > 5 ? "…" : ""}.`);
  }
  if (role && missedKw.length) {
    improvements.push(`Missing common keywords for this role: ${missedKw.slice(0, 6).join(", ")}. Weave in the ones that genuinely apply.`);
  }

  return {
    overall,
    subScores,
    sectionStatus,
    hasEmail,
    hasPhone,
    verbBulletCount,
    totalBullets,
    numberBulletCount,
    buzzHits,
    passiveHits,
    matchedKw,
    missedKw,
    role: role || null,
    wordCount,
    strengths,
    improvements,
    text
  };
}

module.exports = { analyzeResume, ACTION_VERBS, BUZZWORDS };
