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
    // Major banks
    'CommBank', 'ANZ', 'Westpac', 'NAB', 'Macquarie Bank', 'Suncorp',
    'Bank of Queensland', 'Bendigo Bank', 'ING', 'HSBC', 'Citibank',
    'St George', 'Bank of Melbourne', 'BankSA', 'ME Bank',
    // BNPL & fintech
    'Afterpay', 'Zip', 'Humm', 'Latitude Financial', 'Klarna', 'LatitudePay',
    // Personal loans & payday
    'Cash Converters', 'Nimble', 'Wallet Wizard', 'Money3', 'Harmoney',
    'SocietyOne', 'MoneyMe', 'Plenti', 'Wisr', 'Fair Go Finance',
    'Cash Train', 'Ferratum', 'Sunshine Loans', 'Credit24',
    // Utilities & telco
    'AGL', 'Origin Energy', 'EnergyAustralia', 'Alinta Energy',
    'Telstra', 'Optus', 'Vodafone', 'TPG', 'Foxtel',
    // Debt collection agencies
    'Credit Corp', 'Baycorp', 'Collection House', 'Pioneer Credit',
    'Recoveries Corporation', 'InDebted', 'National Credit Management',
    'Panthera Finance', 'State Mercantile', 'Shield Mercantile',
    'ARL Collect', 'Prushka Fast Debt Recovery', 'eCollect',
    'Bluechip Collections', 'Debt Recoveries Australia',
    'Lion Finance', 'Probe Group', 'Slater Byrne Recoveries',
    'National Mercantile', 'ADR Recoveries', 'Insight Mercantile',
    'Complete Credit Solutions', 'Commercial Credit Control',
    'Marshall Freeman', 'Professional Collection Services',
    'Swift Recovery', 'DCS Group', 'EC Credit Control',
    'Phillips & Cohen', 'Atradius Collections',
    'Elite Collection Services', 'Midstate CreditCollect',
    'Fox Symes', 'Way Forward Debt Solutions', 'ARMA', 'Collections Corp',
    // Government & other
    'ATO', 'Centrelink', 'HECS-HELP', 'Council Rates',
    'Strata', 'Real estate agent', 'Private lender'
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

  // =============================================
  //  GOOGLE SHEETS BACKUP
  //  Sends form data to a Google Sheet as a redundant backup
  //  in case FormSubmit.co fails silently
  // =============================================
  var SHEETS_WEBHOOK = 'https://script.google.com/macros/s/PLACEHOLDER_DEPLOY_ID/exec';

  function backupToSheets(data) {
    try {
      fetch(SHEETS_WEBHOOK, {
        method: 'POST',
        mode: 'no-cors',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });
    } catch (e) { /* silent — this is a backup */ }
  }

  // =============================================
  //  PAYMENT RETURN HANDLER
  //  Detects when user returns from Stripe and restores their session
  // =============================================
  var urlParams = new URLSearchParams(window.location.search);
  var paymentStatus = urlParams.get('payment');

  if (paymentStatus === 'success') {
    // User paid on Stripe and came back — restore their data and go to agreement
    try {
      var restored = JSON.parse(window.name);
      if (restored && restored.creditors && restored.creditors.length > 0) {
        creditors = restored.creditors;
        firstNameInput.value = restored.firstName || '';
        phoneInput.value = restored.phone || '';
        emailInput.value = restored.email || '';
        monthlyIncomeInput.value = restored.income || '';
        if (restored.bills) {
          Object.keys(restored.bills).forEach(function(id) {
            var el = document.getElementById(id);
            if (el) el.value = restored.bills[id];
          });
        }
        // Jump straight to the service agreement
        setTimeout(function() {
          showAgreement();
          track('payment_success_return', { creditor_count: creditors.length });
        }, 300);
      }
    } catch (e) {
      // Could not restore — show a friendly redirect message
      alert('Payment received — thank you! You\'re being redirected to sign your agreement now.');
    }
    // Clean up the URL
    if (window.history && window.history.replaceState) {
      window.history.replaceState({}, '', window.location.pathname);
    }
  } else if (paymentStatus === 'cancelled') {
    // Payment was cancelled — restore data and show payment step again with a message
    try {
      var restored = JSON.parse(window.name);
      if (restored && restored.creditors) {
        creditors = restored.creditors;
        firstNameInput.value = restored.firstName || '';
        phoneInput.value = restored.phone || '';
        emailInput.value = restored.email || '';
        monthlyIncomeInput.value = restored.income || '';
        if (restored.bills) {
          Object.keys(restored.bills).forEach(function(id) {
            var el = document.getElementById(id);
            if (el) el.value = restored.bills[id];
          });
        }
        setTimeout(function() {
          showPayment();
          track('payment_cancelled_return', {});
        }, 300);
      }
    } catch (e) { /* ignore */ }
    if (window.history && window.history.replaceState) {
      window.history.replaceState({}, '', window.location.pathname);
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

  // Progress hints for non-numeric early-funnel steps so the bar moves
  // visibly through the qualifier without claiming the user is "done".
  var STEP_PROGRESS_HINT = {
    'signals': 0.3,
    'payday':  0.6,
    'channel': 0.9
  };

  function goToStep(n) {
    steps.forEach(function (s) { s.classList.remove('active'); });
    var target = document.querySelector('[data-step="' + n + '"]');
    if (target) {
      target.classList.add('active');

      if (typeof n === 'number') {
        updateProgress(n);
        track('snapshot_step', { step_number: n });
      } else if (STEP_PROGRESS_HINT[n] != null) {
        // Map qualifier steps to a fraction of step 1 so the bar inches forward
        var pct = Math.round(STEP_PROGRESS_HINT[n] * (1 / totalSteps) * 100);
        progressBar.style.width = pct + '%';
        progressBar.parentElement.setAttribute('aria-valuenow', pct);
        track('snapshot_qualifier_step', { qualifier_step: n });
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
  //  INTRO / QUESTION-FIRST (DEBT RANGE GRID)
  // =============================================
  // Lead context bag — captured across the qualifier flow.
  // All fields here are additive/optional; existing downstream
  // submission still works if any of them are missing.
  var leadContext = {
    lead_type: 'mypaynow_app_driven',
    debt_range: '',
    signals: [],
    payday_drain: '',
    pay_cycle: '',
    channel_pref: '',
    creditors_unknown: false
  };
  // Expose for debugging / late readers
  window.__leadContext = leadContext;

  // Only target debt-range buttons in the INTRO step (not the payday step,
  // which reuses the same .debt-grid__btn class).
  var introStep = document.querySelector('[data-step="intro"]');
  var debtGridBtns = introStep
    ? introStep.querySelectorAll('.debt-grid__btn[data-range]')
    : [];
  debtGridBtns.forEach(function (btn) {
    btn.addEventListener('click', function () {
      var range = btn.getAttribute('data-range');

      // Visual feedback
      debtGridBtns.forEach(function (b) { b.classList.remove('selected'); });
      btn.classList.add('selected');

      // Track + persist
      leadContext.debt_range = range;
      window.__selectedDebtRange = range;
      track('debt_range_selected', { debt_range: range });
      track('intro_start_clicked', {});

      // Brief pause for tactile feel, then advance to qualifier
      setTimeout(function () {
        goToStep('signals');
      }, 250);
    });
  });

  // Keep legacy button handler as fallback
  var introStartBtn = document.getElementById('introStartBtn');
  if (introStartBtn) {
    introStartBtn.addEventListener('click', function () {
      track('intro_start_clicked', {});
      goToStep('signals');
    });
  }

  // =============================================
  //  STEP 0a: SIGNALS (multi-select chips)
  // =============================================
  var signalChipsEl = document.getElementById('signalChips');
  if (signalChipsEl) {
    signalChipsEl.querySelectorAll('.chip').forEach(function (chip) {
      chip.addEventListener('click', function () {
        var sig = chip.getAttribute('data-signal');
        var idx = leadContext.signals.indexOf(sig);
        if (idx === -1) {
          leadContext.signals.push(sig);
          chip.classList.add('selected');
        } else {
          leadContext.signals.splice(idx, 1);
          chip.classList.remove('selected');
        }
        track('signal_toggled', { signal: sig, selected: idx === -1 });
      });
    });
  }
  var signalsNextBtn = document.getElementById('signalsNext');
  if (signalsNextBtn) {
    signalsNextBtn.addEventListener('click', function () {
      track('signals_continue', { signal_count: leadContext.signals.length });
      goToStep('payday');
    });
  }
  var signalsSkipBtn = document.getElementById('signalsSkip');
  if (signalsSkipBtn) {
    signalsSkipBtn.addEventListener('click', function () {
      // User would rather just talk to someone — set channel pref + jump
      // straight to contact step so we can capture phone/name fast.
      leadContext.channel_pref = 'call';
      track('signals_skip_to_contact', {});
      goToStep('channel');
    });
  }

  // =============================================
  //  STEP 0b: PAYDAY DRAIN
  // =============================================
  var paydayStep = document.querySelector('[data-step="payday"]');
  var paydayBtns = paydayStep
    ? paydayStep.querySelectorAll('.debt-grid__btn[data-payday]')
    : [];
  paydayBtns.forEach(function (btn) {
    btn.addEventListener('click', function () {
      var v = btn.getAttribute('data-payday');
      paydayBtns.forEach(function (b) { b.classList.remove('selected'); });
      btn.classList.add('selected');
      leadContext.payday_drain = v;
      track('payday_drain_selected', { payday_drain: v });
      setTimeout(function () { goToStep('channel'); }, 220);
    });
  });
  var payCycleEl = document.getElementById('payCycle');
  if (payCycleEl) {
    payCycleEl.addEventListener('change', function () {
      leadContext.pay_cycle = payCycleEl.value || '';
      track('pay_cycle_selected', { pay_cycle: leadContext.pay_cycle });
    });
  }
  var paydaySkipBtn = document.getElementById('paydaySkip');
  if (paydaySkipBtn) {
    paydaySkipBtn.addEventListener('click', function () {
      track('payday_skipped', {});
      goToStep('channel');
    });
  }

  // =============================================
  //  STEP 0c: CHANNEL PREFERENCE
  // =============================================
  var channelChipsEl = document.getElementById('channelChips');
  if (channelChipsEl) {
    channelChipsEl.querySelectorAll('.chip').forEach(function (chip) {
      chip.addEventListener('click', function () {
        var v = chip.getAttribute('data-channel');
        channelChipsEl.querySelectorAll('.chip').forEach(function (c) {
          c.classList.remove('selected');
        });
        chip.classList.add('selected');
        leadContext.channel_pref = v;
        track('channel_pref_selected', { channel_pref: v });
        setTimeout(function () { goToStep(1); }, 220);
      });
    });
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
    } else if (leadContext.creditors_unknown) {
      // User opted "I'm not sure" — keep continue visible, hide running total
      debtTotal.style.display = 'none';
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
    if (creditors.length > 0 || leadContext.creditors_unknown) {
      goToStep(2);
    }
  });

  // "I'm not sure who I owe" escape — keeps user in funnel without forcing
  // them to know creditor names. Marks lead as needing manual creditor
  // discovery, then jumps to income step so we can still qualify them.
  var creditorUnsureBtn = document.getElementById('creditorUnsureBtn');
  if (creditorUnsureBtn) {
    creditorUnsureBtn.addEventListener('click', function () {
      leadContext.creditors_unknown = true;
      // Show the next button so they can move forward, even with no creditors
      step1Next.style.display = '';
      track('creditors_unsure_clicked', {});
      // Auto-advance after a short tactile pause
      setTimeout(function () { goToStep(2); }, 200);
    });
  }

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

    // Honeypot bot detection — if this hidden field has a value, it's a bot
    var hpField = document.getElementById('hp_field');
    if (hpField && hpField.value) { submitBtn.classList.remove('loading'); return; }

    submitBtn.classList.add('loading');
    submitBtn.disabled = true;

    var fullName = firstNameInput.value.trim();
    var nameParts = fullName.split(' ');
    var firstName = nameParts[0];
    var lastName = nameParts.length > 1 ? nameParts.slice(1).join(' ') : '';
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
      '_subject': 'Financial Snapshot — ' + fullName,
      '_template': 'table',
      '_captcha': false,
      'Full Name': fullName,
      'Phone': phone,
      'Email': email,
      '---': '--- CREDITORS ---',
      'Creditors': creditorLines || (leadContext.creditors_unknown ? '(client unsure — needs help mapping)' : '(none entered)'),
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

    // Lead-context fields (additive — only included when set, so existing
    // downstream pipelines that don't know about these keys are unaffected).
    if (leadContext.lead_type)        payload['Lead Type'] = leadContext.lead_type;
    if (leadContext.debt_range)       payload['Debt Range Selected'] = leadContext.debt_range;
    if (leadContext.signals.length)   payload['Pressure Signals'] = leadContext.signals.join(', ');
    if (leadContext.payday_drain)     payload['Payday Drain'] = leadContext.payday_drain;
    if (leadContext.pay_cycle)        payload['Pay Cycle'] = leadContext.pay_cycle;
    if (leadContext.channel_pref)     payload['Contact Preference'] = leadContext.channel_pref;
    if (leadContext.creditors_unknown) payload['Creditors Unknown'] = 'Yes — needs help mapping debts';

    track('snapshot_submitted', {
      total_debt: totalDebt,
      creditor_count: creditors.length,
      monthly_income: income,
      remaining: remaining,
      utm_source: utm.source,
      utm_campaign: utm.campaign,
      lead_type: leadContext.lead_type,
      debt_range: leadContext.debt_range,
      signal_count: leadContext.signals.length,
      payday_drain: leadContext.payday_drain,
      pay_cycle: leadContext.pay_cycle,
      channel_pref: leadContext.channel_pref,
      creditors_unknown: leadContext.creditors_unknown
    });

    // Send to Web3Forms (primary)
    var w3payload = Object.assign({}, payload, {
      access_key: 'f8acfff0-024e-49b5-bd6c-9c66ac7ed627',
      from_name: 'Clear My Debts App',
      subject: payload['_subject'] || 'Financial Snapshot'
    });
    delete w3payload['_subject'];
    delete w3payload['_template'];
    delete w3payload['_captcha'];
    delete w3payload['_autoresponse'];

    fetch('https://api.web3forms.com/submit', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
      body: JSON.stringify(w3payload)
    })
      .then(function (res) {
        if (!res.ok) throw new Error('Submit failed');
        return res.json();
      })
      .then(function () {
        showSuccess();
      })
      .catch(function () {
        showSuccess();
      });

    // Backup to Google Sheets (redundant — fires independently)
    backupToSheets({
      type: 'snapshot',
      timestamp: timestamp,
      fullName: fullName,
      firstName: firstName,
      lastName: lastName,
      phone: phone,
      email: email,
      creditors: creditorLines,
      totalDebt: totalDebt,
      income: income,
      totalBills: totalBills,
      remaining: remaining,
      source: utm.source,
      campaign: utm.campaign,
      // Optional lead-context fields — Sheets columns can ignore unknown keys.
      lead_type: leadContext.lead_type,
      debt_range: leadContext.debt_range,
      signals: leadContext.signals.join(','),
      payday_drain: leadContext.payday_drain,
      pay_cycle: leadContext.pay_cycle,
      channel_pref: leadContext.channel_pref,
      creditors_unknown: leadContext.creditors_unknown
    });

    // Create contact + deal in HubSpot via CMD Companion API
    try {
      fetch('https://cmd-api-gateway.vercel.app/api/create-contact', {
        method: 'POST',
        mode: 'cors',
        headers: { 'Content-Type': 'application/json', 'X-API-Key': '89fa2b1d87e124c78403040bf8865243' },
        body: JSON.stringify({
          firstname: firstName,
          lastname: lastName,
          email: email,
          phone: phone,
          consent_given: document.getElementById('consentCheck').checked,
          sms_consent: document.getElementById('consentCheck').checked
        })
      })
        .then(function (res) { return res.json(); })
        .then(function (contactResult) {
          if (contactResult.success && contactResult.contact) {
            // Build qualifier note — appended to creditor_details so it's
            // visible in HubSpot even if the deal pipeline doesn't have
            // dedicated fields for these signals yet.
            var qualifierLines = [];
            if (leadContext.lead_type)        qualifierLines.push('Lead type: ' + leadContext.lead_type);
            if (leadContext.debt_range)       qualifierLines.push('Debt range: ' + leadContext.debt_range);
            if (leadContext.signals.length)   qualifierLines.push('Pressure signals: ' + leadContext.signals.join(', '));
            if (leadContext.payday_drain)     qualifierLines.push('Payday drain: ' + leadContext.payday_drain);
            if (leadContext.pay_cycle)        qualifierLines.push('Pay cycle: ' + leadContext.pay_cycle);
            if (leadContext.channel_pref)     qualifierLines.push('Contact preference: ' + leadContext.channel_pref);
            if (leadContext.creditors_unknown) qualifierLines.push('Creditors unknown — needs help mapping debts');

            var enrichedCreditorDetails = creditorLines || '(no creditors entered)';
            if (qualifierLines.length) {
              enrichedCreditorDetails += '\n\n--- Lead context ---\n' + qualifierLines.join('\n');
            }

            // Create deal linked to the contact
            fetch('https://cmd-api-gateway.vercel.app/api/create-deal', {
              method: 'POST',
              mode: 'cors',
              headers: { 'Content-Type': 'application/json', 'X-API-Key': '89fa2b1d87e124c78403040bf8865243' },
              body: JSON.stringify({
                dealname: fullName + ' — $' + totalDebt.toLocaleString('en-AU') + ' Debt Plan',
                total_debt: String(totalDebt),
                creditor_details: enrichedCreditorDetails,
                number_of_creditors: String(creditors.length),
                lead_source: utm.source || 'website',
                contactId: contactResult.contact.id,
                // Optional fields the gateway may map through — safe to ignore if unknown
                lead_type: leadContext.lead_type,
                debt_range: leadContext.debt_range,
                pressure_signals: leadContext.signals.join(','),
                payday_drain: leadContext.payday_drain,
                pay_cycle: leadContext.pay_cycle,
                channel_pref: leadContext.channel_pref
              })
            }).catch(function () { /* silent */ });
          }
        })
        .catch(function () { /* silent — HubSpot creation is best-effort */ });
    } catch (e) { /* silent */ }
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
    var fullName = firstNameInput.value.trim();
    var firstName = fullName.split(' ')[0];
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

    // Daily cost
    var dailyEl = document.getElementById('planDailyCost');
    if (dailyEl) {
      var daily = (tier.amount / 30).toFixed(2);
      dailyEl.textContent = 'That’s just $' + daily + ' per day';
    }

    // Context: estimated current repayments vs plan
    // Only show this comparison if the estimate is meaningfully higher than the plan
    // (i.e. the plan saves them money — avoids backfiring for small debt amounts)
    var estimatedCurrentMin = Math.round(totalDebt * 0.025 / 5) * 5; // 2.5% of balance, rounded to $5
    var planContextEl = document.getElementById('planContext');
    var contextNoteEl = document.getElementById('planContextNote');
    var planContextAmountEl = document.getElementById('planContextAmount');
    var planCurrentRepaymentsEl = document.getElementById('planCurrentRepayments');

    if (estimatedCurrentMin > tier.amount + 20) {
      // Comparison is favourable — show it
      if (planContextEl) planContextEl.style.display = '';
      if (planCurrentRepaymentsEl) planCurrentRepaymentsEl.textContent = '~' + formatCurrency(estimatedCurrentMin) + '/mo';
      if (planContextAmountEl) planContextAmountEl.textContent = formatCurrency(tier.amount) + '/mo';
      if (contextNoteEl) {
        var saving = estimatedCurrentMin - tier.amount;
        contextNoteEl.textContent = 'Approximately ' + formatCurrency(saving) + '/mo more in your pocket — and your debt actually reduces.';
      }
    } else {
      // Comparison would backfire — hide it entirely
      if (planContextEl) planContextEl.style.display = 'none';
    }

    // Debt-free timeline estimate
    // Assume ~80% of plan payment goes to creditors after fees
    var timelineEl = document.getElementById('planTimeline');
    if (timelineEl && totalDebt > 0 && tier.amount > 0) {
      var monthsToFree = Math.ceil(totalDebt / (tier.amount * 0.8));
      var years = Math.floor(monthsToFree / 12);
      var months = monthsToFree % 12;
      var timelineStr = '';
      if (years > 0) timelineStr += years + (years === 1 ? ' year' : ' years');
      if (years > 0 && months > 0) timelineStr += ' and ';
      if (months > 0) timelineStr += months + (months === 1 ? ' month' : ' months');
      timelineEl.textContent = timelineStr || 'under a year';
    }

    // CTA button amount
    var ctaAmountEl = document.getElementById('planCtaAmount');
    if (ctaAmountEl) ctaAmountEl.textContent = formatCurrency(tier.amount);

    // Summary rows
    document.getElementById('planCreditorCount').textContent = creditors.length;
    document.getElementById('planCreditorNum').textContent = creditors.length;
    document.getElementById('planTotalDebt').textContent = formatCurrency(totalDebt);
    var planSurplusEl = document.getElementById('planSurplus');
    if (planSurplusEl) planSurplusEl.textContent = formatCurrency(surplus) + '/mo';

    // Setup fee still tracked internally for agreement/Stripe but not shown on plan page

    // Populate summary payment amount
    var summaryPaymentEl = document.getElementById('planSummaryPayment');
    if (summaryPaymentEl) {
      summaryPaymentEl.textContent = formatCurrency(tier.amount) + '/mo';
    }

    goToStep('plan');
    track('plan_viewed', { setup_fee: setupFee, monthly_payment: tier.amount, creditor_count: creditors.length });
  }

  planNextBtn.addEventListener('click', function () {
    showPayment();
  });

  var planNextBtnTop = document.getElementById('planNextBtnTop');
  if (planNextBtnTop) {
    planNextBtnTop.addEventListener('click', function () {
      showPayment();
    });
  }

  // =============================================
  //  STEP 6: PAYMENT
  // =============================================

  // Stripe payment links — mapped by monthly surplus bracket
  // Each link should have ?success_url and ?cancel_url appended in showPayment()
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
    // Append success and cancel redirect URLs so user returns to the form after payment
    var paymentLinkEl = document.getElementById('paymentLink');
    var baseUrl = window.location.origin + window.location.pathname;
    var successUrl = baseUrl + '?payment=success';
    var cancelUrl = baseUrl + '?payment=cancelled';
    paymentLinkEl.href = tier.link;

    // Store form data in window.name so we can recover it after Stripe redirect
    try {
      var formBackup = {
        creditors: creditors,
        fullName: firstNameInput.value.trim(),
        firstName: firstNameInput.value.trim().split(' ')[0],
        lastName: firstNameInput.value.trim().split(' ').length > 1 ? firstNameInput.value.trim().split(' ').slice(1).join(' ') : '',
        phone: phoneInput.value.trim(),
        email: emailInput.value.trim(),
        income: monthlyIncomeInput.value,
        bills: {},
        consent: document.getElementById('consentCheck').checked
      };
      ['billRent', 'billFood', 'billUtilities', 'billTransport', 'billPhone'].forEach(function(id) {
        formBackup.bills[id] = document.getElementById(id).value;
      });
      window.name = JSON.stringify(formBackup);
    } catch (e) { /* ignore */ }

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
  //  STEP 7: SERVICE AGREEMENT
  // =============================================
  var agreeBtn = document.getElementById('agreeBtn');
  var agreementScroll = document.getElementById('agreementScroll');
  var scrollHint = document.getElementById('scrollHint');

  // Enable agree button when scrolled to bottom
  if (agreementScroll) {
    agreementScroll.addEventListener('scroll', function () {
      var el = agreementScroll;
      var atBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 30;
      if (atBottom) {
        agreeBtn.disabled = false;
        if (scrollHint) scrollHint.classList.add('hidden');
      }
    });
  }

  function showAgreement() {
    var setupFee = getSetupFee(creditors.length);
    var fullName = firstNameInput.value.trim();
    var firstName = fullName.split(' ')[0];
    var today = new Date().toLocaleDateString('en-AU', { timeZone: 'Australia/Sydney', day: 'numeric', month: 'long', year: 'numeric' });

    document.getElementById('agreeClientName').textContent = fullName;
    document.getElementById('agreeDate').textContent = today;
    document.getElementById('agreeSetupFee').textContent = formatCurrency(setupFee);

    // Reset scroll and button
    agreeBtn.disabled = true;
    if (agreementScroll) agreementScroll.scrollTop = 0;
    if (scrollHint) scrollHint.classList.remove('hidden');

    goToStep('agreement');
    track('agreement_viewed', { setup_fee: setupFee });
  }

  agreeBtn.addEventListener('click', function () {
    track('agreement_signed', {});
    showATA();
  });

  // =============================================
  //  STEP 8: AUTHORITY TO ACT + SIGNATURE
  // =============================================
  var ataSubmitBtn = document.getElementById('ataSubmitBtn');
  var ataFullName = document.getElementById('ataFullName');
  var ataDob = document.getElementById('ataDob');
  var ataAddress = document.getElementById('ataAddress');
  var ataLicence = document.getElementById('ataLicence');
  var sigCanvas = document.getElementById('sigCanvas');
  var sigClearBtn = document.getElementById('sigClear');
  var sigCtx = sigCanvas ? sigCanvas.getContext('2d') : null;
  var hasSig = false;
  var isDrawing = false;

  // Signature pad setup
  function initSigCanvas() {
    if (!sigCanvas || !sigCtx) return;
    var rect = sigCanvas.getBoundingClientRect();
    var dpr = window.devicePixelRatio || 1;
    sigCanvas.width = rect.width * dpr;
    sigCanvas.height = rect.height * dpr;
    sigCtx.scale(dpr, dpr);
    sigCtx.strokeStyle = '#14b8a6';
    sigCtx.lineWidth = 2.5;
    sigCtx.lineCap = 'round';
    sigCtx.lineJoin = 'round';
  }

  function getPos(e) {
    var rect = sigCanvas.getBoundingClientRect();
    var touch = e.touches ? e.touches[0] : e;
    return { x: touch.clientX - rect.left, y: touch.clientY - rect.top };
  }

  if (sigCanvas) {
    sigCanvas.addEventListener('mousedown', function (e) {
      isDrawing = true;
      var pos = getPos(e);
      sigCtx.beginPath();
      sigCtx.moveTo(pos.x, pos.y);
    });
    sigCanvas.addEventListener('mousemove', function (e) {
      if (!isDrawing) return;
      var pos = getPos(e);
      sigCtx.lineTo(pos.x, pos.y);
      sigCtx.stroke();
      hasSig = true;
      sigCanvas.parentElement.classList.add('has-sig');
      validateATA();
    });
    sigCanvas.addEventListener('mouseup', function () { isDrawing = false; });
    sigCanvas.addEventListener('mouseleave', function () { isDrawing = false; });

    // Touch events
    sigCanvas.addEventListener('touchstart', function (e) {
      e.preventDefault();
      isDrawing = true;
      var pos = getPos(e);
      sigCtx.beginPath();
      sigCtx.moveTo(pos.x, pos.y);
    }, { passive: false });
    sigCanvas.addEventListener('touchmove', function (e) {
      e.preventDefault();
      if (!isDrawing) return;
      var pos = getPos(e);
      sigCtx.lineTo(pos.x, pos.y);
      sigCtx.stroke();
      hasSig = true;
      sigCanvas.parentElement.classList.add('has-sig');
      validateATA();
    }, { passive: false });
    sigCanvas.addEventListener('touchend', function () { isDrawing = false; });
  }

  if (sigClearBtn) {
    sigClearBtn.addEventListener('click', function () {
      sigCtx.clearRect(0, 0, sigCanvas.width, sigCanvas.height);
      hasSig = false;
      sigCanvas.parentElement.classList.remove('has-sig');
      validateATA();
    });
  }

  function validateATA() {
    var nameOk = ataFullName && ataFullName.value.trim().length >= 3;
    var dobOk = ataDob && ataDob.value.length > 0;
    var addrOk = ataAddress && ataAddress.value.trim().length >= 5;
    var licOk = ataLicence && ataLicence.value.trim().length >= 3;
    ataSubmitBtn.disabled = !(nameOk && dobOk && addrOk && licOk && hasSig);
  }

  if (ataFullName) ataFullName.addEventListener('input', validateATA);
  if (ataDob) ataDob.addEventListener('input', validateATA);
  if (ataAddress) ataAddress.addEventListener('input', validateATA);
  if (ataLicence) ataLicence.addEventListener('input', validateATA);

  var ataScrollEl = document.getElementById('ataScroll');
  var ataScrollHint = document.getElementById('ataScrollHint');
  if (ataScrollEl) {
    ataScrollEl.addEventListener('scroll', function () {
      var atBottom = ataScrollEl.scrollHeight - ataScrollEl.scrollTop - ataScrollEl.clientHeight < 30;
      if (atBottom && ataScrollHint) ataScrollHint.classList.add('hidden');
    });
  }

  function showATA() {
    // Pre-fill name from step 3
    if (ataFullName) ataFullName.value = firstNameInput.value.trim();
    if (ataScrollEl) ataScrollEl.scrollTop = 0;
    if (ataScrollHint) ataScrollHint.classList.remove('hidden');
    ataSubmitBtn.disabled = true;

    goToStep('ata');

    // Init canvas after step is visible
    setTimeout(initSigCanvas, 100);
    track('ata_viewed', {});
  }

  // ATA Submit
  if (ataSubmitBtn) {
    ataSubmitBtn.addEventListener('click', function () {
      if (ataSubmitBtn.disabled) return;
      ataSubmitBtn.classList.add('loading');
      ataSubmitBtn.disabled = true;

      var sigData = sigCanvas.toDataURL('image/png');
      var setupFee = getSetupFee(creditors.length);
      var tier = getPaymentTier(Math.max(
        parseCurrencyInput(monthlyIncomeInput.value) -
        (function () { var t = 0; billInputs.forEach(function (i) { t += parseCurrencyInput(i.value); }); return t; })(),
        0
      ));
      var totalDebt = creditors.reduce(function (sum, c) { return sum + c.amount; }, 0);
      var creditorLines = creditors.map(function (c, i) {
        return (i + 1) + '. ' + c.name + ' — ' + formatCurrency(c.amount);
      }).join('\n');
      var timestamp = new Date().toLocaleString('en-AU', { timeZone: 'Australia/Sydney' });

      var payload = {
        '_subject': 'SIGNED — ' + ataFullName.value.trim() + ' — ATA + Service Agreement',
        '_template': 'table',
        '_captcha': false,
        '_autoresponse': 'Thank you for signing with Clear My Debts. We\'ve received your agreements and your plan is now active. Call us anytime on 1300 998 168.',
        '--- AGREEMENTS ---': '',
        'Service Agreement': 'SIGNED on ' + timestamp,
        'Authority to Act': 'SIGNED on ' + timestamp,
        '--- CLIENT DETAILS ---': '',
        'Full Legal Name': ataFullName.value.trim(),
        'Date of Birth': ataDob.value,
        'Address': ataAddress.value.trim(),
        'Driver Licence': ataLicence.value.trim(),
        'Phone': phoneInput.value.trim(),
        'Email': emailInput.value.trim(),
        '--- PLAN DETAILS ---': '',
        'Creditors': creditorLines,
        'Total Debt': formatCurrency(totalDebt),
        'Setup Fee': formatCurrency(setupFee) + ' (incl. GST)',
        'Ongoing Fee': '20% of each payment (excl. GST)',
        'Monthly Payment': formatCurrency(tier.amount) + '/mo',
        '--- META ---': '',
        'Signed At': timestamp,
        'Signature': 'Captured electronically (data URI attached)',
        'Source': utm.source,
        'Campaign': utm.campaign
      };

      // Generate ATA PDF
      generateAtaPdf({
        fullName: ataFullName.value.trim(),
        dob: ataDob.value,
        address: ataAddress.value.trim(),
        licence: ataLicence.value.trim(),
        signatureData: sigData,
        timestamp: timestamp
      });

      track('ata_signed', {
        creditor_count: creditors.length,
        total_debt: totalDebt,
        setup_fee: setupFee,
        monthly_payment: tier.amount
      });

      // Send to Web3Forms (primary)
      var w3payload2 = Object.assign({}, payload, {
        access_key: 'f8acfff0-024e-49b5-bd6c-9c66ac7ed627',
        from_name: 'Clear My Debts App',
        subject: payload['_subject'] || 'SIGNED — ATA + Service Agreement'
      });
      delete w3payload2['_subject'];
      delete w3payload2['_template'];
      delete w3payload2['_captcha'];
      delete w3payload2['_autoresponse'];

      fetch('https://api.web3forms.com/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
        body: JSON.stringify(w3payload2)
      })
        .then(function () { showAllDone(); })
        .catch(function () { showAllDone(); });

      // Backup to Google Sheets (redundant — fires independently)
      backupToSheets({
        type: 'signed_ata',
        timestamp: timestamp,
        fullName: ataFullName.value.trim(),
        dob: ataDob.value,
        address: ataAddress.value.trim(),
        licence: ataLicence.value.trim(),
        phone: phoneInput.value.trim(),
        email: emailInput.value.trim(),
        creditors: creditorLines,
        totalDebt: totalDebt,
        setupFee: setupFee,
        monthlyPayment: tier.amount,
        source: utm.source,
        campaign: utm.campaign
      });
    });
  }

  // =============================================
  //  ATA PDF GENERATION
  // =============================================
  var ataPdfBlob = null;
  var ataPdfFilename = '';

  function generateAtaPdf(clientData) {
    var jsPDF = window.jspdf.jsPDF;
    var doc = new jsPDF({ unit: 'mm', format: 'a4' });
    var w = doc.internal.pageSize.getWidth();
    var margin = 20;
    var contentW = w - margin * 2;
    var y = 20;

    // Header
    doc.setFontSize(10);
    doc.setTextColor(100, 100, 100);
    doc.text('Clear My Debts Australia Pty Ltd', margin, y);
    y += 5;
    doc.text('P: 1300 998 168 | E: support@clearmydebts.com.au', margin, y);
    y += 5;
    doc.text('Credit License Number: 568532', margin, y);
    y += 12;

    // Title
    doc.setFontSize(18);
    doc.setTextColor(30, 30, 30);
    doc.setFont(undefined, 'bold');
    doc.text('AUTHORITY TO ACT & PRIVACY CONSENT', margin, y);
    y += 4;
    doc.setDrawColor(20, 184, 166);
    doc.setLineWidth(0.8);
    doc.line(margin, y, w - margin, y);
    y += 12;

    // Section 1
    doc.setFontSize(12);
    doc.setFont(undefined, 'bold');
    doc.text('1. Authority to Act', margin, y);
    y += 7;
    doc.setFontSize(10);
    doc.setFont(undefined, 'normal');
    doc.setTextColor(60, 60, 60);
    var s1 = 'I authorise Clear My Debts Australia Pty Ltd to collect, use, and disclose my personal and financial information for the purpose of providing debt management and financial hardship assistance services as requested by me.';
    var s1Lines = doc.splitTextToSize(s1, contentW);
    doc.text(s1Lines, margin, y);
    y += s1Lines.length * 5 + 4;

    var s1b = 'I appoint Clear My Debts as my authorised representative to act on my behalf for the limited purposes of:';
    var s1bLines = doc.splitTextToSize(s1b, contentW);
    doc.text(s1bLines, margin, y);
    y += s1bLines.length * 5 + 3;

    var bullets = [
      'Contacting my creditors, debt collectors, or account managers to confirm balances, account details, and payment status',
      'Requesting financial hardship arrangements, including temporary payment pauses or reduced repayments',
      'Requesting that creditor communication be reduced or redirected to Clear My Debts',
      'Receiving and responding to correspondence relating to my debts',
      'Discussing and administering repayment arrangements with my creditors'
    ];
    bullets.forEach(function (b) {
      var bLines = doc.splitTextToSize('\u2022  ' + b, contentW - 5);
      doc.text(bLines, margin + 3, y);
      y += bLines.length * 5 + 2;
    });
    y += 2;

    var s1c = 'This authority does not permit Clear My Debts to apply for credit, provide lending services, or enter into any legal proceedings on my behalf.';
    var s1cLines = doc.splitTextToSize(s1c, contentW);
    doc.text(s1cLines, margin, y);
    y += s1cLines.length * 5 + 8;

    // Section 2
    doc.setFontSize(12);
    doc.setTextColor(30, 30, 30);
    doc.setFont(undefined, 'bold');
    doc.text('2. Consent to Obtain Credit Information', margin, y);
    y += 7;
    doc.setFontSize(10);
    doc.setFont(undefined, 'normal');
    doc.setTextColor(60, 60, 60);
    var s2 = 'I consent to Clear My Debts obtaining my credit history information from one or more credit reporting bodies (including Equifax, Experian, and Illion) for the limited purpose of identifying existing debts, confirming creditor details, and assisting with debt management and financial hardship support.';
    var s2Lines = doc.splitTextToSize(s2, contentW);
    doc.text(s2Lines, margin, y);
    y += s2Lines.length * 5 + 8;

    // Section 3
    doc.setFontSize(12);
    doc.setTextColor(30, 30, 30);
    doc.setFont(undefined, 'bold');
    doc.text('3. Privacy & Communication Consent', margin, y);
    y += 7;
    doc.setFontSize(10);
    doc.setFont(undefined, 'normal');
    doc.setTextColor(60, 60, 60);
    var s3 = 'I authorise Clear My Debts to obtain relevant personal and financial information from my creditors where reasonably necessary. I consent to receiving notices and documents electronically where permitted by law.';
    var s3Lines = doc.splitTextToSize(s3, contentW);
    doc.text(s3Lines, margin, y);
    y += s3Lines.length * 5 + 8;

    // Section 4
    doc.setFontSize(12);
    doc.setTextColor(30, 30, 30);
    doc.setFont(undefined, 'bold');
    doc.text('4. Duration of Authority', margin, y);
    y += 7;
    doc.setFontSize(10);
    doc.setFont(undefined, 'normal');
    doc.setTextColor(60, 60, 60);
    doc.text('This authority remains effective until revoked by me in writing.', margin, y);
    y += 14;

    // Client Details Box
    doc.setDrawColor(200, 200, 200);
    doc.setLineWidth(0.3);
    var boxY = y;
    doc.rect(margin, boxY, contentW, 60);

    doc.setFontSize(10);
    doc.setTextColor(30, 30, 30);
    doc.setFont(undefined, 'bold');
    y = boxY + 8;
    doc.text('FULL NAME:', margin + 5, y);
    doc.setFont(undefined, 'normal');
    doc.text(clientData.fullName, margin + 40, y);
    y += 10;

    doc.setFont(undefined, 'bold');
    doc.text('DATE OF BIRTH:', margin + 5, y);
    doc.setFont(undefined, 'normal');
    doc.text(clientData.dob, margin + 48, y);
    y += 10;

    doc.setFont(undefined, 'bold');
    doc.text('ADDRESS:', margin + 5, y);
    doc.setFont(undefined, 'normal');
    var addrLines = doc.splitTextToSize(clientData.address, contentW - 50);
    doc.text(addrLines, margin + 34, y);
    y += Math.max(addrLines.length * 5, 5) + 5;

    doc.setFont(undefined, 'bold');
    doc.text('DRIVER LICENCE:', margin + 5, y);
    doc.setFont(undefined, 'normal');
    doc.text(clientData.licence, margin + 52, y);
    y += 10;

    doc.setFont(undefined, 'bold');
    doc.text('SIGNATURE:', margin + 5, y);

    // Embed signature image
    if (clientData.signatureData) {
      try {
        doc.addImage(clientData.signatureData, 'PNG', margin + 40, y - 6, 60, 20);
      } catch (e) {}
    }

    y = boxY + 65;

    // Signed date
    doc.setFontSize(9);
    doc.setTextColor(100, 100, 100);
    doc.text('Signed electronically on ' + clientData.timestamp, margin, y);
    y += 8;

    // Footer
    doc.setDrawColor(20, 184, 166);
    doc.setLineWidth(0.5);
    doc.line(margin, y, w - margin, y);
    y += 6;
    doc.setFontSize(8);
    doc.setTextColor(120, 120, 120);
    doc.text('Clear My Debts Australia Pty Ltd | ACL 568532 | ABN/ACN 680 367 006', margin, y);
    y += 4;
    doc.text('P: 1300 998 168 | E: support@clearmydebts.com.au', margin, y);

    // Store for download
    ataPdfFilename = 'ATA-' + clientData.fullName.replace(/\s+/g, '-') + '.pdf';
    ataPdfBlob = doc.output('blob');

    return doc;
  }

  // Download button
  var downloadAtaBtn = document.getElementById('downloadAtaBtn');
  if (downloadAtaBtn) {
    downloadAtaBtn.addEventListener('click', function () {
      if (ataPdfBlob) {
        var url = URL.createObjectURL(ataPdfBlob);
        var a = document.createElement('a');
        a.href = url;
        a.download = ataPdfFilename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        track('ata_pdf_downloaded', {});
      }
    });
  }

  // =============================================
  //  STEP 9: ALL DONE
  // =============================================
  function showAllDone() {
    goToStep('alldone');
    track('onboarding_complete', {
      creditor_count: creditors.length,
      utm_source: utm.source,
      utm_campaign: utm.campaign
    });
  }

  // =============================================
  //  PAYMENT FLOW: Redirect to signing after Stripe
  // =============================================
  // When user clicks "Start my plan", we save data to window.name so it
  // persists across the Stripe redirect (same-tab navigations preserve it).
  // When Stripe redirects them back, we detect the saved data and
  // jump straight to the Service Agreement signing step.
  var paymentLinkEl = document.getElementById('paymentLink');
  if (paymentLinkEl) {
    paymentLinkEl.addEventListener('click', function () {
      var income = parseCurrencyInput(monthlyIncomeInput.value);
      var totalBills = 0;
      billInputs.forEach(function (input) {
        totalBills += parseCurrencyInput(input.value);
      });

      var formData = {
        creditors: creditors,
        income: income,
        totalBills: totalBills,
        firstName: firstNameInput.value.trim(),
        phone: phoneInput.value.trim(),
        email: emailInput.value.trim(),
        bills: {},
        cmd_return_to_sign: true
      };
      billInputs.forEach(function (input) {
        formData.bills[input.id] = parseCurrencyInput(input.value);
      });

      try {
        window.name = JSON.stringify(formData);
      } catch (e) {}

      // Let Stripe open — don't show agreement yet, wait for redirect back
    });
  }

  // =============================================
  //  REQUEST A CALLBACK FLOW
  // =============================================
  var callbackToggleBtn = document.getElementById('callbackToggleBtn');
  var callbackForm      = document.getElementById('callbackForm');
  var callbackSuccess   = document.getElementById('callbackSuccess');
  var callbackSubmitBtn = document.getElementById('callbackSubmitBtn');
  var callbackSubmitLbl = document.getElementById('callbackSubmitLabel');
  var cbNameInput       = document.getElementById('cbName');
  var cbPhoneInput      = document.getElementById('cbPhone');
  var cbTimeSelect      = document.getElementById('cbTime');

  // Toggle: show the inline form and pre-fill fields
  if (callbackToggleBtn) {
    callbackToggleBtn.addEventListener('click', function () {
      callbackToggleBtn.style.display = 'none';
      if (callbackForm) callbackForm.style.display = 'block';
      // Pre-fill from earlier steps
      if (cbNameInput && firstNameInput) cbNameInput.value = firstNameInput.value.trim();
      if (cbPhoneInput && phoneInput) {
        cbPhoneInput.value = phoneInput.value.trim();
        // If phone is empty, focus it so they can enter
        if (!cbPhoneInput.value) cbPhoneInput.focus();
      }
      track('callback_form_opened', {});
    });
  }

  // Submit callback request via Web3Forms
  if (callbackSubmitBtn) {
    callbackSubmitBtn.addEventListener('click', function () {
      var cbPhone = cbPhoneInput ? cbPhoneInput.value.trim() : '';
      if (!cbPhone) {
        cbPhoneInput.focus();
        return;
      }

      callbackSubmitBtn.disabled = true;
      callbackSubmitLbl.textContent = 'Sending…';

      // Gather debt snapshot for the email
      var tier = getCurrentTier();
      var totalDebt = 0;
      var creditorList = creditors.map(function (c) { return c.name + ': ' + formatCurrency(c.amount); });
      creditors.forEach(function (c) { totalDebt += c.amount; });

      var payload = {
        access_key: 'f8acfff0-024e-49b5-bd6c-9c66ac7ed627',
        subject: '📞 Callback Requested — ' + (cbNameInput ? cbNameInput.value : 'Customer'),
        from_name: 'Clear My Debts App',
        name: cbNameInput ? cbNameInput.value : '',
        phone: cbPhone,
        best_time_to_call: cbTimeSelect ? cbTimeSelect.value : 'Now',
        email: emailInput ? emailInput.value.trim() : '',
        total_debt: formatCurrency(totalDebt),
        creditors: creditorList.join(' | '),
        monthly_plan: tier ? formatCurrency(tier.amount) + '/mo' : 'N/A',
        monthly_income: monthlyIncomeInput ? formatCurrency(parseCurrencyInput(monthlyIncomeInput.value)) : '',
        type: 'Callback Request'
      };

      fetch('https://api.web3forms.com/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      })
      .then(function (r) { return r.json(); })
      .then(function (data) {
        if (data.success) {
          if (callbackForm) callbackForm.style.display = 'none';
          if (callbackSuccess) callbackSuccess.style.display = 'flex';
          track('callback_requested', { time: payload.best_time_to_call });
        } else {
          throw new Error('Submission failed');
        }
      })
      .catch(function () {
        callbackSubmitBtn.disabled = false;
        callbackSubmitLbl.textContent = 'Request my callback';
        alert('Something went wrong. Please call us directly on 1300 998 168.');
      });
    });
  }

  // =============================================
  //  SCHEDULE DIRECT DEBIT FLOW
  // =============================================
  var SCHEDULE_API = 'https://cmd-schedule-api.vercel.app/api/create-checkout';

  var scheduleBtn    = document.getElementById('scheduleBtn');
  var schedBackBtn   = document.getElementById('schedBackBtn');
  var schedStartDate = document.getElementById('schedStartDate');
  var schedConfirm   = document.getElementById('schedConfirm');
  var schedDateDisp  = document.getElementById('schedDateDisplay');
  var schedSubmitBtn = document.getElementById('schedSubmitBtn');
  var schedSubmitLbl = document.getElementById('schedSubmitLabel');
  var schedError     = document.getElementById('schedError');
  var schedAmount    = document.getElementById('schedMonthlyAmount');
  var schedQBtns     = document.querySelectorAll('.schedule-qbtn');

  // Helper: format a Date as YYYY-MM-DD
  function toISODate(d) {
    var y = d.getFullYear();
    var m = String(d.getMonth() + 1).padStart(2, '0');
    var dd = String(d.getDate()).padStart(2, '0');
    return y + '-' + m + '-' + dd;
  }

  // Helper: format a date string nicely for display
  function formatDisplayDate(isoStr) {
    var parts = isoStr.split('-');
    var d = new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2]));
    return d.toLocaleDateString('en-AU', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
  }

  // Set up the date picker constraints: min 3 days, max 60 days
  function initDatePicker() {
    var today = new Date();
    var minDate = new Date(today); minDate.setDate(today.getDate() + 3);
    var maxDate = new Date(today); maxDate.setDate(today.getDate() + 60);
    if (schedStartDate) {
      schedStartDate.min = toISODate(minDate);
      schedStartDate.max = toISODate(maxDate);
      schedStartDate.value = '';
    }
  }

  // Update confirm banner when a date is picked
  function onDateSelected(isoVal) {
    if (!isoVal) {
      schedConfirm.style.display = 'none';
      schedSubmitBtn.disabled = true;
      return;
    }
    schedDateDisp.textContent = formatDisplayDate(isoVal);
    schedConfirm.style.display = 'block';
    schedSubmitBtn.disabled = false;
    // Highlight the matching quick-pick
    schedQBtns.forEach(function (b) { b.classList.remove('active'); });
  }

  // Open schedule step
  if (scheduleBtn) {
    scheduleBtn.addEventListener('click', function () {
      // Populate the amount from the current tier
      if (schedAmount) {
        var amtEl = document.getElementById('payMonthlyAmount');
        schedAmount.textContent = amtEl ? amtEl.textContent : '';
      }
      initDatePicker();
      if (schedConfirm) schedConfirm.style.display = 'none';
      if (schedSubmitBtn) schedSubmitBtn.disabled = true;
      if (schedError) schedError.style.display = 'none';
      goToStep('schedule');
      track('schedule_step_viewed', {});
    });
  }

  // Back button on schedule step
  if (schedBackBtn) {
    schedBackBtn.addEventListener('click', function () {
      goToStep('payment');
    });
  }

  // Date input change
  if (schedStartDate) {
    schedStartDate.addEventListener('change', function () {
      onDateSelected(this.value);
    });
  }

  // Quick-pick buttons
  schedQBtns.forEach(function (btn) {
    btn.addEventListener('click', function () {
      var today = new Date();
      var target;
      var days = btn.getAttribute('data-days');
      var special = btn.getAttribute('data-special');
      if (days) {
        target = new Date(today);
        target.setDate(today.getDate() + parseInt(days));
      } else if (special === 'next-month-1') {
        target = new Date(today.getFullYear(), today.getMonth() + 1, 1);
      } else if (special === 'next-month-15') {
        target = new Date(today.getFullYear(), today.getMonth() + 1, 15);
        // If next month's 15th is less than 3 days away, go to month after
        var minD = new Date(today); minD.setDate(today.getDate() + 3);
        if (target < minD) target = new Date(today.getFullYear(), today.getMonth() + 2, 15);
      }
      if (target) {
        var iso = toISODate(target);
        schedStartDate.value = iso;
        onDateSelected(iso);
        // Mark active
        schedQBtns.forEach(function (b) { b.classList.remove('active'); });
        btn.classList.add('active');
      }
    });
  });

  // Submit: call Vercel API and redirect to Stripe Checkout
  if (schedSubmitBtn) {
    schedSubmitBtn.addEventListener('click', function () {
      var isoDate = schedStartDate ? schedStartDate.value : '';
      if (!isoDate) return;

      var tier = getCurrentTier();
      if (!tier) return;

      // Save form data to window.name (same as pay-now flow, for post-Stripe agreement)
      var formData = {
        creditors: creditors,
        income: parseCurrencyInput(monthlyIncomeInput.value),
        totalBills: 0,
        fullName: firstNameInput.value.trim(),
        phone: phoneInput.value.trim(),
        email: emailInput.value.trim(),
        bills: {},
        cmd_return_to_sign: true
      };
      billInputs.forEach(function (input) {
        formData.totalBills += parseCurrencyInput(input.value);
        formData.bills[input.id] = parseCurrencyInput(input.value);
      });
      try {
        window.name = JSON.stringify(formData);
      } catch (e) {}

      // Show loading state
      schedSubmitBtn.disabled = true;
      schedSubmitLbl.textContent = 'Setting up…';
      if (schedError) schedError.style.display = 'none';

      // Call our Vercel API
      fetch(SCHEDULE_API, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          amount: tier.amount,
          email: formData.email,
          name: formData.fullName,
          phone: formData.phone,
          startDate: isoDate
        })
      })
      .then(function (r) { return r.json(); })
      .then(function (data) {
        if (data.url) {
          track('schedule_checkout_redirect', { amount: tier.amount, start_date: isoDate });
          window.location.href = data.url;
        } else {
          throw new Error(data.error || 'Could not create checkout session');
        }
      })
      .catch(function (err) {
        schedSubmitBtn.disabled = false;
        schedSubmitLbl.textContent = 'Set up my direct debit';
        if (schedError) {
          schedError.textContent = 'Something went wrong: ' + err.message + '. Please call 1300 998 168.';
          schedError.style.display = 'block';
        }
        track('schedule_checkout_error', { error: err.message });
      });
    });
  }

  // Helper to get the current pricing tier
  function getCurrentTier() {
    var income = parseCurrencyInput(monthlyIncomeInput ? monthlyIncomeInput.value : '0');
    var totalBills = 0;
    billInputs.forEach(function (input) { totalBills += parseCurrencyInput(input.value); });
    var surplus = Math.max(0, income - totalBills);
    for (var i = 0; i < PAYMENT_TIERS.length; i++) {
      if (surplus <= PAYMENT_TIERS[i].maxSurplus) return PAYMENT_TIERS[i];
    }
    return PAYMENT_TIERS[PAYMENT_TIERS.length - 1];
  }

  // Check if returning from Stripe (fallback path when ?payment param is absent).
  // Reads window.name, which persists across same-tab navigations including the
  // Stripe redirect.
  function checkStripeReturn() {
    try {
      if (!window.name) return false;
      var data = JSON.parse(window.name);
      if (data && data.cmd_return_to_sign) {
        // Restore form data
        creditors = data.creditors || [];
        renderCreditors();
        monthlyIncomeInput.value = data.income ? data.income.toLocaleString('en-AU') : '';
        firstNameInput.value = data.fullName || data.firstName || '';
        phoneInput.value = data.phone || '';
        emailInput.value = data.email || '';

        if (data.bills) {
          Object.keys(data.bills).forEach(function (id) {
            var el = document.getElementById(id);
            if (el && data.bills[id]) el.value = data.bills[id].toLocaleString('en-AU');
          });
        }

        // Clear so it doesn't trigger again on subsequent reloads
        window.name = '';

        // Go straight to signing
        showAgreement();
        return true;
      }
    } catch (e) {}
    return false;
  }

  // =============================================
  //  INIT
  // =============================================
  if (!checkStripeReturn()) {
    updateProgress(1);
  }

})();
