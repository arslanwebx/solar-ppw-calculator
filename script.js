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
  if (!size || size <= 0) return clearResults(showErrors ? 'Enter a system size greater than zero.' : 'Add a system size and either Gross PPW or Base PPW to see your proposal.');
  const adders = custom + battery;
  const adjustment = adders / (size * 1000);
  let finalGross = gross;
  let finalBase = base;
  let calculatedLabel = '';
  if (source === 'base' && validNumber(base)) {
    finalGross = base + adjustment;
    calculatedLabel = 'Calculated Gross PPW';
  } else if (source === 'gross' && validNumber(gross)) {
    finalBase = gross - adjustment;
    calculatedLabel = 'Calculated Base PPW';
  } else if (validNumber(gross) && !validNumber(base)) {
    finalBase = gross - adjustment;
    calculatedLabel = 'Calculated Base PPW';
  } else if (validNumber(base) && !validNumber(gross)) {
    finalGross = base + adjustment;
    calculatedLabel = 'Calculated Gross PPW';
  } else if (!validNumber(gross) && !validNumber(base)) {
    return clearResults('Enter either Gross PPW or Base PPW to see your proposal.');
  }
  if (!validNumber(finalGross) || !validNumber(finalBase) || finalBase < 0) return clearResults('The adders are greater than the selected Gross PPW. Increase Gross PPW or use Base PPW.');
  render({ size, gross: finalGross, derived: source === 'base' ? finalGross : finalBase, calculatedLabel, custom, battery });
}

function clearResults(message) {
  validation.textContent = message.includes('Add a') ? '' : message;
  breakdown.innerHTML = `<p class="empty-state">${message}</p>`;
  copyButton.disabled = true;
  breakdownText = '';
}

function render({ size, gross, derived, calculatedLabel, custom, battery }) {
  const name = fields.customerName.value.trim() || 'Customer';
  const program = fields.lenderProgram.value;
  const payment = number(fields.monthlyPayment);
  const contract = gross * size * 1000;
  const adderLines = [];
  if (custom > 0) adderLines.push(`Custom Adder: ${currency(custom)}`);
  if (battery > 0) adderLines.push(`${fields.batteryName.value.trim() || 'Battery'}: ${currency(battery)}`);
  breakdownText = `${name}\n${ppw(gross)} PPW\n${size} kW\n\n${program}\n${currency(contract)}\n${validNumber(payment) ? currency(payment) : ''}${adderLines.length ? `\n\nAdders:\n${adderLines.join('\n')}` : ''}`.trim();
  const safe = (value) => value.replace(/[&<>"']/g, (char) => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' })[char]);
  const lines = breakdownText.split('\n').map(safe);
  breakdown.innerHTML = `<div class="calculated-ppw"><span>${calculatedLabel}</span><strong>${ppw(derived)} PPW</strong></div><div class="breakdown-content"><div class="customer">${lines[0]}</div><div class="ppw">${lines[1]}</div><div>${lines[2]}</div><br><div>${lines[4]}</div><div class="amount">${lines[5]}</div><div>${lines[6] || '&nbsp;'}</div>${adderLines.length ? `<div class="adders">${lines.slice(8).join('<br>')}</div>` : ''}</div>`;
  copyButton.disabled = false;
}

['grossPpw', 'basePpw'].forEach((id) => fields[id].addEventListener('input', () => { activePpw = id === 'grossPpw' ? 'gross' : 'base'; update(activePpw); }));
['systemSize', 'customAdder', 'batteryAmount', 'batteryName', 'customerName', 'lenderProgram', 'monthlyPayment'].forEach((id) => fields[id].addEventListener('input', () => update(activePpw)));
form.addEventListener('submit', (event) => { event.preventDefault(); update(activePpw, true); });
form.addEventListener('reset', () => setTimeout(() => { activePpw = null; copyStatus.textContent = ''; clearResults('Add a system size and either Gross PPW or Base PPW to see your proposal.'); }, 0));
copyButton.addEventListener('click', async () => { try { await navigator.clipboard.writeText(breakdownText); copyStatus.textContent = 'Breakdown copied to clipboard.'; } catch { copyStatus.textContent = 'Copy failed. Please select and copy the breakdown manually.'; } });
