(() => {
  const fields = {
    regMid: document.getElementById('regMid'),
    regEnd: document.getElementById('regEnd'),
    finalExam: document.getElementById('finalExam')
  };
  const errorElements = {
    regMid: document.getElementById('regMid-error'),
    regEnd: document.getElementById('regEnd-error'),
    finalExam: document.getElementById('finalExam-error')
  };
  const labels = { regMid: 'RegMid', regEnd: 'RegEnd', finalExam: 'Final Exam Point' };
  const predictions = document.getElementById('predictions');
  const scholarshipPrediction = document.getElementById('scholarshipPrediction');
  const summerPrediction = document.getElementById('summerPrediction');
  const admissionPanel = document.getElementById('admissionPanel');
  const results = document.getElementById('results');
  const formMessage = document.getElementById('formMessage');
  const calculateBtn = document.getElementById('calculateBtn');
  const resetBtn = document.getElementById('resetBtn');
  const EPSILON = 1e-9;
  const MIN_FINAL_EXAM_SCORE = 50;
  let attempted = false;

  function readScore(key) {
    const raw = fields[key].value.trim();
    if (!raw) return { value: null, error: key === 'finalExam' ? '' : `${labels[key]} is required.` };
    const value = Number(raw);
    if (!Number.isFinite(value)) return { value: null, error: 'Enter a valid number.' };
    if (value < 0 || value > 100) return { value: null, error: 'Score must be between 0 and 100.' };
    return { value, error: '' };
  }

  function setError(key, message) {
    errorElements[key].textContent = message;
    fields[key].closest('.field').classList.toggle('invalid', Boolean(message));
    fields[key].setAttribute('aria-invalid', message ? 'true' : 'false');
  }

  function validate(key, showRequired = attempted) {
    const parsed = readScore(key);
    setError(key, showRequired ? parsed.error : (fields[key].value.trim() ? parsed.error : ''));
    return parsed;
  }

  function roundUpTwo(value) {
    return Math.ceil((value - EPSILON) * 100) / 100;
  }

  function scoreText(value) {
    return Number.isInteger(value) ? String(value) : value.toFixed(2).replace(/0+$/, '').replace(/\.$/, '');
  }

  function renderPrediction(target, title, required, impossibleText, note) {
    target.className = 'prediction-card panel';
    let icon = '◎';
    let value;
    let detail;
    if (required > 100 + EPSILON) {
      target.classList.add('impossible');
      icon = '!';
      value = impossibleText;
      detail = 'Your current attestation scores leave no achievable exam score for this target.';
    } else {
      const rounded = Math.min(100, Math.max(MIN_FINAL_EXAM_SCORE, roundUpTwo(Math.max(0, required))));
      if (required <= MIN_FINAL_EXAM_SCORE + EPSILON) {
        target.classList.add('sufficient');
        icon = '✓';
      }
      value = `${scoreText(rounded)} <small>PTS</small>`;
      detail = required <= MIN_FINAL_EXAM_SCORE + EPSILON
        ? 'Your scores meet this target; 50 points is the minimum final exam score.'
        : `${note} The final exam minimum is 50 points.`;
    }
    target.innerHTML = `<div class="prediction-label"><span class="target-icon" aria-hidden="true">${icon}</span><span>${title}</span></div><div class="prediction-value">${value}</div><div class="prediction-note">${detail}</div>`;
  }

  function setStatus(id, label, message, tone) {
    const el = document.getElementById(id);
    el.className = `status-item ${tone}`;
    el.innerHTML = `<span class="status-label">${label}</span><span class="status-value">${message}</span>`;
  }

  function hideResult() {
    results.hidden = true;
  }

  function update() {
    const mid = validate('regMid');
    const end = validate('regEnd');
    const final = validate('finalExam', false);
    formMessage.textContent = '';
    hideResult();
    if (mid.value === null || end.value === null) {
      predictions.hidden = true;
      admissionPanel.hidden = true;
      return;
    }
    const eligible = mid.value >= 25 && end.value >= 25;
    admissionPanel.hidden = false;
    admissionPanel.className = `admission panel state-panel ${eligible ? 'admitted' : ''}`;
    if (!eligible) {
      const below = [];
      if (mid.value < 25) below.push(`RegMid is ${scoreText(mid.value)}; at least 25 is required.`);
      if (end.value < 25) below.push(`RegEnd is ${scoreText(end.value)}; at least 25 is required.`);
      admissionPanel.innerHTML = `<div class="admission-inner"><span class="state-icon" aria-hidden="true">!</span><div><strong>You are NOT eligible to take the Final Exam.</strong><p>${below.join(' ')}</p></div></div>`;
      predictions.hidden = true;
      return;
    }
    admissionPanel.innerHTML = '<div class="admission-inner"><span class="state-icon" aria-hidden="true">✓</span><div><strong>Eligible for the Final Exam</strong><p>Both attestation scores meet the minimum requirement of 25.</p></div></div>';
    const coursework = mid.value * 0.3 + end.value * 0.3;
    renderPrediction(scholarshipPrediction, 'Final Exam Points Needed for Scholarship', (70 - coursework) / 0.4, 'Unfortunately, it is impossible to maintain your scholarship with your current attestation scores.', 'Minimum exam score for scholarship, with a 50-point exam minimum.');
    renderPrediction(summerPrediction, 'Final Exam Points Needed to Avoid Summer Trimester', (50 - coursework) / 0.4, 'Unfortunately, it is impossible to avoid the Summer Trimester with your current attestation scores.', 'Minimum exam score to avoid summer, with a 50-point exam minimum.');
    predictions.hidden = false;
    if (final.value === null) return;
    renderResult(mid.value, end.value, final.value);
  }

  function renderResult(mid, end, exam) {
    const total = mid * 0.3 + end * 0.3 + exam * 0.4;
    const shownTotal = Math.round((total + Number.EPSILON) * 100) / 100;
    const keepScholarship = total >= 70 - EPSILON;
    const summerRequired = exam < MIN_FINAL_EXAM_SCORE || total < 50 - EPSILON;
    const inMiddleBand = !keepScholarship && !summerRequired;
    document.getElementById('totalScore').textContent = scoreText(shownTotal);
    document.getElementById('scoreOrbit').style.setProperty('--score-angle', `${Math.max(0, Math.min(100, total)) * 3.6}deg`);
    document.getElementById('resultTitle').textContent = summerRequired ? 'Summer trimester ahead' : keepScholarship ? 'Scholarship secured' : 'You’re on track';
    document.getElementById('resultExplanation').textContent = inMiddleBand
      ? 'You do not maintain your scholarship, but you do not need the Summer Trimester.'
      : summerRequired
        ? exam < MIN_FINAL_EXAM_SCORE
          ? 'Your final exam score is below 50, so you must study in the Summer Trimester.'
          : 'Your total is below 50, so you must study in the Summer Trimester.'
        : 'Your total is 70 or higher. You keep your scholarship and avoid the Summer Trimester.';
    setStatus('scholarshipStatus', 'SCHOLARSHIP', keepScholarship ? 'Congratulations! You keep your scholarship.' : 'You do not maintain your scholarship.', keepScholarship ? 'good' : 'bad');
    setStatus('summerStatus', 'SUMMER TRIMESTER', summerRequired ? 'You must study in the Summer Trimester.' : 'Summer Trimester is not required.', summerRequired ? 'bad' : 'good');
    document.getElementById('scoreBreakdown').innerHTML = `<span class="breakdown-chip">REGMID <b>${scoreText(mid)}</b></span><span class="breakdown-chip">REGEND <b>${scoreText(end)}</b></span><span class="breakdown-chip">FINAL EXAM <b>${scoreText(exam)}</b></span>`;
    results.hidden = false;
  }

  Object.entries(fields).forEach(([key, field]) => field.addEventListener('input', () => {
    if (attempted && key !== 'finalExam') validate(key, true);
    update();
  }));

  calculateBtn.addEventListener('click', () => {
    attempted = true;
    const mid = validate('regMid', true);
    const end = validate('regEnd', true);
    const final = validate('finalExam', true);
    if (mid.value === null || end.value === null || final.value === null) {
      formMessage.textContent = 'Enter valid scores for all three fields to calculate your result.';
      update();
      return;
    }
    update();
    if (mid.value >= 25 && end.value >= 25) {
      renderResult(mid.value, end.value, final.value);
      results.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
  });

  resetBtn.addEventListener('click', () => {
    Object.entries(fields).forEach(([key, field]) => {
      field.value = '';
      setError(key, '');
    });
    attempted = false;
    formMessage.textContent = '';
    predictions.hidden = true;
    admissionPanel.hidden = true;
    results.hidden = true;
  });
})();


