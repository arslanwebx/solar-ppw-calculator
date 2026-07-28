const $ = (id) => document.getElementById(id);
const fields = ['customerName', 'lenderProgram', 'systemSize', 'grossPpw', 'basePpw', 'customAdder', 'batteryName', 'batteryAmount', 'monthlyPayment'].reduce((acc, id) => ({ ...acc, [id]: $(id) }), {});
const form = $('calculator-form');
const validation = $('validation');
const breakdown = $('breakdown');
const copyButton = $('copyButton');
const copyStatus = $('copyStatus');
let activePpw = null;
let breakdownText = '';

const number = (input) => input.value.trim() === '' ? null : Number(input.value);
const currency = (value) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 2 }).format(value);
const ppw = (value) => Number(value).toFixed(2);
const validNumber = (value) => Number.isFinite(value) && value >= 0;

function update(source = activePpw, showErrors = false) {
  const size = number(fields.systemSize);
  const gross = number(fields.grossPpw);
  const base = number(fields.basePpw);
  const custom = number(fields.customAdder) ?? 0;
  const battery = number(fields.batteryAmount) ?? 0;
  const invalid = [size, gross, base, custom, battery].some((value) => value !== null && !validNumber(value));
  validation.textContent = '';
  copyStatus.textContent = '';
  if (invalid) return clearResults('Use zero or a positive number for all amount fields.');
  if (!size || size <= 0) {
    if (showErrors) validation.textContent = 'Enter a system size greater than zero to calculate PPW and the contract total.';
    return render({ size, gross, base, custom, battery });
  }
  const adders = custom + battery;
  const adjustment = adders / (size * 1000);
  let finalGross = gross;
  let finalBase = base;
  let derived = null;
  let calculatedLabel = '';
  if (source === 'base' && validNumber(base)) {
    finalGross = base + adjustment;
    derived = finalGross;
    calculatedLabel = 'Calculated Gross PPW';
  } else if (source === 'gross' && validNumber(gross)) {
    finalBase = gross - adjustment;
    derived = finalBase;
    calculatedLabel = 'Calculated Base PPW';
  } else if (validNumber(gross) && !validNumber(base)) {
    finalBase = gross - adjustment;
    derived = finalBase;
    calculatedLabel = 'Calculated Base PPW';
  } else if (validNumber(base) && !validNumber(gross)) {
    finalGross = base + adjustment;
    derived = finalGross;
    calculatedLabel = 'Calculated Gross PPW';
  } else if (!validNumber(gross) && !validNumber(base)) {
    if (showErrors) validation.textContent = 'Enter either Gross PPW or Base PPW to calculate the proposal total.';
    return render({ size, gross, base, custom, battery });
  }
  if (!validNumber(finalGross) || !validNumber(finalBase) || finalBase < 0) return clearResults('The adders are greater than the selected Gross PPW. Increase Gross PPW or use Base PPW.');
  render({ size, gross: finalGross, base: finalBase, derived, calculatedLabel, custom, battery });
}

function clearResults(message) {
  validation.textContent = message.includes('Add a') ? '' : message;
  breakdown.innerHTML = `<p class="empty-state">${message}</p>`;
  copyButton.disabled = true;
  breakdownText = '';
}

function render({ size, gross, base, derived = null, calculatedLabel = '', custom, battery }) {
  const name = fields.customerName.value.trim();
  const program = fields.lenderProgram.value;
  const payment = number(fields.monthlyPayment);
  const hasSize = validNumber(size) && size > 0;
  const hasGross = validNumber(gross);
  const hasBase = validNumber(base);
  const hasPayment = validNumber(payment);
  const hasDetails = Boolean(name) || hasSize || hasGross || hasBase || custom > 0 || battery > 0 || hasPayment;
  if (!hasDetails) {
    breakdown.innerHTML = '<p class="empty-state">Start entering proposal details to build your breakdown.</p>';
    copyButton.disabled = true;
    breakdownText = '';
    return;
  }
  const contract = hasSize && hasGross ? gross * size * 1000 : null;
  const adderLines = [];
  if (custom > 0) adderLines.push(`Custom Adder: ${currency(custom)}`);
  if (battery > 0) adderLines.push(`${fields.batteryName.value.trim() || 'Battery'}: ${currency(battery)}`);
  const identityLines = [name, hasBase ? `${ppw(base)} Base PPW` : hasGross ? `${ppw(gross)} Gross PPW` : '', hasSize ? `${size} kW` : ''].filter(Boolean);
  const financeLines = [program, contract === null ? '' : currency(contract), hasPayment ? currency(payment) : ''].filter(Boolean);
  breakdownText = [identityLines.join('\n'), financeLines.join('\n'), adderLines.length ? `Adders:\n${adderLines.join('\n')}` : ''].filter(Boolean).join('\n\n');
  const safe = (value) => value.replace(/[&<>"']/g, (char) => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' })[char]);
  const calculated = derived === null ? '' : `<div class="calculated-ppw"><span>${safe(calculatedLabel)}</span><strong>${ppw(derived)} PPW</strong></div>`;
  const identity = `${name ? `<div class="customer">${safe(name)}</div>` : ''}${hasBase ? `<div class="ppw">${ppw(base)} Base PPW</div>` : hasGross ? `<div class="ppw">${ppw(gross)} Gross PPW</div>` : ''}${hasSize ? `<div>${safe(String(size))} kW</div>` : ''}`;
  const finance = `<div class="finance">${safe(program)}${contract === null ? '' : `<div class="amount">${currency(contract)}</div>`}${hasPayment ? `<div>${currency(payment)}</div>` : ''}</div>`;
  const adders = adderLines.length ? `<div class="adders">Adders:<br>${adderLines.map(safe).join('<br>')}</div>` : '';
  breakdown.innerHTML = `${calculated}<div class="breakdown-content">${identity}${finance}${adders}</div>`;
  copyButton.disabled = false;
}

['grossPpw', 'basePpw'].forEach((id) => fields[id].addEventListener('input', () => { activePpw = id === 'grossPpw' ? 'gross' : 'base'; update(activePpw); }));
['systemSize', 'customAdder', 'batteryAmount', 'batteryName', 'customerName', 'lenderProgram', 'monthlyPayment'].forEach((id) => fields[id].addEventListener('input', () => update(activePpw)));
form.addEventListener('submit', (event) => { event.preventDefault(); update(activePpw, true); });
form.addEventListener('reset', () => setTimeout(() => { activePpw = null; copyStatus.textContent = ''; clearResults('Add a system size and either Gross PPW or Base PPW to see your proposal.'); }, 0));
copyButton.addEventListener('click', async () => { try { await navigator.clipboard.writeText(breakdownText); copyStatus.textContent = 'Breakdown copied to clipboard.'; } catch { copyStatus.textContent = 'Copy failed. Please select and copy the breakdown manually.'; } });
