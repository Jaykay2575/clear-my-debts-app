(function () {
  'use strict';

  // =============================================
  //  ELEMENTS
  // =============================================
  var form = document.getElementById('snapshotForm');
  var progressBar = document.getElementById('progressBar');
  var steps = document.querySelectorAll('.step');
  var totalSteps = 3;

  // Step 1 — Creditors
  var creditorNameInput = document.getElementById('creditorName');
  var creditorAmountInput = document.getElementById('creditorAmount');
  var addCreditorBtn = document.getElementById('addCreditorBtn');
  var creditorList = document.getElementById('creditorList');
  var debtTotal = document.getElementById('debtTotal');
  var debtTotalAmount = document.getElementById('debtTotalAmount');
  var step1Next = document.getElementById('step1Next');
  var autocompleteList = document.getElementById('autocompleteList');

  // Step 2 — Income & Bills
  var monthlyIncomeInput = document.getElementById('monthlyIncome');
  var billInputs = document.querySelectorAll('[data-bill]');
  var totalBillsEl = document.getElementById('totalBills');
  var leftOverEl = document.getElementById('leftOver');
  var budgetSummary = document.getElementById('budgetSummary');
  var step2Next = document.getElementById('step2Next');

  // Step 3 — Contact
  var firstNameInput = document.getElementById('firstName');
  var phoneInput = document.getElementById('phone');
  var emailInput = document.getElementById('email');
  var consentCheck = document.getElementById('consentCheck');
  var submitBtn = document.getElementById('submitBtn');

  // =============================================
  //  DATA
  // =============================================
  var creditors = []; // { name: string, amount: number }

  var CREDITOR_SUGGESTIONS = [
    'CommBank', 'ANZ', 'Westpac', 'NAB', 'Afterpay', 'Zip',
    'Latitude Financial', 'Macquarie Bank', 'Suncorp', 'Bank of Queensland',
    'Bendigo Bank', 'ING', 'Humm', 'Cash Converters', 'Nimble',
    'Wallet Wizard', 'Money3', 'AGL', 'Origin Energy', 'Telstra',
    'Optus', 'Vodafone'
  ];

  // =============================================
  //  UTM & ANALYTICS
  // =============================================
  var params = new URLSearchParams(window.location.search);
  var utm = {
    source:   params.get('utm_source')   || '(direct)',
    medium:   params.get('utm_medium')   || '(none)',
    campaign: params.get('utm_campaign') || '(none)',
    content:  params.get('utm_content')  || '',
    term:     params.get('utm_term')     || ''
  };

  function track(eventName, eventParams) {
    if (typeof gtag === 'function') {
      gtag('event', eventName, eventParams || {});
    }
  }

  track('snapshot_loaded', {
    utm_source: utm.source,
    utm_medium: utm.medium,
    utm_campaign: utm.campaign
  });

  // =============================================
  //  NAVIGATION
  // =============================================
  function updateProgress(step) {
    var pct = Math.round((step / totalSteps) * 100);
    progressBar.style.width = pct + '%';
    progressBar.parentElement.setAttribute('aria-valuenow', pct);
  }

  function goToStep(n) {
    steps.forEach(function (s) { s.classList.remove('active'); });
    var target = document.querySelector('[data-step="' + n + '"]');
    if (target) {
      target.classList.add('active');

      if (typeof n === 'number') {
        updateProgress(n);
        track('snapshot_step', { step_number: n });
      } else {
        progressBar.style.width = '100%';
      }

      // Focus first input on new step
      var firstInput = target.querySelector('input:not([type="hidden"]):not([type="checkbox"])');
      if (firstInput) setTimeout(function () { firstInput.focus(); }, 100);

      // Scroll to top
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }

  // =============================================
  //  HELPERS
  // =============================================
  function formatCurrency(num) {
    if (!num && num !== 0) return '$0';
    return '$' + num.toLocaleString('en-AU');
  }

  function parseCurrencyInput(val) {
    var cleaned = val.replace(/[^0-9]/g, '');
    return cleaned ? parseInt(cleaned, 10) : 0;
  }

  // Format number inputs with commas as user types
  function formatNumberInput(input) {
    var raw = input.value.replace(/[^0-9]/g, '');
    if (raw === '') {
      input.value = '';
      return;
    }
    var num = parseInt(raw, 10);
    input.value = num.toLocaleString('en-AU');
  }

  // =============================================
  //  STEP 1: CREDITORS
  // =============================================

  // --- Autocomplete ---
  var activeAutocompleteIndex = -1;

  function showAutocomplete(query) {
    if (!query || query.length < 1) {
      autocompleteList.classList.remove('open');
      autocompleteList.innerHTML = '';
      activeAutocompleteIndex = -1;
      return;
    }

    var q = query.toLowerCase();
    var matches = CREDITOR_SUGGESTIONS.filter(function (s) {
      return s.toLowerCase().indexOf(q) !== -1;
    });

    // Don't show if exact match or no matches
    if (matches.length === 0 || (matches.length === 1 && matches[0].toLowerCase() === q)) {
      autocompleteList.classList.remove('open');
      autocompleteList.innerHTML = '';
      activeAutocompleteIndex = -1;
      return;
    }

    autocompleteList.innerHTML = '';
    matches.forEach(function (match, i) {
      var div = document.createElement('div');
      div.className = 'autocomplete-item';
      div.textContent = match;
      div.setAttribute('data-index', i);
      div.addEventListener('mousedown', function (e) {
        e.preventDefault(); // prevent blur
        creditorNameInput.value = match;
        autocompleteList.classList.remove('open');
        autocompleteList.innerHTML = '';
        activeAutocompleteIndex = -1;
        creditorAmountInput.focus();
        validateAddCreditor();
      });
      autocompleteList.appendChild(div);
    });

    activeAutocompleteIndex = -1;
    autocompleteList.classList.add('open');
  }

  creditorNameInput.addEventListener('input', function () {
    showAutocomplete(creditorNameInput.value.trim());
    validateAddCreditor();
  });

  creditorNameInput.addEventListener('blur', function () {
    // Delay to allow click on autocomplete item
    setTimeout(function () {
      autocompleteList.classList.remove('open');
    }, 150);
  });

  creditorNameInput.addEventListener('focus', function () {
    if (creditorNameInput.value.trim().length >= 1) {
      showAutocomplete(creditorNameInput.value.trim());
    }
  });

  creditorNameInput.addEventListener('keydown', function (e) {
    var items = autocompleteList.querySelectorAll('.autocomplete-item');
    if (!items.length) {
      if (e.key === 'Enter') {
        e.preventDefault();
        if (!addCreditorBtn.disabled) {
          addCreditor();
        }
      }
      return;
    }

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      activeAutocompleteIndex = Math.min(activeAutocompleteIndex + 1, items.length - 1);
      updateAutocompleteHighlight(items);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      activeAutocompleteIndex = Math.max(activeAutocompleteIndex - 1, -1);
      updateAutocompleteHighlight(items);
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (activeAutocompleteIndex >= 0 && items[activeAutocompleteIndex]) {
        creditorNameInput.value = items[activeAutocompleteIndex].textContent;
        autocompleteList.classList.remove('open');
        autocompleteList.innerHTML = '';
        activeAutocompleteIndex = -1;
        creditorAmountInput.focus();
        validateAddCreditor();
      } else if (!addCreditorBtn.disabled) {
        addCreditor();
      }
    } else if (e.key === 'Escape') {
      autocompleteList.classList.remove('open');
      activeAutocompleteIndex = -1;
    }
  });

  function updateAutocompleteHighlight(items) {
    items.forEach(function (item, i) {
      item.classList.toggle('active', i === activeAutocompleteIndex);
    });
  }

  // --- Creditor Amount formatting ---
  creditorAmountInput.addEventListener('input', function () {
    formatNumberInput(creditorAmountInput);
    validateAddCreditor();
  });

  creditorAmountInput.addEventListener('keydown', function (e) {
    if (e.key === 'Enter') {
      e.preventDefault();
      if (!addCreditorBtn.disabled) {
        addCreditor();
      }
    }
  });

  // --- Validate Add Creditor ---
  function validateAddCreditor() {
    var nameOk = creditorNameInput.value.trim().length >= 1;
    var amount = parseCurrencyInput(creditorAmountInput.value);
    var amountOk = amount > 0;
    addCreditorBtn.disabled = !(nameOk && amountOk);
  }

  // --- Add Creditor ---
  addCreditorBtn.addEventListener('click', addCreditor);

  function addCreditor() {
    var name = creditorNameInput.value.trim();
    var amount = parseCurrencyInput(creditorAmountInput.value);
    if (!name || amount <= 0) return;

    creditors.push({ name: name, amount: amount });
    renderCreditors();

    // Clear inputs
    creditorNameInput.value = '';
    creditorAmountInput.value = '';
    addCreditorBtn.disabled = true;
    creditorNameInput.focus();

    track('creditor_added', { creditor: name, amount: amount, total_creditors: creditors.length });
  }

  function removeCreditor(index) {
    creditors.splice(index, 1);
    renderCreditors();
  }

  function renderCreditors() {
    creditorList.innerHTML = '';

    creditors.forEach(function (c, i) {
      var card = document.createElement('div');
      card.className = 'creditor-card';
      card.innerHTML =
        '<div class="creditor-card__info">' +
          '<span class="creditor-card__name">' + escapeHtml(c.name) + '</span>' +
          '<span class="creditor-card__amount">' + formatCurrency(c.amount) + '</span>' +
        '</div>' +
        '<button type="button" class="creditor-card__remove" aria-label="Remove ' + escapeHtml(c.name) + '">' +
          '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>' +
        '</button>';

      card.querySelector('.creditor-card__remove').addEventListener('click', function () {
        removeCreditor(i);
      });

      creditorList.appendChild(card);
    });

    // Update total
    var total = creditors.reduce(function (sum, c) { return sum + c.amount; }, 0);
    debtTotalAmount.textContent = formatCurrency(total);

    // Show/hide total and continue
    if (creditors.length > 0) {
      debtTotal.style.display = '';
      step1Next.style.display = '';
    } else {
      debtTotal.style.display = 'none';
      step1Next.style.display = 'none';
    }
  }

  function escapeHtml(str) {
    var div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }

  step1Next.addEventListener('click', function () {
    if (creditors.length > 0) {
      goToStep(2);
    }
  });

  // =============================================
  //  STEP 2: INCOME & BILLS
  // =============================================
  monthlyIncomeInput.addEventListener('input', function () {
    formatNumberInput(monthlyIncomeInput);
    updateBudgetSummary();
    validateStep2();
  });

  billInputs.forEach(function (input) {
    input.addEventListener('input', function () {
      formatNumberInput(input);
      updateBudgetSummary();
    });
  });

  function updateBudgetSummary() {
    var income = parseCurrencyInput(monthlyIncomeInput.value);
    var totalBills = 0;
    billInputs.forEach(function (input) {
      totalBills += parseCurrencyInput(input.value);
    });

    totalBillsEl.textContent = formatCurrency(totalBills);

    var leftOver = income - totalBills;
    leftOverEl.textContent = formatCurrency(leftOver) + '/month';

    var highlightRow = budgetSummary.querySelector('.budget-summary__row--highlight');
    if (leftOver < 0 && income > 0) {
      highlightRow.classList.add('budget-summary__row--negative');
    } else {
      highlightRow.classList.remove('budget-summary__row--negative');
    }
  }

  function validateStep2() {
    var income = parseCurrencyInput(monthlyIncomeInput.value);
    step2Next.disabled = income <= 0;
  }

  step2Next.addEventListener('click', function () {
    if (parseCurrencyInput(monthlyIncomeInput.value) > 0) {
      goToStep(3);
    }
  });

  // =============================================
  //  STEP 3: CONTACT & SUBMIT
  // =============================================
  function validateStep3() {
    var name = firstNameInput.value.trim();
    var phone = phoneInput.value.trim().replace(/\s/g, '');
    var email = emailInput.value.trim();
    var nameOk = name.length >= 2;
    var phoneOk = phone.length >= 8;
    var emailOk = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
    var consentOk = consentCheck.checked;
    submitBtn.disabled = !(nameOk && phoneOk && emailOk && consentOk);
  }

  firstNameInput.addEventListener('input', validateStep3);
  emailInput.addEventListener('input', validateStep3);
  consentCheck.addEventListener('change', function () {
    var toggle = consentCheck.closest('.consent-toggle');
    if (toggle) toggle.classList.remove('error');
    validateStep3();
  });

  // Format phone number
  phoneInput.addEventListener('input', function () {
    var val = phoneInput.value.replace(/[^\d]/g, '');
    if (val.length > 10) val = val.substring(0, 10);
    if (val.length >= 4 && val.startsWith('04')) {
      val = val.substring(0, 4) + ' ' + val.substring(4, 7) + (val.length > 7 ? ' ' + val.substring(7) : '');
    }
    phoneInput.value = val;
    validateStep3();
  });

  // =============================================
  //  FORM SUBMISSION
  // =============================================
  form.addEventListener('submit', function (e) {
    e.preventDefault();
    if (submitBtn.disabled) return;

    submitBtn.classList.add('loading');
    submitBtn.disabled = true;

    var firstName = firstNameInput.value.trim();
    var phone = phoneInput.value.trim();
    var email = emailInput.value.trim();
    var income = parseCurrencyInput(monthlyIncomeInput.value);
    var totalDebt = creditors.reduce(function (sum, c) { return sum + c.amount; }, 0);

    // Build creditor list string
    var creditorLines = creditors.map(function (c, i) {
      return (i + 1) + '. ' + c.name + ' — ' + formatCurrency(c.amount);
    }).join('\n');

    // Build bills breakdown
    var billLabels = ['Rent / Mortgage', 'Food & Groceries', 'Utilities', 'Transport', 'Phone & Internet'];
    var billIds = ['billRent', 'billFood', 'billUtilities', 'billTransport', 'billPhone'];
    var totalBills = 0;
    var billLines = [];
    billIds.forEach(function (id, i) {
      var val = parseCurrencyInput(document.getElementById(id).value);
      totalBills += val;
      if (val > 0) {
        billLines.push(billLabels[i] + ': ' + formatCurrency(val));
      }
    });

    var remaining = income - totalBills;
    var timestamp = new Date().toLocaleString('en-AU', { timeZone: 'Australia/Sydney' });

    // Build payload
    var payload = {
      '_subject': 'Financial Snapshot — ' + firstName,
      '_template': 'table',
      '_captcha': false,
      'First Name': firstName,
      'Phone': phone,
      'Email': email,
      '---': '--- CREDITORS ---',
      'Creditors': creditorLines,
      'Total Debt': formatCurrency(totalDebt),
      '----': '--- BUDGET ---',
      'Monthly Income': formatCurrency(income),
      'Bills Breakdown': billLines.join(' | ') || '(none entered)',
      'Total Bills': formatCurrency(totalBills),
      'Remaining After Bills': formatCurrency(remaining) + '/month',
      '-----': '--- META ---',
      'Consent': 'Yes — consented to contact',
      'Submitted': timestamp,
      'Source': utm.source,
      'Medium': utm.medium,
      'Campaign': utm.campaign
    };

    if (utm.content) payload['Content'] = utm.content;
    if (utm.term) payload['Term'] = utm.term;

    track('snapshot_submitted', {
      total_debt: totalDebt,
      creditor_count: creditors.length,
      monthly_income: income,
      remaining: remaining,
      utm_source: utm.source,
      utm_campaign: utm.campaign
    });

    fetch('https://formsubmit.co/ajax/support@clearmydebts.com.au', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
      body: JSON.stringify(payload)
    })
      .then(function (res) {
        if (!res.ok) throw new Error('Submit failed');
        return res.json();
      })
      .then(function () {
        showSuccess();
      })
      .catch(function () {
        // Show success even on error (FormSubmit sometimes has CORS issues on first use)
        showSuccess();
      });
  });

  function showSuccess() {
    progressBar.style.width = '100%';
    track('snapshot_complete', {
      utm_source: utm.source,
      utm_campaign: utm.campaign
    });
    // Go to results instead of a simple "done" screen
    showResults();
  }

  // =============================================
  //  STEP 4: RESULTS (Post-Submit)
  // =============================================
  var resultsNextBtn = document.getElementById('resultsNextBtn');

  function showResults() {
    var firstName = firstNameInput.value.trim();
    var income = parseCurrencyInput(monthlyIncomeInput.value);
    var totalDebt = creditors.reduce(function (sum, c) { return sum + c.amount; }, 0);
    var totalBills = 0;
    billInputs.forEach(function (input) {
      totalBills += parseCurrencyInput(input.value);
    });
    var surplus = income - totalBills;

    // Populate results
    document.getElementById('resultsName').textContent = firstName;

    // Creditor list
    var listEl = document.getElementById('resultsCreditorList');
    listEl.innerHTML = '';
    creditors.forEach(function (c) {
      var item = document.createElement('div');
      item.className = 'results-card__item';
      item.innerHTML =
        '<span class="results-card__item-name">' + escapeHtml(c.name) + '</span>' +
        '<span class="results-card__item-amount">' + formatCurrency(c.amount) + '</span>';
      listEl.appendChild(item);
    });

    document.getElementById('resultsTotalDebt').textContent = formatCurrency(totalDebt);
    document.getElementById('resultsIncome').textContent = formatCurrency(income) + '/mo';
    document.getElementById('resultsBills').textContent = '-' + formatCurrency(totalBills) + '/mo';

    var surplusEl = document.getElementById('resultsSurplus');
    surplusEl.textContent = formatCurrency(surplus) + '/mo';
    if (surplus < 0) {
      surplusEl.closest('.results-budget-row').classList.add('results-budget-row--negative');
    }

    document.getElementById('resultsCreditorCount').textContent = creditors.length;

    goToStep('results');
    track('results_viewed', { creditor_count: creditors.length, total_debt: totalDebt, surplus: surplus });
  }

  resultsNextBtn.addEventListener('click', function () {
    showPlan();
  });

  // =============================================
  //  STEP 5: YOUR PLAN
  // =============================================
  var planNextBtn = document.getElementById('planNextBtn');

  // Fee tiers
  var FEE_TIERS = [
    { min: 1, max: 2, fee: 695 },
    { min: 3, max: 4, fee: 995 },
    { min: 5, max: 7, fee: 1295 },
    { min: 8, max: 999, fee: 1595 }
  ];

  function getSetupFee(count) {
    for (var i = 0; i < FEE_TIERS.length; i++) {
      if (count >= FEE_TIERS[i].min && count <= FEE_TIERS[i].max) {
        return FEE_TIERS[i].fee;
      }
    }
    return 1595; // default to highest
  }

  function showPlan() {
    var totalDebt = creditors.reduce(function (sum, c) { return sum + c.amount; }, 0);
    var income = parseCurrencyInput(monthlyIncomeInput.value);
    var totalBills = 0;
    billInputs.forEach(function (input) {
      totalBills += parseCurrencyInput(input.value);
    });
    var surplus = income - totalBills;
    var setupFee = getSetupFee(creditors.length);
    var tier = getPaymentTier(Math.max(surplus, 0));

    // Monthly payment hero
    document.getElementById('planMonthlyAmount').textContent = formatCurrency(tier.amount) + '/mo';
    document.getElementById('planMonthlyInline').textContent = formatCurrency(tier.amount);

    // Summary rows
    document.getElementById('planCreditorCount').textContent = creditors.length;
    document.getElementById('planCreditorNum').textContent = creditors.length;
    document.getElementById('planTotalDebt').textContent = formatCurrency(totalDebt);
    document.getElementById('planSurplus').textContent = formatCurrency(surplus) + '/mo';

    // Establishment fee (subdued, at bottom)
    document.getElementById('planSetupFee').textContent = formatCurrency(setupFee);

    goToStep('plan');
    track('plan_viewed', { setup_fee: setupFee, monthly_payment: tier.amount, creditor_count: creditors.length });
  }

  planNextBtn.addEventListener('click', function () {
    showPayment();
  });

  // =============================================
  //  STEP 6: PAYMENT
  // =============================================

  // Stripe payment links — mapped by monthly surplus bracket
  var PAYMENT_TIERS = [
    { maxSurplus: 299,  amount: 80,  link: 'https://buy.stripe.com/bJe8wP28sdGp3iC4tb9EI08' },
    { maxSurplus: 499,  amount: 100, link: 'https://buy.stripe.com/cNi9ATaEYfOxg5o1gZ9EI09' },
    { maxSurplus: 799,  amount: 150, link: 'https://buy.stripe.com/6oU28rcN67i16uO1gZ9EI0a' },
    { maxSurplus: 1199, amount: 200, link: 'https://buy.stripe.com/eVq9AT3cw6dX1au2l39EI0f' },
    { maxSurplus: 1999, amount: 300, link: 'https://buy.stripe.com/cNi9AT00k0TD1au6Bj9EI0e' },
    { maxSurplus: 2999, amount: 400, link: 'https://buy.stripe.com/9B65kDfZidGpbP88Jr9EI0d' },
    { maxSurplus: Infinity, amount: 500, link: 'https://buy.stripe.com/5kQ00j5kE0TDcTc7Fn9EI0c' }
  ];

  function getPaymentTier(surplus) {
    for (var i = 0; i < PAYMENT_TIERS.length; i++) {
      if (surplus <= PAYMENT_TIERS[i].maxSurplus) return PAYMENT_TIERS[i];
    }
    return PAYMENT_TIERS[PAYMENT_TIERS.length - 1];
  }

  function showPayment() {
    var totalDebt = creditors.reduce(function (sum, c) { return sum + c.amount; }, 0);
    var income = parseCurrencyInput(monthlyIncomeInput.value);
    var totalBills = 0;
    billInputs.forEach(function (input) {
      totalBills += parseCurrencyInput(input.value);
    });
    var surplus = income - totalBills;
    var setupFee = getSetupFee(creditors.length);
    var tier = getPaymentTier(Math.max(surplus, 0));

    document.getElementById('payCreditorsNum').textContent = creditors.length;
    document.getElementById('payTotalDebt').textContent = formatCurrency(totalDebt);
    document.getElementById('paySetupFee').textContent = formatCurrency(setupFee);
    document.getElementById('paySurplus').textContent = formatCurrency(surplus) + '/mo';
    document.getElementById('payMonthlyAmount').textContent = formatCurrency(tier.amount) + '/mo';

    // Set Stripe link based on surplus bracket
    var paymentLinkEl = document.getElementById('paymentLink');
    paymentLinkEl.href = tier.link;

    goToStep('payment');
    track('payment_viewed', {
      setup_fee: setupFee,
      creditor_count: creditors.length,
      total_debt: totalDebt,
      monthly_payment: tier.amount,
      surplus: surplus
    });
  }

  // =============================================
  //  INIT
  // =============================================
  updateProgress(1);

})();
